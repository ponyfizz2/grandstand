/**
 * Grandstand — Live Chat Module
 * Uses Supabase Realtime for live match social feed.
 * Only active when a game is live and user opens chat.
 */

(function () {
  "use strict";

  window.gs = window.gs || {};
  const identityRegistry = window.gs.identity || {};

  let currentGameId = null;
  let currentGameAliases = [];
  let currentGameInfo = null;
  let realtimeChannel = null;
  let isOpen = false;

  // ── DOM refs ──────────────────────────────────────────────────
  const chatPanel = document.getElementById("chat-panel");
  const chatBackdrop = document.getElementById("chat-backdrop");
  const chatMessages = document.getElementById("chat-messages");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatCloseBtn = document.getElementById("chat-close-btn");
  const chatLeaguePill = document.getElementById("chat-league-pill");
  const chatMatchTitle = document.getElementById("chat-match-title");
  const chatScoreBanner = document.getElementById("chat-score-banner");
  const chatRoomBadge = document.getElementById("chat-room-badge");
  const chatSigninPrompt = document.getElementById("chat-signin-prompt");
  const chatFormEl = document.getElementById("chat-form");
  const chatSigninBtn = document.getElementById("chat-signin-btn");
  const chatStatus = document.getElementById("chat-status");
  const chatSendBtn = chatForm?.querySelector('button[type="submit"]');

  // ── Public API ────────────────────────────────────────────────
  window.gs.openChat = openChat;
  window.gs.closeChat = closeChat;

  /**
   * Open the chat panel for a specific live game.
   * @param {Object} gameInfo — { id, league, title, homeScore, awayScore, home, away }
   */
  async function openChat(gameInfo) {
    currentGameId = gameInfo.id;
    currentGameAliases = [...new Set([gameInfo.id, ...(gameInfo.aliases || [])].filter(Boolean))];
    currentGameInfo = gameInfo;
    isOpen = true;
    setChatStatus("");
    rememberRecentRoom(gameInfo);

    // Update header
    chatLeaguePill.textContent = gameInfo.league;
    chatLeaguePill.style.background = gameInfo.leagueColor || "#147a5a";
    setRoomBadge(gameInfo.phase);
    chatMatchTitle.innerHTML = `
      <span class="chat-matchup-team">${teamIconHtml(gameInfo.home, gameInfo.league, "chat-team-logo")} ${escHtml(gameInfo.home)}</span>
      <span class="chat-matchup-vs">vs</span>
      <span class="chat-matchup-team">${teamIconHtml(gameInfo.away, gameInfo.league, "chat-team-logo")} ${escHtml(gameInfo.away)}</span>
    `;

    // Score/status banner
    if (Number.isFinite(gameInfo.homeScore) && Number.isFinite(gameInfo.awayScore)) {
      chatScoreBanner.textContent = `${gameInfo.statusLabel || "Match room"} · ${gameInfo.home} ${scoreText(gameInfo, "home")} — ${scoreText(gameInfo, "away")} ${gameInfo.away}`;
    } else {
      chatScoreBanner.textContent = gameInfo.statusLabel || "Match room";
    }

    // Auth-dependent input area
    updateChatInputArea();

    // Show panel
    chatPanel.classList.remove("is-hidden");
    document.body.classList.add("chat-open");
    requestAnimationFrame(() => chatPanel.classList.add("is-open"));
    chatBackdrop.classList.remove("is-hidden");

    // Load messages and subscribe
    chatMessages.innerHTML = `<div class="chat-loading">Loading chat...</div>`;
    await loadMessages(currentGameAliases);
    subscribeToGame(currentGameId);
  }

  function rememberRecentRoom(gameInfo) {
    try {
      const existing = JSON.parse(localStorage.getItem("gs.recentRooms") || "[]");
      const rooms = Array.isArray(existing) ? existing : [];
      const next = [
        {
          id: gameInfo.id,
          league: gameInfo.league,
          title: gameInfo.title,
          home: gameInfo.home,
          away: gameInfo.away,
          phase: gameInfo.phase || "",
          statusLabel: gameInfo.statusLabel || "Match room",
          openedAt: new Date().toISOString(),
        },
        ...rooms.filter((room) => room.id !== gameInfo.id),
      ].slice(0, 12);
      localStorage.setItem("gs.recentRooms", JSON.stringify(next));
      document.dispatchEvent(new CustomEvent("gs:recent-rooms-changed", { detail: next }));
    } catch (error) {
      console.warn("[Grandstand Chat] Could not save recent room:", error);
    }
  }

  function closeChat() {
    isOpen = false;
    chatPanel.classList.remove("is-open");
    chatBackdrop.classList.add("is-hidden");
    document.body.classList.remove("chat-open");

    // Unsubscribe after animation
    setTimeout(() => {
      if (!isOpen) {
        unsubscribe();
        chatPanel.classList.add("is-hidden");
        currentGameId = null;
        currentGameAliases = [];
        currentGameInfo = null;
      }
    }, 320);
  }

  chatCloseBtn?.addEventListener("click", closeChat);
  chatBackdrop?.addEventListener("click", closeChat);

  // ── Auth state watcher ────────────────────────────────────────
  document.addEventListener("gs:auth-ready", () => {
    if (isOpen) updateChatInputArea();
  });

  document.addEventListener("gs:auth-signout", () => {
    if (isOpen) updateChatInputArea();
  });

  function updateChatInputArea() {
    const isAuthenticated = !!window.gs.auth?.session;
    if (currentGameInfo?.readOnly) {
      chatSigninPrompt?.classList.remove("is-hidden");
      chatSigninPrompt.querySelector("p").textContent = "This room is read-only.";
      chatSigninBtn?.classList.add("is-hidden");
      chatFormEl?.classList.add("is-hidden");
      return;
    }
    if (isAuthenticated) {
      chatSigninPrompt?.classList.add("is-hidden");
      chatSigninBtn?.classList.remove("is-hidden");
      chatFormEl?.classList.remove("is-hidden");
    } else {
      chatSigninPrompt?.classList.remove("is-hidden");
      chatSigninPrompt.querySelector("p").textContent = "Sign in to join the conversation";
      chatSigninBtn?.classList.remove("is-hidden");
      chatFormEl?.classList.add("is-hidden");
    }
  }

  chatSigninBtn?.addEventListener("click", () => {
    closeChat();
    // Trigger auth modal
    document.getElementById("auth-modal")?.classList.remove("is-hidden");
    document.body.classList.add("modal-open");
  });

  // ── Messages ──────────────────────────────────────────────────
  async function loadMessages(gameIds) {
    const supabase = window.gs.supabase;
    if (!supabase) {
      chatMessages.innerHTML = `<div class="chat-loading">Chat unavailable (Supabase not connected).</div>`;
      return;
    }

    const cfg = window.GRANDSTAND_CONFIG;
    const roomIds = [...new Set((Array.isArray(gameIds) ? gameIds : [gameIds]).filter(Boolean))];
    let query = supabase
      .from("chat_messages")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .limit(cfg.CHAT_MESSAGES_TO_LOAD);
    query = roomIds.length === 1 ? query.eq("game_id", roomIds[0]) : query.in("game_id", roomIds);
    const { data, error } = await query;

    if (error) {
      console.error("Chat history load error:", error);
      chatMessages.innerHTML = `<div class="chat-loading">Could not load this room's saved comments.</div>`;
      setChatStatus("History could not be loaded. Please try again.", "error");
      return;
    }

    chatMessages.innerHTML = "";

    if (!data.length) {
      chatMessages.innerHTML = `<div class="chat-loading">Be the first to comment on this game.</div>`;
      return;
    }

    const profiles = await loadProfilesForMessages(data);
    data.forEach((msg) => appendMessage({ ...msg, profiles: profiles.get(msg.user_id) || null }));
    scrollToBottom();
  }

  async function loadProfilesForMessages(messages) {
    const ids = [...new Set(messages.map((msg) => msg.user_id).filter(Boolean))];
    const profiles = new Map();
    const ownProfile = window.gs.auth?.profile;
    const ownId = window.gs.auth?.session?.user?.id;
    if (ownId && ownProfile) profiles.set(ownId, ownProfile);
    if (!ids.length) return profiles;

    const { data, error } = await window.gs.supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, favorite_team, avatar_type, avatar_team")
      .in("id", ids);
    if (error) {
      console.error("Chat profile load error:", error);
      return profiles;
    }
    (data || []).forEach((profile) => profiles.set(profile.id, profile));
    return profiles;
  }

  function appendMessage(msg) {
    if (!msg?.id || chatMessages.querySelector(`[data-msg-id="${cssEscape(msg.id)}"]`)) return;
    const currentUserId = window.gs.auth?.session?.user?.id;
    const isOwn = msg.user_id === currentUserId;
    const profile = profileForMessage(msg, isOwn);
    const username = profile?.username || profile?.display_name || fallbackUsername(isOwn);
    const avatarHtml = avatarInnerHtmlForMessage(profile, initials(username));
    const favoriteTeam = profile?.favorite_team;
    const time = new Date(msg.created_at).toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" });

    // Remove "no messages" placeholder if present
    const placeholder = chatMessages.querySelector(".chat-loading");
    if (placeholder) placeholder.remove();

    const el = document.createElement("div");
    el.className = `chat-msg${isOwn ? " is-own" : ""}`;
    el.dataset.msgId = msg.id;
    el.innerHTML = `
      <div class="chat-msg-meta">
        <span class="chat-avatar">${avatarHtml}</span>
        <span class="chat-msg-user">@${escHtml(username)}</span>
        ${favoriteTeam ? `<span class="chat-team-badge">${teamIconHtml(favoriteTeam, "", "chat-team-logo")} ${escHtml(favoriteTeam)}</span>` : ""}
        <span>${time}</span>
      </div>
      <div class="chat-msg-bubble">${escHtml(msg.message)}</div>
    `;
    chatMessages.appendChild(el);
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // ── Realtime subscription ─────────────────────────────────────
  function subscribeToGame(gameId) {
    const supabase = window.gs.supabase;
    if (!supabase) return;

    unsubscribe();

    realtimeChannel = supabase
      .channel(`game-chat-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `game_id=eq.${gameId}`,
        },
        async (payload) => {
          const msg = payload.new;
          // Fetch username (not included in realtime payload by default)
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url, favorite_team, avatar_type, avatar_team")
            .eq("id", msg.user_id)
            .maybeSingle();
          appendMessage({ ...msg, profiles: profile });
          scrollToBottom();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          // Handle deletions (soft-delete via is_deleted flag)
          if (payload.new.is_deleted) {
            const el = chatMessages.querySelector(`[data-msg-id="${payload.new.id}"]`);
            if (el) {
              el.querySelector(".chat-msg-bubble").textContent = "[message removed]";
              el.querySelector(".chat-msg-bubble").style.opacity = "0.5";
            }
          }
        }
      )
      .subscribe();
  }

  function unsubscribe() {
    if (realtimeChannel) {
      window.gs.supabase?.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  }

  // ── Send message ──────────────────────────────────────────────
  chatForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text || !currentGameId) return;

    const session = window.gs.auth?.session;
    if (!session) return;
    if (currentGameInfo?.readOnly) return;

    const cfg = window.GRANDSTAND_CONFIG;
    if (text.length > cfg.CHAT_MAX_MESSAGE_LENGTH) return;

    chatInput.value = "";
    chatInput.disabled = true;
    if (chatSendBtn) chatSendBtn.disabled = true;
    setChatStatus("Saving...");

    const profile = window.gs.auth?.profile || {};
    const payload = {
      game_id: currentGameId,
      user_id: session.user.id,
      message: text,
      is_deleted: false,
      author_name: profile.username || fallbackUsername(true),
      author_avatar_url: profile.avatar_url || session.user.user_metadata?.avatar_url || null,
      author_avatar_type: profile.avatar_type || "google",
      author_avatar_team: profile.avatar_team || null,
      author_favorite_team: profile.favorite_team || null,
    };
    let result = await insertChatMessage(payload);
    if (result.error && ["PGRST204", "42703"].includes(result.error.code)) {
      const {
        author_name,
        author_avatar_url,
        author_avatar_type,
        author_avatar_team,
        author_favorite_team,
        ...legacyPayload
      } = payload;
      result = await insertChatMessage(legacyPayload);
    }
    const { data, error } = result;

    if (error) {
      console.error("Chat send error:", error);
      chatInput.value = text; // restore
      setChatStatus(`Comment was not saved: ${friendlyChatError(error)}`, "error");
    } else {
      appendMessage({ ...data, profiles: window.gs.auth?.profile || null });
      scrollToBottom();
      setChatStatus("Saved to this match room.", "success");
      window.setTimeout(() => setChatStatus(""), 2200);
    }
    chatInput.disabled = false;
    if (chatSendBtn) chatSendBtn.disabled = false;
    chatInput.focus();
  });

  function insertChatMessage(payload) {
    return window.gs.supabase
      .from("chat_messages")
      .insert(payload)
      .select("*")
      .single();
  }

  // ── Score updates via live data events ───────────────────────
  document.addEventListener("gs:live-score-update", (e) => {
    if (!isOpen || !currentGameId) return;
    const game = e.detail;
    if (roomIdForGame(game) !== currentGameId) return;
    setRoomBadge("live");
    chatScoreBanner.textContent = `${currentGameInfo?.statusLabel || "Live room"} · ${game.home} ${scoreText(game, "home")} — ${scoreText(game, "away")} ${game.away}`;
  });

  // ── Helpers ───────────────────────────────────────────────────
  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function profileForMessage(msg, isOwn) {
    const embedded = Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles;
    if (embedded?.username || embedded?.display_name) return embedded;
    if (msg.author_name || msg.author_avatar_url || msg.author_avatar_type) {
      return {
        ...(embedded || {}),
        username: msg.author_name || "",
        avatar_url: msg.author_avatar_url || "",
        avatar_type: msg.author_avatar_type || "google",
        avatar_team: msg.author_avatar_team || "",
        favorite_team: msg.author_favorite_team || "",
      };
    }
    if (embedded) return embedded;
    if (isOwn) return window.gs.auth?.profile || null;
    return null;
  }

  function fallbackUsername(isOwn) {
    if (!isOwn) return "Fan";
    const user = window.gs.auth?.session?.user;
    return user?.user_metadata?.user_name ||
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      "Fan";
  }

  function setChatStatus(message, type = "") {
    if (!chatStatus) return;
    chatStatus.textContent = message;
    chatStatus.className = `chat-status${type ? ` is-${type}` : ""}`;
  }

  function setRoomBadge(phase = "") {
    if (!chatRoomBadge) return;
    const states = {
      pre: { label: "Upcoming", className: "is-upcoming" },
      lineup: { label: "Starting soon", className: "is-upcoming" },
      live: { label: "Live", className: "is-live" },
      post: { label: "Post-game", className: "is-post" },
      archive: { label: "Archive", className: "is-archive" },
    };
    const state = states[phase] || { label: "Match room", className: "is-upcoming" };
    chatRoomBadge.textContent = state.label;
    chatRoomBadge.className = `chat-room-badge ${state.className}`;
  }

  function friendlyChatError(error) {
    if (error?.code === "23503") return "your profile is not linked yet. Open Settings and save your identity.";
    if (error?.code === "42501") return "your account is not permitted to post yet.";
    return error?.message || "please try again.";
  }

  function roomIdForGame(game) {
    if (game?.id) return String(game.id).startsWith("espn:") ? String(game.id) : `espn:${game.id}`;
    return "";
  }

  function cssEscape(value) {
    return window.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/"/g, '\\"');
  }

  function avatarUrlForMessage(profile) {
    if (!profile) return "";
    if (profile.avatar_type === "team" && (profile.avatar_team || profile.favorite_team)) {
      return teamLogoPath(profile.avatar_team || profile.favorite_team);
    }
    return profile.avatar_url || "";
  }

  function avatarInnerHtmlForMessage(profile, fallback = "FA") {
    if (identityRegistry.avatarHtmlForProfile) return identityRegistry.avatarHtmlForProfile(profile, fallback);
    if (profile?.avatar_type?.startsWith("sport:")) return sportIconFor(profile.avatar_type);
    const url = avatarUrlForMessage(profile);
    if (url) {
      const team = profile?.avatar_type === "team" ? (profile.avatar_team || profile.favorite_team || "") : "";
      const fallbackText = team ? teamInitials(team) : fallback;
      return `<img src="${url}" alt="" onerror="this.parentElement.textContent='${fallbackText}';this.remove()">`;
    }
    return fallback;
  }

  function sportIconFor(type) {
    if (identityRegistry.sportIconFor) return identityRegistry.sportIconFor(type);
    const choices = {
      "sport:soccer": "⚽",
      "sport:rugby": "🏉",
      "sport:aussie-rules": "🏉",
      "sport:basketball": "🏀",
      "sport:baseball": "⚾",
      "sport:tennis": "🎾",
      "sport:cricket": "🏏",
      "sport:hockey": "🏒",
    };
    return choices[type] || "🏟️";
  }

  function initials(name) {
    return String(name || "Fan").slice(0, 2).toUpperCase();
  }

  function teamLogoPath(team) {
    const sharedLogo = identityRegistry.logoForTeam?.(team);
    if (sharedLogo) return sharedLogo;
    const logoOverrides = {
      "ACT Brumbies": "assets/logos/super-rugby-brumbies.png",
      "Fijian Drua": "assets/logos/super-rugby-fijian-drua.jpg",
      "North Melbourne": "assets/logos/afl-north-melbourne.png",
      "Western Force": "assets/logos/super-rugby-western-force.png",
    };
    if (logoOverrides[team]) return logoOverrides[team];
    const league = teamLeague(team);
    const prefix = { NRL: "nrl", AFL: "afl", "Super Rugby": "super-rugby", "FIFA World Cup": "wc" }[league] || "sports";
    const ext = league === "Super Rugby" ? "jpg" : "svg";
    return `assets/logos/${prefix}-${slugify(team)}.${ext}`;
  }

  function teamLeague(team) {
    const sharedLeague = identityRegistry.teamLeague?.(team);
    if (sharedLeague) return sharedLeague;
    const groups = {
      NRL: ["Broncos", "Bulldogs", "Cowboys", "Dolphins", "Dragons", "Eels", "Knights", "Panthers", "Rabbitohs", "Raiders", "Roosters", "Sea Eagles", "Sharks", "Storm", "Titans", "Warriors", "Wests Tigers"],
      AFL: ["Adelaide Crows", "Brisbane Lions", "Carlton", "Collingwood", "Essendon", "Fremantle", "Geelong Cats", "Gold Coast Suns", "GWS Giants", "Hawthorn", "Melbourne", "North Melbourne", "Port Adelaide", "Richmond", "St Kilda", "Sydney Swans", "West Coast Eagles", "Western Bulldogs"],
      "Super Rugby": ["ACT Brumbies", "Blues", "Chiefs", "Crusaders", "Fijian Drua", "Highlanders", "Hurricanes", "Moana Pasifika", "NSW Waratahs", "Queensland Reds", "Western Force"],
    };
    return Object.entries(groups).find(([, teams]) => teams.includes(team))?.[0] || "";
  }

  function slugify(value) {
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

  function teamIconHtml(team, league = "", className = "chat-team-logo") {
    if (identityRegistry.iconHtmlForTeam) return identityRegistry.iconHtmlForTeam(team, league, { className });
    const logo = teamLogoPath(team);
    return `<span class="${className}"><img src="${logo}" alt="" onerror="this.parentElement.textContent='${teamInitials(team)}';this.remove()"></span>`;
  }

  function scoreText(item, side) {
    const score = item[`${side}Score`];
    const goals = item[`${side}Goals`];
    const behinds = item[`${side}Behinds`];
    if (item.league === "AFL" && Number.isFinite(goals) && Number.isFinite(behinds)) return `${goals}-${behinds} ${score}`;
    return String(score);
  }

})();
