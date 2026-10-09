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
    if (!error && data.session && !isDashboard) window.location.replace("dashboard.html");
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
      const email = form.email.value.trim();
      const password = form.password.value;
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
  } else {
    goToDashboardIfSignedIn();
    client.auth.onAuthStateChange((_event, session) => {
      if (!session) window.location.replace("index.html");
    });
    const signout = document.getElementById("signout-button");
    if (signout) signout.addEventListener("click", async () => {
      signout.disabled = true;
      const { error } = await client.auth.signOut();
      if (error) {
        const message = document.getElementById("dashboard-message");
        if (message) message.textContent = "Unable to sign out. Please try again.";
        signout.disabled = false;
        return;
      }
      window.location.replace("index.html");
    });
    const welcome = document.getElementById("welcome-title");
    client.auth.getUser().then(({ data }) => {
      if (welcome && data.user) {
        const name = data.user.user_metadata?.display_name;
        welcome.textContent = name ? `Welcome back, ${name}.` : "Welcome back.";
      }
    });
  }
})();