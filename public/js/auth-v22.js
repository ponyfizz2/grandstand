/**
 * BUILD: github-pages-auth-v22
 *
 * Grandstand — Auth Module
 * Handles Google OAuth via Supabase, user profiles, onboarding,
 * and settings panel population.
 */

(function () {
  "use strict";

  const cfg = window.GRANDSTAND_CONFIG;

  // Supabase client — initialised once
  const supabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  // Expose globally so chat.js and admin.js can use it
  window.gs = window.gs || {};
  window.gs.supabase = supabase;
	  window.gs.auth = {
	    session: null,
	    profile: null,
	    isAdmin: false,
	    isGuest: false,
	  };
  window.gs.authBuild = "github-pages-auth-v22";

  // ── DOM refs ──────────────────────────────────────────────────
  const authModal = document.getElementById("auth-modal");
  const onboardingModal = document.getElementById("onboarding-modal");
  const authHeaderArea = document.getElementById("auth-header-area");
  const adminLink = document.getElementById("admin-link");
  const settingsAccountArea = document.getElementById("settings-account-area");
  const settingsPrefGrid = document.getElementById("settings-pref-grid");
  const settingsIdentityArea = document.getElementById("settings-identity-area");

  // Auth modal
  const btnSignInGoogle = document.getElementById("btn-sign-in-google");
  const btnContinueGuest = document.getElementById("btn-continue-guest");
  const authProviderView = document.getElementById("auth-provider-view");
  const authEmailView = document.getElementById("auth-email-view");
  const authEmailOpen = document.getElementById("btn-auth-email-open");
  const authEmailBack = document.getElementById("btn-auth-email-back");
  const authEmailTitle = document.getElementById("auth-email-title");
  const authEmailSubtitle = document.getElementById("auth-email-subtitle");
  const authModeBtns = document.getElementById("auth-mode-tabs");
  const authEmailInput = document.getElementById("auth-email");
  const authPasswordInput = document.getElementById("auth-password");
  const authEmailForm = document.getElementById("auth-email-form");
  const authEmailSubmit = document.getElementById("btn-auth-email-submit");
  const authForgotPassword = document.getElementById("btn-auth-forgot-password");
  const authStatus = document.getElementById("auth-status");

  // Onboarding
  const onboardingBody = document.getElementById("onboarding-body");
  const step1El = document.getElementById("onboarding-step-1");
  const step2El = document.getElementById("onboarding-step-2");
  const step3El = document.getElementById("onboarding-step-3");
  const stepLabel = document.getElementById("onboarding-step-label");
  const usernameInput = document.getElementById("username-input");
  const usernameHint = document.getElementById("username-hint");
  const btnUsernameNext = document.getElementById("btn-username-next");
  const prefGrid = document.getElementById("pref-grid");
  const btnPrefsDone = document.getElementById("btn-prefs-done");
	  const btnProfileDone = document.getElementById("btn-profile-done");
	  const onboardingTzSelect = document.getElementById("onboarding-tz-select");
	  const favoriteTeamSelect = document.getElementById("favorite-team-select");
	  const avatarChoiceGrid = document.getElementById("avatar-choice-grid");
  const sportIconFallbackGrid = document.getElementById("sport-icon-fallback-grid");

  // All available competitions for preferences
  const identity = window.gs.identity || {};
  const allCompetitions = identity.allCompetitions || [
    { id: "NRL", label: "NRL", color: "#147a5a", sub: "Rugby League" },
    { id: "AFL", label: "AFL", color: "#c73d32", sub: "Aussie Rules" },
    { id: "Super Rugby", label: "Super Rugby", color: "#2168a7", sub: "Rugby Union" },
    { id: "FIFA World Cup", label: "World Cup", color: "#d49a22", sub: "Football" },
    { id: "NFL", label: "NFL", color: "#244b7a", sub: "American Football" },
    { id: "NBA", label: "NBA", color: "#1d5da8", sub: "Basketball" },
    { id: "MLB", label: "MLB", color: "#236192", sub: "Baseball" },
    { id: "NHL", label: "NHL", color: "#2f3a45", sub: "Ice Hockey" },
    { id: "MLS", label: "MLS", color: "#315c50", sub: "Football" },
  ];

  const teamOptionsByCompetition = identity.leagueTeams || {
    NRL: ["Broncos", "Bulldogs", "Cowboys", "Dolphins", "Dragons", "Eels", "Knights", "Panthers", "Rabbitohs", "Raiders", "Roosters", "Sea Eagles", "Sharks", "Storm", "Titans", "Warriors", "Wests Tigers"],
    AFL: ["Adelaide Crows", "Brisbane Lions", "Carlton", "Collingwood", "Essendon", "Fremantle", "Geelong Cats", "Gold Coast Suns", "GWS Giants", "Hawthorn", "Melbourne", "North Melbourne", "Port Adelaide", "Richmond", "St Kilda", "Sydney Swans", "West Coast Eagles", "Western Bulldogs"],
    "Super Rugby": ["ACT Brumbies", "Blues", "Chiefs", "Crusaders", "Fijian Drua", "Highlanders", "Hurricanes", "Moana Pasifika", "NSW Waratahs", "Queensland Reds", "Western Force"],
    "FIFA World Cup": ["Australia", "New Zealand", "England", "France", "Brazil", "Argentina", "Japan", "United States"],
    NFL: [],
    NBA: [],
    MLB: [],
    NHL: [],
    MLS: [],
  };

  const teamLeagueMap = Object.fromEntries(
    Object.entries(teamOptionsByCompetition).flatMap(([league, names]) => names.map((name) => [name, league]))
  );

  const logoOverrides = {
    "ACT Brumbies": "assets/logos/super-rugby-brumbies.png",
    "Fijian Drua": "assets/logos/super-rugby-fijian-drua.jpg",
    "North Melbourne": "assets/logos/afl-north-melbourne.png",
    "Western Force": "assets/logos/super-rugby-western-force.png",
  };

  const sportIconChoices = identity.sportIconChoices || [
    { id: "sport:soccer", label: "Football", icon: "⚽" },
    { id: "sport:rugby", label: "Rugby", icon: "🏉" },
    { id: "sport:aussie-rules", label: "Aussie Rules", icon: "🏉" },
    { id: "sport:basketball", label: "Basketball", icon: "🏀" },
    { id: "sport:baseball", label: "Baseball", icon: "⚾" },
    { id: "sport:tennis", label: "Tennis", icon: "🎾" },
    { id: "sport:cricket", label: "Cricket", icon: "🏏" },
    { id: "sport:hockey", label: "Hockey", icon: "🏒" },
  ];

  let pendingUsername = "";
  let pendingPrefs = [];
  let pendingAvatarType = "google";
  let authMode = "signin";

  // ── Init ──────────────────────────────────────────────────────
  async function init() {
    const { data: { session } } = await supabase.auth.getSession();

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await handleSession(session);
      } else {
        handleSignOut();
      }
    });

    if (session) {
      await handleSession(session);
    } else {
      // If guest browsing allowed, show UI straight away
      if (cfg.ALLOW_GUEST_BROWSE) {
        showGuestUI();
        if (!hasChosenGuestBrowse()) showAuthModal();
      } else {
        showAuthModal();
      }
    }
  }

	  async function handleSession(session) {
	    window.gs.auth.session = session;
	    authModal.classList.add("is-hidden");

	    // Load profile
	    const profile = await loadProfile(session.user.id);
	    window.gs.auth.profile = profile;
	    window.gs.auth.isAdmin = profile?.is_admin === true;
	    window.gs.auth.isGuest = false;

	    if ((!profile || !profile.username) && !hasCompletedOnboarding(session.user.id)) {
	      // New user — show onboarding
	      showOnboarding(session.user, profile);
	    } else {
	      const readyProfile = (profile && profile.username)
	        ? profile
	        : profileFromLocalChoice(session.user.id, defaultProfileForUser(session.user));
	      window.gs.auth.profile = readyProfile;
	      hideOnboarding();
	      finaliseUI(readyProfile);
	    }

    // Notify other modules
    document.dispatchEvent(new CustomEvent("gs:auth-ready", {
      detail: { session, profile: window.gs.auth.profile },
    }));
  }

  function handleSignOut() {
    window.gs.auth.session = null;
    window.gs.auth.profile = null;
    window.gs.auth.isAdmin = false;
    window.gs.auth.isGuest = false;
    showGuestUI();
    document.dispatchEvent(new CustomEvent("gs:auth-signout"));
  }

  function showGuestUI() {
    window.gs.auth.isGuest = true;
    authHeaderArea.innerHTML = `
      <button class="btn-signin-header" id="btn-header-signin" type="button">Sign in</button>
    `;
    document.getElementById("btn-header-signin")?.addEventListener("click", showAuthModal);
    if (settingsAccountArea) {
      settingsAccountArea.innerHTML = `
        <p style="color:var(--muted);font-size:0.88rem;margin:0 0 10px;">Browsing as guest.</p>
        <button class="btn-primary btn-small" id="btn-settings-signin" type="button">Sign in</button>
      `;
      document.getElementById("btn-settings-signin")?.addEventListener("click", () => {
        closeSettings();
        showAuthModal();
      });
    }
    populateSettingsPrefGrid(null);
    populateSettingsIdentity(null);
  }

  function finaliseUI(profile) {
    // Header avatar
    const initials = (profile.username || "?").slice(0, 2).toUpperCase();
    authHeaderArea.innerHTML = `
      <button class="btn-user" id="btn-user-menu" type="button" aria-label="User menu">
        <span class="user-avatar">${avatarInnerHtmlForProfile(profile, initials)}</span>
        <span>@${profile.username}</span>
      </button>
    `;
    document.getElementById("btn-user-menu")?.addEventListener("click", openSettings);

    // Admin link
    if (profile.is_admin) {
      adminLink?.classList.remove("is-hidden");
    }

    // Settings account area
    if (settingsAccountArea) {
      const avatarHtml = `<div class="user-avatar" style="width:48px;height:48px;font-size:1.1rem;">${avatarInnerHtmlForProfile(profile, initials)}</div>`;
      settingsAccountArea.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          ${avatarHtml}
          <div>
            <strong style="display:block;">@${profile.username}</strong>
            <span style="color:var(--muted);font-size:0.82rem;">${window.gs.auth.session?.user?.email || ""}</span>
          </div>
        </div>
        <button class="btn-text-small" id="btn-sign-out" type="button">Sign out</button>
      `;
      document.getElementById("btn-sign-out")?.addEventListener("click", signOut);
    }

    populateSettingsPrefGrid(profile.preferred_competitions);
    populateSettingsIdentity(profile);
    applyProfileDisplayPrefs(profile);
  }

  // ── Profile DB ────────────────────────────────────────────────
  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error && error.code !== "PGRST116") console.error("Profile load error:", error);
    const cached = readLocalProfile(userId);
    if (cached?.username && (!data || !data.username)) {
      saveProfileWithFallback(userId, cached).catch((saveError) => {
        console.error("Profile identity backfill error:", saveError);
      });
    }
    return (data || cached) ? { ...(data || {}), ...(cached || {}) } : null;
  }

  async function saveProfile(userId, updates) {
    const { data, error } = await supabase
      .from("profiles")
      .upsert({ id: userId, updated_at: new Date().toISOString(), ...updates }, { onConflict: "id" })
      .select()
      .single();
    if (error) console.error("Profile save error:", error);
    return data || null;
  }

  async function saveProfileWithFallback(userId, updates) {
    const fullProfile = await saveProfile(userId, updates);
    if (fullProfile) return fullProfile;

    const legacyUpdates = {
      username: updates.username,
      preferred_competitions: updates.preferred_competitions,
      avatar_url: updates.avatar_url,
    };
    const legacyProfile = await saveProfile(userId, legacyUpdates);
    if (!legacyProfile) return null;

    localStorage.setItem("gs.timeZone", updates.timezone || preferredBrowserTimeZone());
    localStorage.setItem("gs.theme", updates.theme || "dark");
    return { ...legacyProfile, ...updates };
  }

  function profileFromLocalChoice(userId, updates) {
    return {
      id: userId,
      ...(window.gs.auth.profile || {}),
      ...updates,
      updated_at: new Date().toISOString(),
    };
  }

  function applyLocalProfile(profile, eventName = "gs:profile-updated") {
    window.gs.auth.profile = profile;
    window.gs.auth.isAdmin = profile?.is_admin === true;
    cacheLocalProfile(profile);
    applyProfileDisplayPrefs(profile);
    finaliseUI(profile);
    document.dispatchEvent(new CustomEvent(eventName, { detail: { profile } }));
  }

  async function saveProfileWithTimeout(userId, updates, timeoutMs = 4500) {
    let timer;
    const timeout = new Promise(resolve => {
      timer = setTimeout(() => resolve(null), timeoutMs);
    });
    const save = saveProfileWithFallback(userId, updates).catch(error => {
      console.error("Profile background save error:", error);
      return null;
    });
    const result = await Promise.race([save, timeout]);
    clearTimeout(timer);
    return result;
  }

  function persistProfileInBackground(userId, updates) {
    saveProfileWithTimeout(userId, updates).then(profile => {
      if (!profile) return;
      window.gs.auth.profile = { ...(window.gs.auth.profile || {}), ...profile };
      cacheLocalProfile(window.gs.auth.profile);
      document.dispatchEvent(new CustomEvent("gs:profile-updated", { detail: { profile: window.gs.auth.profile } }));
    });
  }

  // ── Auth actions ──────────────────────────────────────────────
  async function signInWithGoogle() {
    await startGoogleSignIn(appRedirectUrl());
  }

  async function startGoogleSignIn(redirectTo) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: { prompt: "select_account" }
      }
    });
    if (error) console.error("Google sign-in error:", error);
  }

  async function signInWithEmail() {
    const email = authEmailInput?.value?.trim();
    const password = authPasswordInput?.value || "";
    setAuthStatus("");
    if (!email || !password) {
      setAuthStatus("Enter your email and password first.", true);
      return;
    }
    if (authMode === "signup" && !isStrongPassword(password)) {
      setAuthStatus("Use at least 10 characters with uppercase, lowercase and a number.", true);
      authPasswordInput?.classList.add("is-error");
      return;
    }

    authEmailSubmit.disabled = true;
    authEmailSubmit.textContent = authMode === "signup" ? "Creating account..." : "Signing in...";
    const redirectTo = appRedirectUrl();
    const action = authMode === "signup"
      ? supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } })
      : supabase.auth.signInWithPassword({ email, password });
    const { data, error } = await action;
    authEmailSubmit.disabled = false;
    syncAuthMode();

    if (error) {
      setAuthStatus(error.message || "That did not work. Please try again.", true);
      return;
    }

    if (authMode === "signup" && !data.session) {
      setAuthStatus("Check your email to confirm the account, then come back and sign in.");
      return;
    }

    hideAuthModal();
  }

  async function sendPasswordReset() {
    const email = authEmailInput?.value?.trim();
    setAuthStatus("");
    if (!email) {
      setAuthStatus("Enter your email address first, then choose password reset.", true);
      return;
    }
    authForgotPassword.disabled = true;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: appRedirectUrl(),
    });
    authForgotPassword.disabled = false;
    setAuthStatus(error ? error.message : "Password reset email sent. Check your inbox.", Boolean(error));
  }

  function appRedirectUrl() {
    if (/^https?:$/.test(window.location.protocol)) {
      return new URL("./", window.location.href.split("#")[0]).href;
    }
    return window.GRANDSTAND_CONFIG?.APP_URL || window.location.href;
  }

  async function signOut() {
    await supabase.auth.signOut();
    closeSettings();
  }

  // ── Auth modal ────────────────────────────────────────────────
  function showAuthModal() {
    showAuthProviderView();
    authModal.classList.remove("is-hidden");
    document.body.classList.add("modal-open");
  }

  function hideAuthModal() {
    authModal.classList.add("is-hidden");
    document.body.classList.remove("modal-open");
  }

  btnSignInGoogle?.addEventListener("click", signInWithGoogle);
  authEmailOpen?.addEventListener("click", showAuthEmailView);
  authEmailBack?.addEventListener("click", showAuthProviderView);
  btnContinueGuest?.addEventListener("click", () => {
    markGuestBrowseChosen();
    hideAuthModal();
    showGuestUI();
  });
  authModeBtns?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-auth-mode]");
    if (!btn) return;
    authMode = btn.dataset.authMode;
    syncAuthMode();
  });
  authEmailForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    signInWithEmail();
  });
  authForgotPassword?.addEventListener("click", sendPasswordReset);
  authPasswordInput?.addEventListener("input", () => {
    if (authMode !== "signup") return;
    const password = authPasswordInput.value || "";
    authPasswordInput.classList.toggle("is-error", password.length > 0 && !isStrongPassword(password));
  });

  function syncAuthMode() {
    authModeBtns?.querySelectorAll("[data-auth-mode]").forEach((btn) => {
      const isActive = btn.dataset.authMode === authMode;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", String(isActive));
    });
    if (authEmailSubmit) authEmailSubmit.textContent = authMode === "signup" ? "Create account" : "Sign in";
    if (authForgotPassword) authForgotPassword.classList.toggle("is-hidden", authMode === "signup");
    if (authEmailTitle) authEmailTitle.textContent = authMode === "signup" ? "Create your account" : "Sign in with email";
    if (authEmailSubtitle) {
      authEmailSubtitle.textContent = authMode === "signup"
        ? "Use an email address you can access."
        : "Welcome back. Enter your account details.";
    }
    if (authPasswordInput) {
      authPasswordInput.placeholder = authMode === "signup" ? "Strong password" : "Password";
      authPasswordInput.autocomplete = authMode === "signup" ? "new-password" : "current-password";
    }
    setAuthStatus(authMode === "signup"
      ? "Use at least 10 characters with uppercase, lowercase and a number."
      : "");
  }

  function showAuthProviderView() {
    authProviderView?.classList.remove("is-hidden");
    authEmailView?.classList.add("is-hidden");
    authModal?.setAttribute("aria-labelledby", "auth-modal-title");
    setAuthStatus("");
  }

  function showAuthEmailView() {
    authProviderView?.classList.add("is-hidden");
    authEmailView?.classList.remove("is-hidden");
    authModal?.setAttribute("aria-labelledby", "auth-email-title");
    syncAuthMode();
    window.setTimeout(() => authEmailInput?.focus(), 0);
  }

  function setAuthStatus(message, isError = false) {
    if (!authStatus) return;
    authStatus.textContent = message || "";
    authStatus.classList.toggle("is-error", Boolean(isError));
  }

  function isStrongPassword(password) {
    return password.length >= 10 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);
  }

  // ── Onboarding ────────────────────────────────────────────────
	  function showOnboarding(user, profile = null) {
    // Pre-fill username from Google display name if available
    const suggestedName = profile?.username || slugifyUsername(user.user_metadata?.full_name || user.email?.split("@")[0] || "");
    usernameInput.value = suggestedName;
    validateUsername(suggestedName);

    // Build pref grid
    const existingPrefs = Array.isArray(profile?.preferred_competitions) && profile.preferred_competitions.length
      ? profile.preferred_competitions
      : ["NRL", "AFL"];
    buildPrefGrid(prefGrid, existingPrefs);
    pendingPrefs = existingPrefs;
    pendingAvatarType = profile?.avatar_type || "google";
    populateTimeZoneSelect(onboardingTzSelect, profile?.timezone || preferredBrowserTimeZone());
    populateFavoriteTeamSelect(favoriteTeamSelect, existingPrefs, profile?.favorite_team);
    buildAvatarChoices(avatarChoiceGrid, favoriteTeamSelect?.value || profile?.favorite_team || "", pendingAvatarType);

	    onboardingModal.style.display = "";
	    onboardingModal.removeAttribute("aria-hidden");
	    onboardingModal.classList.remove("is-hidden");
	    document.body.classList.add("modal-open");
	    step1El.classList.remove("is-hidden");
	    step2El.classList.add("is-hidden");
	    step3El.classList.add("is-hidden");
	    stepLabel.textContent = "Step 1 of 3";
	  }

  function hideOnboarding() {
    if (!onboardingModal) return;
    document.body.classList.add("onboarding-complete");
    onboardingModal.classList.add("is-hidden");
    onboardingModal.setAttribute("aria-hidden", "true");
    onboardingModal.style.display = "none";
    document.body.classList.remove("modal-open");
  }

  function completeOnboarding(userId, profile) {
    markOnboardingComplete(userId);
    cacheLocalProfile(profile);
    hideOnboarding();
    onboardingModal?.remove();
    applyLocalProfile(profile);
  }

  usernameInput?.addEventListener("input", () => {
    validateUsername(usernameInput.value);
  });

  function validateUsername(value) {
    const clean = value.trim();
    const valid = /^[a-zA-Z0-9_]{3,32}$/.test(clean);
    usernameInput.classList.toggle("is-error", value.length > 0 && !valid);
    usernameHint.classList.toggle("is-error", value.length > 0 && !valid);
    usernameHint.textContent = value.length > 0 && !valid
      ? "3–32 characters: letters, numbers, underscores only."
      : "Letters, numbers, underscores. 3–32 characters.";
    btnUsernameNext.disabled = !valid;
  }

  btnUsernameNext?.addEventListener("click", async () => {
    const username = usernameInput.value.trim();
    const userId = window.gs.auth.session?.user?.id;

    // Check uniqueness
    btnUsernameNext.disabled = true;
    btnUsernameNext.textContent = "Checking...";
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .single();

    if (existing && existing.id !== userId) {
      usernameHint.textContent = "That username is taken — try another.";
      usernameHint.classList.add("is-error");
      usernameInput.classList.add("is-error");
      btnUsernameNext.disabled = false;
      btnUsernameNext.textContent = "Next";
      return;
    }

    pendingUsername = username;
    step1El.classList.add("is-hidden");
    step2El.classList.remove("is-hidden");
    step3El.classList.add("is-hidden");
    stepLabel.textContent = "Step 2 of 3";
    btnUsernameNext.textContent = "Next";
  });

  btnPrefsDone?.addEventListener("click", () => {
    const selected = [...prefGrid.querySelectorAll(".pref-tile.active")].map(t => t.dataset.id);
    pendingPrefs = selected.length ? selected : allCompetitions.map(c => c.id);
    populateFavoriteTeamSelect(favoriteTeamSelect, pendingPrefs, favoriteTeamSelect?.value);
    buildAvatarChoices(avatarChoiceGrid, favoriteTeamSelect?.value || "", pendingAvatarType);
    step2El.classList.add("is-hidden");
    step3El.classList.remove("is-hidden");
    stepLabel.textContent = "Step 3 of 3";
  });

  favoriteTeamSelect?.addEventListener("change", () => {
    buildAvatarChoices(avatarChoiceGrid, favoriteTeamSelect.value, pendingAvatarType);
  });

	  avatarChoiceGrid?.addEventListener("click", (e) => {
	    const btn = e.target.closest(".avatar-choice");
	    if (!btn) return;
	    setPendingAvatarType(btn.dataset.avatarType);
	  });

  sportIconFallbackGrid?.addEventListener("click", (e) => {
    const btn = e.target.closest(".avatar-choice");
    if (!btn) return;
    setPendingAvatarType(btn.dataset.avatarType);
  });

  function setPendingAvatarType(avatarType) {
    pendingAvatarType = avatarType || "google";
    document.querySelectorAll("#avatar-choice-grid .avatar-choice, #sport-icon-fallback-grid .avatar-choice").forEach(choice => {
      choice.classList.toggle("active", choice.dataset.avatarType === pendingAvatarType);
    });
  }

	  btnProfileDone?.addEventListener("click", async () => {
	    const userId = window.gs.auth.session?.user?.id;
	    if (!userId) return;

	    btnProfileDone.disabled = true;
	    btnProfileDone.textContent = "Saving...";

	    try {
	      const favoriteTeam = favoriteTeamSelect?.value || "";
	      const updates = {
	        username: pendingUsername || usernameInput?.value?.trim() || slugifyUsername(window.gs.auth.session?.user?.email?.split("@")[0] || "fan"),
	        preferred_competitions: pendingPrefs.length ? pendingPrefs : allCompetitions.map(c => c.id),
	        timezone: onboardingTzSelect?.value || preferredBrowserTimeZone(),
	        theme: document.body.dataset.theme || "dark",
	        favorite_team: favoriteTeam,
	        avatar_type: pendingAvatarType,
	        avatar_team: pendingAvatarType === "team" ? favoriteTeam : null,
	        avatar_url: window.gs.auth.session?.user?.user_metadata?.avatar_url || null,
	      };

	      const localProfile = profileFromLocalChoice(userId, updates);
	      completeOnboarding(userId, localProfile);
	      persistProfileInBackground(userId, updates);
	    } catch (error) {
	      console.error("Onboarding completion error:", error);
	      hideOnboarding();
	    } finally {
	      btnProfileDone.disabled = false;
	      btnProfileDone.textContent = "Get started";
	    }
	  });

  // ── Pref grid helpers ─────────────────────────────────────────
  function buildPrefGrid(container, selectedIds) {
    if (!container) return;
    container.innerHTML = allCompetitions.map(comp => `
      <button type="button"
              class="pref-tile${selectedIds.includes(comp.id) ? " active" : ""}"
              data-id="${comp.id}">
        <span class="pref-swatch" style="background:${comp.color};"></span>
        <span>${comp.label}</span>
        <small>${comp.sub}</small>
      </button>
    `).join("");

    container.querySelectorAll(".pref-tile").forEach(tile => {
      tile.addEventListener("click", () => tile.classList.toggle("active"));
    });
  }

  function populateSettingsPrefGrid(currentPrefs) {
    if (!settingsPrefGrid) return;
    const selected = currentPrefs || [];
    buildPrefGrid(settingsPrefGrid, selected);

    // Auto-save on toggle
    settingsPrefGrid.querySelectorAll(".pref-tile").forEach(tile => {
      tile.addEventListener("click", debounce(async () => {
        const userId = window.gs.auth.session?.user?.id;
        if (!userId) return;
        const updated = [...settingsPrefGrid.querySelectorAll(".pref-tile.active")].map(t => t.dataset.id);
        const profile = profileFromLocalChoice(userId, { preferred_competitions: updated });
        window.gs.auth.profile = profile;
        cacheLocalProfile(profile);
        document.dispatchEvent(new CustomEvent("gs:prefs-updated", { detail: { prefs: updated } }));
        persistProfileInBackground(userId, { preferred_competitions: updated });
      }, 600));
    });
  }

  function populateSettingsIdentity(profile) {
    if (!settingsIdentityArea) return;
    if (!window.gs.auth.session) {
      settingsIdentityArea.innerHTML = `<p class="settings-note">Sign in to choose a team icon and favourite side.</p>`;
      return;
    }

    const prefs = Array.isArray(profile?.preferred_competitions) && profile.preferred_competitions.length
      ? profile.preferred_competitions
      : allCompetitions.map(c => c.id);
    settingsIdentityArea.innerHTML = `
      <div class="settings-row stacked">
        <label for="settings-favorite-team">Favourite team</label>
        <select id="settings-favorite-team"></select>
      </div>
      <div class="settings-row stacked">
        <span>Chat icon</span>
        <div class="avatar-choice-grid compact" id="settings-avatar-choice-grid"></div>
      </div>
    `;

    const teamSelect = document.getElementById("settings-favorite-team");
    const avatarGrid = document.getElementById("settings-avatar-choice-grid");
    populateFavoriteTeamSelect(teamSelect, prefs, profile?.favorite_team);
    buildAvatarChoices(avatarGrid, teamSelect?.value || "", profile?.avatar_type || "google");

    teamSelect?.addEventListener("change", debounce(async () => {
      const userId = window.gs.auth.session?.user?.id;
      if (!userId) return;
      const updates = {
        favorite_team: teamSelect.value,
        avatar_team: (window.gs.auth.profile?.avatar_type || "google") === "team" ? teamSelect.value : window.gs.auth.profile?.avatar_team,
      };
      const updated = profileFromLocalChoice(userId, updates);
      applyLocalProfile(updated);
      persistProfileInBackground(userId, updates);
    }, 350));

    avatarGrid?.addEventListener("click", async (e) => {
      const btn = e.target.closest(".avatar-choice");
      const userId = window.gs.auth.session?.user?.id;
      if (!btn || !userId) return;
      const avatarType = btn.dataset.avatarType;
      const updates = {
        avatar_type: avatarType,
        avatar_team: avatarType === "team" ? (teamSelect?.value || profile?.favorite_team || null) : null,
      };
      const updated = profileFromLocalChoice(userId, updates);
      applyLocalProfile(updated);
      persistProfileInBackground(userId, updates);
    });
  }

  function populateFavoriteTeamSelect(select, competitionIds, currentTeam = "") {
    if (!select) return;
    const leaguesToShow = competitionIds?.length ? competitionIds : allCompetitions.map(c => c.id);
    const options = leaguesToShow
      .filter(league => teamOptionsByCompetition[league]?.length)
      .map(league => `
        <optgroup label="${league === "FIFA World Cup" ? "World Cup" : league}">
          ${teamOptionsByCompetition[league].map(team => `<option value="${team}">${team}</option>`).join("")}
        </optgroup>
      `).join("");
    select.innerHTML = options || `<option value="">Choose a team later</option>`;
    const first = select.querySelector("option")?.value || "";
    select.value = currentTeam && [...select.options].some(option => option.value === currentTeam) ? currentTeam : first;
  }

  function buildAvatarChoices(container, favoriteTeam, activeType = "google") {
	    if (!container) return;
	    const googleAvatar = window.gs.auth.session?.user?.user_metadata?.avatar_url;
	    const teamLogo = favoriteTeam ? teamLogoPath(favoriteTeam) : "";
	    container.innerHTML = `
	      <button type="button" class="avatar-choice${activeType === "google" || !activeType ? " active" : ""}" data-avatar-type="google">
	        <span class="identity-avatar">${googleAvatar ? `<img src="${googleAvatar}" alt="">` : "G"}</span>
	        <span>Google</span>
	      </button>
	      <button type="button" class="avatar-choice${activeType === "team" ? " active" : ""}" data-avatar-type="team" ${favoriteTeam ? "" : "disabled"}>
	        ${favoriteTeam ? teamIconHtml(favoriteTeam, "identity-avatar team") : `<span class="identity-avatar team">${teamInitials(favoriteTeam)}</span>`}
	        <span>${favoriteTeam || "Team"}</span>
	      </button>
        ${sportIconChoices.map(choice => sportIconChoiceMarkup(choice, activeType)).join("")}
		    `;
	    verifyAndRepairAvatarChoiceRender(container, activeType);
    syncFallbackSportIcons(activeType);
	  }

  function sportIconChoiceMarkup(choice, activeType = "") {
    return `
      <button type="button" class="avatar-choice${activeType === choice.id ? " active" : ""}" data-avatar-type="${choice.id}">
        <span class="identity-avatar sport-icon">${choice.icon}</span>
        <span>${choice.label}</span>
      </button>
    `;
  }

  function verifyAndRepairAvatarChoiceRender(container, activeType = "") {
    const expected = 2 + sportIconChoices.length;
    let actual = container.querySelectorAll(".avatar-choice").length;
    const existingTypes = new Set([...container.querySelectorAll(".avatar-choice")].map(btn => btn.dataset.avatarType));
    const missingSportChoices = sportIconChoices.filter(choice => !existingTypes.has(choice.id));

    if (missingSportChoices.length) {
      container.insertAdjacentHTML("beforeend", missingSportChoices.map(choice => sportIconChoiceMarkup(choice, activeType)).join(""));
      actual = container.querySelectorAll(".avatar-choice").length;
    }

    window.gs.authDiagnostics = {
      build: window.gs.authBuild,
      expectedAvatarChoices: expected,
      actualAvatarChoices: actual,
      repairedMissingChoices: missingSportChoices.map(choice => choice.id),
      pageProtocol: window.location.protocol,
      pageUrl: window.location.href,
    };
    if (actual >= expected) return;

    console.error("[Grandstand Auth] Chat icon picker rendered incompletely", window.gs.authDiagnostics);
    const warning = document.createElement("p");
    warning.className = "settings-note auth-diagnostic";
    warning.textContent = `Icon picker did not fully load (${actual}/${expected}) on build ${window.gs.authBuild}.`;
    container.appendChild(warning);
  }

  function syncFallbackSportIcons(activeType = "") {
    if (!sportIconFallbackGrid) return;
    sportIconFallbackGrid.querySelectorAll(".avatar-choice").forEach(choice => {
      choice.classList.toggle("active", choice.dataset.avatarType === activeType);
    });
  }

  function populateTimeZoneSelect(select, currentZone) {
    if (!select) return;
    const browserZone = preferredBrowserTimeZone();
    const featured = [
      browserZone,
      "Pacific/Auckland",
      "Australia/Sydney",
      "Australia/Perth",
      "Asia/Tokyo",
      "Asia/Singapore",
      "Europe/London",
      "Europe/Paris",
      "America/New_York",
      "America/Chicago",
      "America/Los_Angeles",
      "UTC",
    ];
    const supported = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
    const zones = [...new Set([...featured, ...supported].filter(Boolean))];
    select.innerHTML = zones.map(zone => `<option value="${zone}">${timeZoneLabel(zone, zone === browserZone)}</option>`).join("");
    select.value = zones.includes(currentZone) ? currentZone : browserZone;
  }

  function preferredBrowserTimeZone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Pacific/Auckland";
  }

  function timeZoneLabel(zone, isBrowserZone) {
    const city = zone === "UTC" ? "UTC" : zone.split("/").pop().replaceAll("_", " ");
    const suffix = isBrowserZone ? " (your browser)" : "";
    return `${city}${suffix}`;
  }

  function applyProfileDisplayPrefs(profile) {
    if (profile?.theme) {
      document.body.dataset.theme = profile.theme;
      localStorage.setItem("gs.theme", profile.theme);
      window.gs.setTheme?.(profile.theme);
    }
    if (profile?.timezone) {
      localStorage.setItem("gs.timeZone", profile.timezone);
      window.gs.currentTz = profile.timezone;
      window.gs.setTz?.(profile.timezone);
    }
  }

  function avatarUrlForProfile(profile) {
    if (profile?.avatar_type === "team" && (profile.avatar_team || profile.favorite_team)) {
      return teamLogoPath(profile.avatar_team || profile.favorite_team);
    }
    return window.gs.auth.session?.user?.user_metadata?.avatar_url || profile?.avatar_url || "";
  }

  function avatarInnerHtmlForProfile(profile, fallback = "?") {
    if (identity.avatarHtmlForProfile) {
      const enrichedProfile = {
        ...(profile || {}),
        avatar_url: profile?.avatar_url || window.gs.auth.session?.user?.user_metadata?.avatar_url || "",
      };
      return identity.avatarHtmlForProfile(enrichedProfile, fallback);
    }
    if (profile?.avatar_type?.startsWith("sport:")) return sportIconFor(profile.avatar_type);
    const avatarUrl = avatarUrlForProfile(profile);
    if (avatarUrl) {
      const team = profile?.avatar_type === "team" ? (profile.avatar_team || profile.favorite_team || "") : "";
      const fallbackText = team ? teamInitials(team) : fallback;
      return `<img src="${avatarUrl}" alt="${fallbackText}" onerror="this.parentElement.textContent='${fallbackText}';this.remove()">`;
    }
    return fallback;
  }

  function sportIconFor(type) {
    return identity.sportIconFor?.(type) || sportIconChoices.find(choice => choice.id === type)?.icon || "🏟️";
  }

  function teamLogoPath(team) {
    const sharedLogo = identity.logoForTeam?.(team);
    if (sharedLogo) return sharedLogo;
    if (!team) return "";
    if (logoOverrides[team]) return logoOverrides[team];
    const league = teamLeagueMap[team] || "";
    const prefix = { NRL: "nrl", AFL: "afl", "Super Rugby": "super-rugby", "FIFA World Cup": "wc" }[league] || "sports";
    const ext = league === "Super Rugby" ? "jpg" : "svg";
    return `assets/logos/${prefix}-${slugifyTeam(team)}.${ext}`;
  }

  function teamIconHtml(team, className = "identity-avatar team") {
    if (identity.iconHtmlForTeam) {
      return identity.iconHtmlForTeam(team, teamLeagueMap[team], { className });
    }
    const logo = teamLogoPath(team);
    return logo ? `<img src="${logo}" alt="" onerror="this.parentElement.textContent='${teamInitials(team)}';this.remove()">` : teamInitials(team);
  }

  function slugifyTeam(value) {
    return String(value).toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function teamInitials(team) {
    return String(team || "Team")
      .split(/\s+/)
      .filter(Boolean)
      .map(part => part[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();
  }

  // ── Settings panel ────────────────────────────────────────────
  function openSettings() {
    const panel = document.getElementById("settings-panel");
    const backdrop = document.getElementById("settings-backdrop");
    panel?.classList.remove("is-hidden");
    panel?.classList.add("is-open");
    backdrop?.classList.remove("is-hidden");
    document.body.classList.add("modal-open");

    // Sync theme/tz toggles from current state
    syncSettingsToggles();
  }

  function closeSettings() {
    const panel = document.getElementById("settings-panel");
    const backdrop = document.getElementById("settings-backdrop");
    panel?.classList.remove("is-open");
    backdrop?.classList.add("is-hidden");
    document.body.classList.remove("modal-open");
  }

  window.gs.openSettings = openSettings;
  window.gs.closeSettings = closeSettings;

  document.getElementById("settings-close-btn")?.addEventListener("click", closeSettings);
  document.getElementById("settings-backdrop")?.addEventListener("click", closeSettings);
  document.getElementById("btn-settings")?.addEventListener("click", openSettings);

  function syncSettingsToggles() {
    // Theme
    const currentTheme = document.body.dataset.theme || "dark";
    document.querySelectorAll("#settings-theme-filters button").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.theme === currentTheme);
    });
    const tzSelect = document.getElementById("settings-tz-select");
    if (tzSelect) tzSelect.value = window.gs.currentTz || "";
  }

  // Wire settings toggles to the main app state
  document.getElementById("settings-theme-filters")?.addEventListener("click", e => {
    const btn = e.target.closest("button");
    if (!btn) return;
    setActiveInParent(btn);
    document.body.dataset.theme = btn.dataset.theme;
    // Also sync the main app if it has a theme state
    if (window.gs.setTheme) window.gs.setTheme(btn.dataset.theme);
    saveDisplaySetting({ theme: btn.dataset.theme });
  });

  document.getElementById("settings-tz-select")?.addEventListener("change", e => {
    if (window.gs.setTz) window.gs.setTz(e.target.value);
    saveDisplaySetting({ timezone: e.target.value });
  });

  const saveDisplaySetting = debounce(async (updates) => {
    const userId = window.gs.auth.session?.user?.id;
    if (!userId) return;
    const profile = profileFromLocalChoice(userId, updates);
    window.gs.auth.profile = profile;
    cacheLocalProfile(profile);
    document.dispatchEvent(new CustomEvent("gs:profile-updated", { detail: { profile } }));
    persistProfileInBackground(userId, updates);
  }, 400);

  // ── Helpers ───────────────────────────────────────────────────
  function slugifyUsername(value) {
    return value.toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .replace(/_{2,}/g, "_")
      .slice(0, 24);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function setActiveInParent(el) {
    el.closest(".segmented")?.querySelectorAll("button").forEach(b => {
      b.classList.toggle("active", b === el);
    });
  }

  function debounce(fn, ms) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
  }

  function localProfileKey(userId) {
    return `gs.profile.${userId}`;
  }

  function onboardingCompleteKey(userId) {
    return `gs.onboardingComplete.${userId}`;
  }

  function markOnboardingComplete(userId) {
    try {
      localStorage.setItem(onboardingCompleteKey(userId), "true");
    } catch (error) {
      console.warn("Unable to mark onboarding complete:", error);
    }
  }

  function hasCompletedOnboarding(userId) {
    try {
      return localStorage.getItem(onboardingCompleteKey(userId)) === "true";
    } catch {
      return false;
    }
  }

  function markGuestBrowseChosen() {
    try {
      localStorage.setItem("gs.guestBrowseChosen", "true");
    } catch {
      // Non-fatal: the guest path still works for this session.
    }
  }

  function hasChosenGuestBrowse() {
    try {
      return localStorage.getItem("gs.guestBrowseChosen") === "true";
    } catch {
      return false;
    }
  }

  function cacheLocalProfile(profile) {
    if (!profile?.id) return;
    try {
      localStorage.setItem(localProfileKey(profile.id), JSON.stringify(profile));
    } catch (error) {
      console.warn("Unable to cache profile locally:", error);
    }
  }

  function readLocalProfile(userId) {
    try {
      const raw = localStorage.getItem(localProfileKey(userId));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function defaultProfileForUser(user) {
    return {
      username: slugifyUsername(user.user_metadata?.full_name || user.email?.split("@")[0] || "fan") || "fan",
      preferred_competitions: allCompetitions.map(c => c.id),
      timezone: preferredBrowserTimeZone(),
      theme: document.body.dataset.theme || "dark",
      favorite_team: "Warriors",
      avatar_type: "google",
      avatar_team: null,
      avatar_url: user.user_metadata?.avatar_url || null,
    };
  }

  // ── Start ─────────────────────────────────────────────────────
  syncAuthMode();
  init();

})();
