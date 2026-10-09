(() => {
  const configReady = Boolean(
    window.MARROWVEIL_SUPABASE_URL &&
    window.MARROWVEIL_SUPABASE_PUBLISHABLE_KEY &&
    window.supabase
  );
  if (!configReady) {
    const msg = document.getElementById("login-message") || document.getElementById("dashboard-message");
    if (msg) msg.textContent = "Portal setup is incomplete. Please contact the studio administrator.";
    return;
  }

  const client = window.supabase.createClient(
    window.MARROWVEIL_SUPABASE_URL,
    window.MARROWVEIL_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  );
  const isDashboard = window.location.pathname.endsWith("/dashboard.html");

  async function goToDashboardIfSignedIn() {
    const { data, error } = await client.auth.getSession();
    if (error) return;
    if (data.session && !isDashboard) window.location.replace("dashboard.html");
    if (!data.session && isDashboard) window.location.replace("index.html");
  }

  if (!isDashboard) {
    const form = document.getElementById("login-form");
    if (!form) return;
    const button = document.getElementById("login-button");
    const message = document.getElementById("login-message");
    form.addEventListener("submit", async event => {
      event.preventDefault();
      message.textContent = "";
      button.disabled = true;
      button.textContent = "Signing in…";
      const email = form.elements.email.value.trim();
      const password = form.elements.password.value;
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        message.textContent = "Sign-in failed. Check your email and password, then try again.";
        button.disabled = false;
        button.textContent = "Sign in";
        return;
      }
      window.location.replace("dashboard.html");
    });
    goToDashboardIfSignedIn();
    return;
  }

  const dashboardMessage = document.getElementById("dashboard-message");
  const taskList = document.getElementById("task-list");
  let currentUser = null;
  let isAdmin = false;
  let employeeProfiles = [];

  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  function showTaskError(message) {
    taskList.className = "empty-state";
    taskList.innerHTML = '<span class="empty-mark">!</span><h3>Tasks could not load</h3><p></p>';
    taskList.querySelector("p").textContent = message;
  }

  async function loadWorkspace() {
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError || !sessionData.session) {
      window.location.replace("index.html");
      return;
    }
    currentUser = sessionData.session.user;

    const { data: profile, error: profileError } = await client
      .from("profiles").select("id, display_name, role").eq("id", currentUser.id).maybeSingle();
    if (profileError) {
      showTaskError("We couldn't verify your studio role. Please contact the administrator.");
      return;
    }
    isAdmin = profile?.role === "admin";
    const welcome = document.getElementById("welcome-title");
    const displayName = profile?.display_name || currentUser.user_metadata?.display_name;
    if (welcome) welcome.textContent = displayName ? `Welcome back, ${displayName}.` : "Welcome back.";
    document.getElementById("role-chip").textContent = isAdmin ? "STUDIO ADMIN" : "TEAM WORKSPACE";
    document.getElementById("task-heading").textContent = isAdmin ? "Studio task board" : "My checklist";
    document.getElementById("open-label").textContent = isAdmin ? "Open tasks" : "Open tasks";
    document.getElementById("open-caption").textContent = isAdmin ? "Across the studio" : "Assigned or shared with you";
    document.getElementById("complete-caption").textContent = isAdmin ? "Tasks marked complete" : "Tasks you've finished";

    if (isAdmin) {
      document.getElementById("create-task-form").hidden = false;
      const { data: profiles, error: profilesError } = await client
        .from("profiles").select("id, display_name, role").eq("role", "employee").order("display_name");
      if (profilesError) {
        dashboardMessage.textContent = "Task creation is available, but the employee list could not load.";
      } else {
        employeeProfiles = profiles || [];
        const select = document.getElementById("task-assignee");
        employeeProfiles.forEach(person => {
          const option = document.createElement("option");
          option.value = person.id;
          option.textContent = person.display_name || "Employee";
          select.appendChild(option);
        });
      }
    }
    await loadTasks();
    await loadSubmissionCount();
  }

  async function loadTasks() {
    const { data: tasks, error: tasksError } = await client
      .from("tasks")
      .select("id, title, description, project, assigned_to, due_date, created_at")
      .order("created_at", { ascending: false });
    if (tasksError) {
      showTaskError("The task list couldn't be loaded. Check the Supabase task-table permissions.");
      return;
    }

    const visibleTasks = tasks || [];
    const { data: progressRows, error: progressError } = await client
      .from("task_progress").select("task_id, user_id, status");
    if (progressError) {
      showTaskError("Tasks loaded, but progress could not be read. Check task progress permissions.");
      return;
    }
    const progressByTask = new Map((progressRows || []).map(row => [
      row.task_id + ":" + row.user_id, row.status
    ]));
    const employeeById = new Map(employeeProfiles.map(person => [person.id, person.display_name || "Employee"]));
    const statusForCount = task => {
      const progressUser = isAdmin ? (task.assigned_to || currentUser.id) : currentUser.id;
      return progressByTask.get(task.id + ":" + progressUser) || "todo";
    };
    const openCount = visibleTasks.filter(task => statusForCount(task) !== "completed").length;
    const completeCount = visibleTasks.length - openCount;
    document.getElementById("open-count").textContent = String(openCount);
    document.getElementById("complete-count").textContent = String(completeCount);

    if (!visibleTasks.length) {
      taskList.className = "empty-state";
      taskList.innerHTML = '<span class="empty-mark">☷</span><h3>No tasks yet</h3><p>' +
        (isAdmin ? "Create the studio’s first task using the form above." : "When work is assigned to you, it will appear here.") + "</p>";
      return;
    }

    taskList.className = "task-list";
    taskList.innerHTML = visibleTasks.map(task => {
      const status = progressByTask.get(task.id + ":" + currentUser.id) || "todo";
      const statusLabels = { todo: "To do", in_progress: "In progress", completed: "Completed" };
      const due = task.due_date ? new Date(task.due_date + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "No due date";
      const project = task.project ? '<span class="task-project">' + escapeHtml(task.project) + "</span>" : "";
      const description = task.description ? '<p class="task-description">' + escapeHtml(task.description) + "</p>" : "";
      const assignedName = task.assigned_to ? (employeeById.get(task.assigned_to) || (task.assigned_to === currentUser.id ? (profileNameFallback()) : "Assigned employee")) : "Shared / unassigned";
      const assignment = isAdmin ? '<p class="task-meta">Assigned to: ' + escapeHtml(assignedName) + "</p>" : "";
      const adminStatus = isAdmin && task.assigned_to
        ? '<p class="task-meta">Assignee status: ' + escapeHtml(progressByTask.get(task.id + ":" + task.assigned_to) || "todo").replace("_", " ") + "</p>" : "";
      const controls = task.assigned_to === currentUser.id || (!task.assigned_to && !isAdmin)
        ? '<label class="status-control">Your progress<select class="task-status" data-task-id="' + escapeHtml(task.id) + '">' +
          '<option value="todo"' + (status === "todo" ? " selected" : "") + '>To do</option>' +
          '<option value="in_progress"' + (status === "in_progress" ? " selected" : "") + '>In progress</option>' +
          '<option value="completed"' + (status === "completed" ? " selected" : "") + '>Completed</option></select></label>'
        : (isAdmin && task.assigned_to === currentUser.id ? "" : "");
      return '<article class="task-card"><div class="task-card-top"><h3>' + escapeHtml(task.title) + "</h3>" + project + "</div>" +
        description + '<p class="task-meta">Due: ' + escapeHtml(due) + "</p>" + assignment + adminStatus +
        (controls || (!isAdmin ? "" : "")) + "</article>";
    }).join("");

    taskList.querySelectorAll(".task-status").forEach(select => {
      select.addEventListener("change", async () => {
        select.disabled = true;
        dashboardMessage.textContent = "";
        const { error } = await client.from("task_progress").upsert({
          task_id: select.dataset.taskId,
          user_id: currentUser.id,
          status: select.value,
          updated_at: new Date().toISOString()
        }, { onConflict: "task_id,user_id" });
        if (error) {
          dashboardMessage.textContent = "Couldn't save that progress update. Please try again.";
          await loadTasks();
        } else {
          dashboardMessage.textContent = "Task progress saved.";
          await loadTasks();
        }
      });
    });
  }

  function profileNameFallback() {
    return currentUser?.user_metadata?.display_name || currentUser?.email || "You";
  }

  async function loadSubmissionCount() {
    const { count, error } = await client.from("submissions")
      .select("id", { count: "exact", head: true });
    document.getElementById("submission-count").textContent = error ? "—" : String(count || 0);
  }

  const taskForm = document.getElementById("create-task-form");
  taskForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!isAdmin) return;
    const button = document.getElementById("create-task-button");
    const message = document.getElementById("task-form-message");
    const formData = new FormData(taskForm);
    const title = String(formData.get("title") || "").trim();
    if (!title) {
      message.textContent = "Please enter a task title.";
      return;
    }
    button.disabled = true;
    button.textContent = "Creating…";
    message.textContent = "";
    const assignedTo = String(formData.get("assigned_to") || "") || null;
    const { error } = await client.from("tasks").insert({
      title,
      description: String(formData.get("description") || "").trim() || null,
      project: String(formData.get("project") || "").trim() || null,
      due_date: String(formData.get("due_date") || "") || null,
      assigned_to: assignedTo,
      created_by: currentUser.id
    });
    button.disabled = false;
    button.textContent = "Create task";
    if (error) {
      message.textContent = "Task wasn't created. Check the task permissions and try again.";
      return;
    }
    taskForm.reset();
    message.textContent = "Task created.";
    await loadTasks();
  });

  client.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) window.location.replace("index.html");
  });
  const signout = document.getElementById("signout-button");
  if (signout) signout.addEventListener("click", async () => {
    signout.disabled = true;
    const { error } = await client.auth.signOut();
    if (error) {
      dashboardMessage.textContent = "Unable to sign out. Please try again.";
      signout.disabled = false;
      return;
    }
    window.location.replace("index.html");
  });

  loadWorkspace().catch(() => showTaskError("An unexpected error occurred while loading the workspace."));
})();