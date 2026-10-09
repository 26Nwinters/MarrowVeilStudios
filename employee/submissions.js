(() => {
  const configReady = Boolean(
    window.MARROWVEIL_SUPABASE_URL &&
    window.MARROWVEIL_SUPABASE_PUBLISHABLE_KEY &&
    window.supabase
  );
  const form = document.getElementById("submission-form");
  const list = document.getElementById("submission-list");
  if (!form || !list || !configReady) return;

  const client = window.supabase.createClient(
    window.MARROWVEIL_SUPABASE_URL,
    window.MARROWVEIL_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  );
  const MAX_FILE_BYTES = 25 * 1024 * 1024;
  let currentUser = null;
  let isAdmin = false;
  let profileNames = new Map();

  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  const statusLabels = {
    pending: "Pending review",
    approved: "Approved",
    revision_requested: "Revision requested"
  };

  function showListMessage(title, detail) {
    list.innerHTML = '<div class="empty-state"><h3></h3><p></p></div>';
    list.querySelector("h3").textContent = title;
    list.querySelector("p").textContent = detail;
  }

  function formatDate(value) {
    if (!value) return "Date unavailable";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Date unavailable" :
      date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  }

  async function loadSubmissions() {
    const { data, error } = await client.from("submissions")
      .select("id, user_id, file_name, storage_path, project, notes, status, feedback, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      showListMessage("Submissions couldn't load", "Please refresh the page. If the problem continues, contact the studio administrator.");
      return;
    }
    const submissions = data || [];
    if (!submissions.length) {
      showListMessage("No submissions yet", isAdmin
        ? "Employee handoffs will appear here when the team uploads work."
        : "Your uploaded work and review feedback will appear here.");
      return;
    }

    list.className = "submission-list";
    list.innerHTML = submissions.map(item => {
      const status = statusLabels[item.status] || "Status unavailable";
      const owner = profileNames.get(item.user_id) || (item.user_id === currentUser.id ? "You" : "Team member");
      const project = item.project ? '<p class="submission-meta">Project: ' + escapeHtml(item.project) + '</p>' : "";
      const notes = item.notes ? '<p class="submission-notes">' + escapeHtml(item.notes) + '</p>' : "";
      const feedback = item.feedback ? '<div class="submission-feedback"><strong>Reviewer feedback</strong><p>' + escapeHtml(item.feedback) + '</p></div>' : "";
      const deleteControl = isAdmin
        ? '<button type="button" class="button button-danger submission-delete" data-submission-id="' + escapeHtml(item.id) + '" data-submission-name="' + escapeHtml(item.file_name || "this submission") + '">Delete submission</button><p class="form-message delete-message" role="status" aria-live="polite"></p>'
        : "";
      const review = isAdmin
        ? '<form class="review-form" data-submission-id="' + escapeHtml(item.id) + '">' +
          '<label>Status<select name="status">' +
          '<option value="pending"' + (item.status === "pending" ? " selected" : "") + '>Pending review</option>' +
          '<option value="approved"' + (item.status === "approved" ? " selected" : "") + '>Approved</option>' +
          '<option value="revision_requested"' + (item.status === "revision_requested" ? " selected" : "") + '>Request revisions</option>' +
          '</select></label><label>Feedback<textarea name="feedback" rows="2" maxlength="3000" placeholder="Notes for the employee">' + escapeHtml(item.feedback || "") + '</textarea></label>' +
          '<button class="button button-ghost" type="submit">Save review</button><p class="form-message review-message" role="status" aria-live="polite"></p></form>'
        : "";
      return '<article class="submission-card" data-submission-card="' + escapeHtml(item.id) + '">' +
        '<div class="submission-card-top"><div><h3>' + escapeHtml(item.file_name || "Untitled file") + '</h3>' +
        '<p class="submission-meta">' + escapeHtml(formatDate(item.created_at)) + (isAdmin ? ' · Submitted by ' + escapeHtml(owner) : "") + '</p></div>' +
        '<span class="submission-status status-' + escapeHtml(item.status) + '">' + escapeHtml(status) + '</span></div>' +
        project + notes +
        '<button type="button" class="text-link download-submission" data-submission-id="' + escapeHtml(item.id) + '">Open submitted file ↗</button>' +
        feedback + review + deleteControl + '</article>';
    }).join("");

    list.querySelectorAll(".submission-delete").forEach(button => {
      button.addEventListener("click", async () => {
        if (!isAdmin) return;
        const name = button.dataset.submissionName || "this submission";
        if (!window.confirm('Permanently delete "' + name + '" and its uploaded file? This cannot be undone.')) return;
        const card = button.closest(".submission-card");
        const message = card.querySelector(".delete-message");
        button.disabled = true;
        button.textContent = "Deleting…";

        const item = submissions.find(row => row.id === button.dataset.submissionId);
        if (!item) {
          message.textContent = "Submission could not be found. Refresh and try again.";
          button.disabled = false;
          button.textContent = "Delete submission";
          return;
        }

        const { error: fileError } = await client.storage.from("employee-submissions").remove([item.storage_path]);
        if (fileError) {
          message.textContent = "The private file couldn't be removed. The submission record was kept so the administrator can fix permissions and retry.";
          button.disabled = false;
          button.textContent = "Delete submission";
          return;
        }

        const { error: recordError } = await client.from("submissions").delete().eq("id", item.id);
        if (recordError) {
          console.error("Submission record deletion failed after file removal:", recordError);
          message.textContent = "The file was removed, but its submission record couldn't be deleted. Contact the administrator to reconcile this submission.";
          button.disabled = false;
          button.textContent = "Delete submission";
          return;
        }
        await loadSubmissions();
          return;
        }
        await loadSubmissions();
      });
    });

    list.querySelectorAll(".download-submission").forEach(button => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        const originalText = button.textContent;
        button.textContent = "Preparing secure link…";
        const item = submissions.find(row => row.id === button.dataset.submissionId);
        if (!item) {
          button.textContent = "File unavailable";
          return;
        }
        const { data: signed, error: signedError } = await client.storage
          .from("employee-submissions").createSignedUrl(item.storage_path, 60);
        button.disabled = false;
        button.textContent = originalText;
        if (signedError || !signed?.signedUrl) {
          const card = button.closest(".submission-card");
          const note = document.createElement("p");
          note.className = "form-message";
          note.textContent = "The secure file link couldn't be created. Please try again.";
          button.insertAdjacentElement("afterend", note);
          return;
        }
        window.open(signed.signedUrl, "_blank", "noopener,noreferrer");
      });
    });

    list.querySelectorAll(".review-form").forEach(reviewForm => {
      reviewForm.addEventListener("submit", async event => {
        event.preventDefault();
        if (!isAdmin) return;
        const button = reviewForm.querySelector('button[type="submit"]');
        const message = reviewForm.querySelector(".review-message");
        const values = new FormData(reviewForm);
        button.disabled = true;
        button.textContent = "Saving…";
        message.textContent = "";
        const { error: updateError } = await client.from("submissions").update({
          status: String(values.get("status") || "pending"),
          feedback: String(values.get("feedback") || "").trim() || null
        }).eq("id", reviewForm.dataset.submissionId);
        button.disabled = false;
        button.textContent = "Save review";
        if (updateError) {
          message.textContent = "Review couldn't be saved. Please try again.";
          return;
        }
        message.textContent = "Review saved.";
        await loadSubmissions();
      });
    });
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const message = document.getElementById("submission-form-message");
    const button = document.getElementById("submission-button");
    const fileInput = document.getElementById("submission-file");
    const file = fileInput.files && fileInput.files[0];
    if (!currentUser) {
      message.textContent = "Your session has expired. Please sign in again.";
      return;
    }
    if (!file) {
      message.textContent = "Choose a file to upload.";
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      message.textContent = "That file is larger than 25 MB. Please choose a smaller file.";
      return;
    }
    if (file.size === 0) {
      message.textContent = "That file is empty. Please choose a different file.";
      return;
    }

    const values = new FormData(form);
    const project = String(values.get("project") || "").trim();
    const notes = String(values.get("notes") || "").trim();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-160) || "submission";
    const storagePath = currentUser.id + "/" + Date.now() + "-" + safeName;

    button.disabled = true;
    button.textContent = "Uploading…";
    message.textContent = "";

    const { error: uploadError } = await client.storage
      .from("employee-submissions")
      .upload(storagePath, file, { upsert: false, contentType: file.type || "application/octet-stream" });

    if (uploadError) {
      message.textContent = "Upload failed. Check the file size and try again. If it continues, contact the administrator.";
      button.disabled = false;
      button.textContent = "Upload submission";
      return;
    }

    const { error: insertError } = await client.from("submissions").insert({
      user_id: currentUser.id,
      file_name: file.name,
      storage_path: storagePath,
      project: project || null,
      notes: notes || null,
      status: "pending"
    });

    if (insertError) {
      const { error: cleanupError } = await client.storage.from("employee-submissions").remove([storagePath]);
      if (cleanupError) {
        console.error("Uploaded file cleanup failed after record insert error:", cleanupError);
        message.textContent = "The submission record couldn't be saved and the uploaded file couldn't be cleaned up. Contact the administrator and share this filename: " + file.name;
      } else {
        message.textContent = "The submission record couldn't be saved. The uploaded file was removed; please try again.";
      }
      button.disabled = false;
      button.textContent = "Upload submission";
      return;
    }

    form.reset();
    message.textContent = "Submission uploaded and sent for review.";
    button.disabled = false;
    button.textContent = "Upload submission";
    await loadSubmissions();
  });

  async function init() {
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError || !sessionData.session) return;
    currentUser = sessionData.session.user;

    const { data: profile, error: profileError } = await client.from("profiles")
      .select("id, role").eq("id", currentUser.id).maybeSingle();
    if (profileError || !profile) {
      showListMessage("Unable to verify access", "Please sign in again or contact the studio administrator.");
      form.hidden = true;
      return;
    }
    isAdmin = profile.role === "admin";

    if (isAdmin) {
      const { data: profiles, error: profilesError } = await client.from("profiles")
        .select("id, display_name");
      if (!profilesError) {
        profileNames = new Map((profiles || []).map(person => [person.id, person.display_name || "Team member"]));
      }
    } else {
      profileNames.set(currentUser.id, "You");
    }

    await loadSubmissions();
  }

  init().catch(() => showListMessage("Submissions couldn't load", "An unexpected error occurred. Please refresh and try again."));
})();
