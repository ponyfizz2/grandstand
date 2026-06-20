/**
 * BUILD: identity-registry-v20
 *
 * Shared team, country, logo and avatar helpers.
 */
(function () {
  "use strict";

  window.gs = window.gs || {};

  const allCompetitions = [
    { id: "NRL", label: "NRL", color: "#147a5a", sub: "Rugby League", region: "AU/NZ", sport: "Rugby League", status: "available" },
    { id: "AFL", label: "AFL", color: "#c73d32", sub: "Aussie Rules", region: "AU/NZ", sport: "Aussie Rules", status: "available" },
    { id: "Super Rugby", label: "Super Rugby", color: "#2168a7", sub: "Rugby Union", region: "AU/NZ", sport: "Rugby Union", status: "available" },
    { id: "FIFA World Cup", label: "World Cup", color: "#d49a22", sub: "Football", region: "Global", sport: "Football", status: "available" },
    { id: "NFL", label: "NFL", color: "#244b7a", sub: "American Football", region: "US", sport: "Gridiron", status: "available" },
    { id: "NBA", label: "NBA", color: "#1d5da8", sub: "Basketball", region: "US", sport: "Basketball", status: "available" },
    { id: "MLB", label: "MLB", color: "#236192", sub: "Baseball", region: "US", sport: "Baseball", status: "available" },
    { id: "NHL", label: "NHL", color: "#2f3a45", sub: "Ice Hockey", region: "US", sport: "Hockey", status: "available" },
    { id: "MLS", label: "MLS", color: "#315c50", sub: "Football", region: "US", sport: "Football", status: "available" },
  ];

  const competitionCatalog = [
    ...allCompetitions,
    { id: "NCAA Football", label: "NCAA Football", color: "#7a4b1d", sub: "College football", region: "US", sport: "Gridiron", status: "recommended" },
    { id: "NCAA Basketball", label: "NCAA Basketball", color: "#6a4ea3", sub: "College basketball", region: "US", sport: "Basketball", status: "recommended" },
    { id: "WNBA", label: "WNBA", color: "#e05a26", sub: "Basketball", region: "US", sport: "Basketball", status: "recommended" },
    { id: "NWSL", label: "NWSL", color: "#7b1b4d", sub: "Football", region: "US", sport: "Football", status: "recommended" },
    { id: "Premier League", label: "Premier League", color: "#5b1f7a", sub: "Football", region: "Europe", sport: "Football", status: "recommended" },
    { id: "UEFA Champions League", label: "Champions League", color: "#2446a8", sub: "Football", region: "Europe", sport: "Football", status: "recommended" },
    { id: "UEFA Europa League", label: "Europa League", color: "#d8731f", sub: "Football", region: "Europe", sport: "Football", status: "recommended" },
    { id: "La Liga", label: "La Liga", color: "#e44732", sub: "Football", region: "Europe", sport: "Football", status: "recommended" },
    { id: "Serie A", label: "Serie A", color: "#2b68d8", sub: "Football", region: "Europe", sport: "Football", status: "recommended" },
    { id: "Bundesliga", label: "Bundesliga", color: "#d82020", sub: "Football", region: "Europe", sport: "Football", status: "recommended" },
    { id: "Ligue 1", label: "Ligue 1", color: "#2f716a", sub: "Football", region: "Europe", sport: "Football", status: "recommended" },
    { id: "Scottish Premiership", label: "Scottish Premiership", color: "#1f6baa", sub: "Football", region: "Europe", sport: "Football", status: "recommended" },
    { id: "EFL Championship", label: "EFL Championship", color: "#366bb0", sub: "Football", region: "Europe", sport: "Football", status: "recommended" },
    { id: "Formula 1", label: "Formula 1", color: "#e10600", sub: "Motorsport", region: "Global", sport: "Racing", status: "recommended" },
    { id: "UFC", label: "UFC", color: "#8f1e1e", sub: "Combat sports", region: "Global", sport: "Combat", status: "recommended" },
    { id: "Cricket Internationals", label: "Cricket Internationals", color: "#2c7a4b", sub: "Cricket", region: "Global", sport: "Cricket", status: "recommended" },
    { id: "IPL", label: "IPL", color: "#2754a5", sub: "Cricket", region: "Global", sport: "Cricket", status: "recommended" },
    { id: "BBL", label: "BBL", color: "#2f8ccf", sub: "Cricket", region: "AU/NZ", sport: "Cricket", status: "recommended" },
    { id: "Tennis Grand Slams", label: "Tennis Grand Slams", color: "#4f8b3f", sub: "Tennis", region: "Global", sport: "Tennis", status: "recommended" },
    { id: "Golf Majors", label: "Golf Majors", color: "#297a4a", sub: "Golf", region: "Global", sport: "Golf", status: "recommended" },
    { id: "Six Nations", label: "Six Nations", color: "#1d6a8f", sub: "Rugby Union", region: "Europe", sport: "Rugby Union", status: "recommended" },
    { id: "Top 14", label: "Top 14", color: "#234f8d", sub: "Rugby Union", region: "Europe", sport: "Rugby Union", status: "recommended" },
    { id: "Premiership Rugby", label: "Premiership Rugby", color: "#1d5f42", sub: "Rugby Union", region: "Europe", sport: "Rugby Union", status: "recommended" },
    { id: "URC", label: "URC", color: "#5a3a8d", sub: "Rugby Union", region: "Europe", sport: "Rugby Union", status: "recommended" },
  ];

  const leagueTeams = {
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

  const teamCodeColorMap = {
    "Sea Eagles": ["MAN", "#6a1a32", "#f0c9d5"],
    Rabbitohs: ["SOU", "#006b3f", "#d71920"],
    Storm: ["MEL", "#4b207f", "#f4c542"],
    Knights: ["NEW", "#0054a6", "#e2231a"],
    Raiders: ["CBR", "#83c341", "#0b2d20"],
    Roosters: ["SYD", "#00305e", "#d71920"],
    Cowboys: ["NQL", "#0b315e", "#f5c242"],
    Dolphins: ["DOL", "#d71920", "#ffcf33"],
    Broncos: ["BRI", "#760135", "#f3b229"],
    Titans: ["GLD", "#00a3e0", "#f6c344"],
    "Wests Tigers": ["WST", "#f58220", "#111111"],
    Panthers: ["PEN", "#111111", "#00a94f"],
    Sharks: ["CRO", "#00a9e0", "#111111"],
    Dragons: ["STI", "#d71920", "#ffffff"],
    Bulldogs: ["CBY", "#0046ad", "#ffffff"],
    Eels: ["PAR", "#ffd200", "#005eb8"],
    Warriors: ["WAR", "#111111", "#00a3e0"],
    "Adelaide Crows": ["ADE", "#002b5c", "#f5c400"],
    "Geelong Cats": ["GEE", "#002b5c", "#ffffff"],
    Hawthorn: ["HAW", "#4b2e1f", "#f6c344"],
    "Western Bulldogs": ["WBD", "#0057b8", "#d71920"],
    "North Melbourne": ["NM", "#0057b8", "#ffffff"],
    Fremantle: ["FRE", "#2a0a5e", "#ffffff"],
    "Gold Coast Suns": ["GCS", "#e31b23", "#f5c400"],
    "Brisbane Lions": ["BRL", "#7a003c", "#f5c400"],
    "West Coast Eagles": ["WCE", "#003087", "#f5c400"],
    "Port Adelaide": ["PA", "#00a3ad", "#111111"],
    "Sydney Swans": ["SYD", "#d71920", "#ffffff"],
    "St Kilda": ["STK", "#d71920", "#111111"],
    Essendon: ["ESS", "#111111", "#d71920"],
    Carlton: ["CAR", "#031a3d", "#ffffff"],
    Collingwood: ["COL", "#111111", "#ffffff"],
    Melbourne: ["MEL", "#061a40", "#d71920"],
    Richmond: ["RIC", "#111111", "#ffd200"],
    "GWS Giants": ["GWS", "#f58220", "#38424a"],
    Hurricanes: ["HUR", "#ffd200", "#111111"],
    "ACT Brumbies": ["BRU", "#003f7d", "#f5c400"],
    Crusaders: ["CRU", "#d71920", "#111111"],
    Blues: ["BLU", "#005eb8", "#7cc7ff"],
    Chiefs: ["CHI", "#111111", "#d71920"],
    "Queensland Reds": ["RED", "#7a0026", "#ffffff"],
    Highlanders: ["HIG", "#153e7e", "#f0c84b"],
    "Fijian Drua": ["DRU", "#4aa3df", "#111111"],
    "Moana Pasifika": ["MOA", "#0f7c83", "#f2b84b"],
    "NSW Waratahs": ["WAR", "#67aeea", "#111111"],
    "Western Force": ["FOR", "#112b5f", "#f5c542"],
  };

  const teamAliases = {
    "Manly-Warringah Sea Eagles": "Sea Eagles",
    "South Sydney Rabbitohs": "Rabbitohs",
    "Melbourne Storm": "Storm",
    "Newcastle Knights": "Knights",
    "Canberra Raiders": "Raiders",
    "Sydney Roosters": "Roosters",
    "North Queensland Cowboys": "Cowboys",
    "Brisbane Broncos": "Broncos",
    "Gold Coast Titans": "Titans",
    "Penrith Panthers": "Panthers",
    "Cronulla Sharks": "Sharks",
    "St. George Illawara Dragons": "Dragons",
    "St George Illawarra Dragons": "Dragons",
    "Canterbury Bankstown Bulldogs": "Bulldogs",
    "Parramatta Eels": "Eels",
    "New Zealand Warriors": "Warriors",
    "Adelaide Football Club": "Adelaide Crows",
    "Geelong Football Club": "Geelong Cats",
    Geelong: "Geelong Cats",
    "Hawthorn Football Club": "Hawthorn",
    "Western Bulldogs Football Club": "Western Bulldogs",
    "North Melbourne Football Club": "North Melbourne",
    "Fremantle Football Club": "Fremantle",
    "Gold Coast Football Club": "Gold Coast Suns",
    "Gold Coast SUNS": "Gold Coast Suns",
    "Port Adelaide Football Club": "Port Adelaide",
    "St Kilda Football Club": "St Kilda",
    "Essendon Football Club": "Essendon",
    "Carlton Football Club": "Carlton",
    "Collingwood Football Club": "Collingwood",
    "Melbourne Football Club": "Melbourne",
    "Richmond Football Club": "Richmond",
    "Greater Western Sydney Giants": "GWS Giants",
    "GWS GIANTS": "GWS Giants",
    Brumbies: "ACT Brumbies",
    "New South Wales Waratahs": "NSW Waratahs",
    Reds: "Queensland Reds",
    USA: "United States",
    "United States of America": "United States",
    USMNT: "United States",
    Netherlands: "Netherlands",
  };

  const localLogoOverrides = {
    Rabbitohs: "assets/logos/nrl-rabbitohs.svg",
    Storm: "assets/logos/nrl-storm.svg",
    Cowboys: "assets/logos/nrl-cowboys.svg",
    "Sea Eagles": "assets/logos/nrl-sea-eagles.svg",
    Sharks: "assets/logos/nrl-sharks.svg",
    Fremantle: "assets/logos/afl-fremantle.svg",
    "GWS Giants": "assets/logos/afl-gws-giants.svg",
    "Port Adelaide": "assets/logos/afl-port-adelaide.svg",
    Blues: "assets/logos/super-rugby-blues.jpg",
    Chiefs: "assets/logos/super-rugby-chiefs.jpg",
    "Fijian Drua": "assets/logos/super-rugby-fijian-drua.jpg",
  };

  const countryCodesByName = {
    Argentina: "AR", Australia: "AU", Austria: "AT", Belgium: "BE", Brazil: "BR", Canada: "CA",
    Algeria: "DZ", "Cape Verde": "CV", Chile: "CL", Colombia: "CO", Croatia: "HR", Curacao: "CW",
    Czechia: "CZ", "Czech Republic": "CZ", Denmark: "DK", Ecuador: "EC", Egypt: "EG",
    England: "GB-ENG", France: "FR", Germany: "DE", Ghana: "GH", Haiti: "HT", Iran: "IR",
    Italy: "IT", Japan: "JP", Jordan: "JO",
    Mexico: "MX", Morocco: "MA", Netherlands: "NL", "New Zealand": "NZ", Nigeria: "NG",
    Norway: "NO", Panama: "PA", Portugal: "PT", Qatar: "QA", Scotland: "GB-SCT",
    "South Africa": "ZA", Spain: "ES", Sweden: "SE",
    Switzerland: "CH", Tunisia: "TN", "United States": "US", Uruguay: "UY", Wales: "GB-WLS",
    "Ivory Coast": "CI", "Cote d'Ivoire": "CI", "Costa Rica": "CR", "South Korea": "KR",
    "Saudi Arabia": "SA", Poland: "PL", Senegal: "SN", Cameroon: "CM", Serbia: "RS",
    Slovakia: "SK", Slovenia: "SI", Turkey: "TR", Ukraine: "UA", Uzbekistan: "UZ",
    Paraguay: "PY", Peru: "PE",
  };

  const countryCodesByAbbreviation = {
    ALG: "DZ", ARG: "AR", AUS: "AU", AUT: "AT", BEL: "BE", BRA: "BR", CAN: "CA",
    CPV: "CV", CHI: "CL", COL: "CO", CRC: "CR", CRO: "HR", CUR: "CW", CZE: "CZ",
    DEN: "DK", ECU: "EC", EGY: "EG", ENG: "GB-ENG", FRA: "FR", GER: "DE", GHA: "GH",
    HAI: "HT", IRN: "IR", ITA: "IT", CIV: "CI", JPN: "JP", JOR: "JO", KOR: "KR",
    MEX: "MX", MAR: "MA", NED: "NL",
    NZL: "NZ", NGA: "NG", NOR: "NO", POL: "PL", POR: "PT", QAT: "QA", KSA: "SA", SCO: "GB-SCT",
    SEN: "SN", SRB: "RS", RSA: "ZA", ESP: "ES", SWE: "SE", SUI: "CH", TUN: "TN",
    USA: "US", URU: "UY", UZB: "UZ", WAL: "GB-WLS", UKR: "UA", PAN: "PA", PAR: "PY", PER: "PE",
  };

  const sportIconChoices = [
    { id: "sport:soccer", label: "Football", icon: "⚽" },
    { id: "sport:rugby", label: "Rugby", icon: "🏉" },
    { id: "sport:aussie-rules", label: "Aussie Rules", icon: "🏉" },
    { id: "sport:basketball", label: "Basketball", icon: "🏀" },
    { id: "sport:baseball", label: "Baseball", icon: "⚾" },
    { id: "sport:tennis", label: "Tennis", icon: "🎾" },
    { id: "sport:cricket", label: "Cricket", icon: "🏏" },
    { id: "sport:hockey", label: "Hockey", icon: "🏒" },
    { id: "sport:american-football", label: "Gridiron", icon: "🏈" },
    { id: "sport:golf", label: "Golf", icon: "⛳" },
    { id: "sport:racing", label: "Racing", icon: "🏁" },
  ];

  const discoveredTeams = new Map();
  const teamRegistry = new Map();

  Object.entries(leagueTeams).forEach(([competition, names]) => {
    names.forEach((name) => {
      const code = countryCodesByName[name] || "";
      teamRegistry.set(name, {
        id: slugifyId(name),
        display_name: name,
        short_name: teamCode(name),
        competition,
        country_code: code,
        flag_emoji: code ? flatFlagUrl(code) : "",
        logo_url: localLogoOverrides[name] || "",
        espn_team_id: "",
      });
    });
  });

  function normalizeTeamName(name) {
    return teamAliases[name] || name;
  }

  function rememberTeam(inputName, details = {}) {
    const name = normalizeTeamName(inputName);
    if (!name) return;
    const current = discoveredTeams.get(name) || {};
    const logo = details.logo || details.logoUrl || current.logo || "";
    const abbreviation = details.abbreviation || details.code || current.abbreviation || "";
    const league = details.league || current.league || teamLeague(name);
    discoveredTeams.set(name, { ...current, ...details, name, league, logo, abbreviation });
    const existing = teamRegistry.get(name) || {};
    const rawCountryCode = details.country_code || existing.country_code || countryCodesByName[name] || "";
    const countryCode = countryCodesByAbbreviation[String(rawCountryCode).toUpperCase()] || rawCountryCode;
    teamRegistry.set(name, {
      id: existing.id || slugifyId(name),
      display_name: name,
      short_name: details.short_name || existing.short_name || abbreviation || teamCode(name),
      competition: league,
      country_code: countryCode,
      flag_emoji: countryCode ? flatFlagUrl(countryCode) : existing.flag_emoji || "",
      logo_url: logo || existing.logo_url || "",
      espn_team_id: details.espn_team_id || details.id || existing.espn_team_id || "",
    });
    if (league && !leagueTeams[league]?.includes(name)) {
      leagueTeams[league] = [...(leagueTeams[league] || []), name].sort((a, b) => a.localeCompare(b));
    }
  }

  function rememberCompetitor(competitor, league) {
    const team = competitor?.team || {};
    const name = normalizeTeamName(team.displayName || team.name || team.shortDisplayName || "");
    const logos = Array.isArray(team.logos) ? team.logos : [];
    const logo = team.logo || logos[0]?.href || "";
    rememberTeam(name, {
      league,
      logo,
      abbreviation: team.abbreviation || competitor?.curatedRank?.current || "",
      country_code: team.countryCode || team.country?.code || team.country?.abbreviation || "",
      espn_team_id: team.id || "",
    });
    return name;
  }

  function teamLeague(team) {
    return Object.entries(leagueTeams).find(([, names]) => names.includes(team))?.[0] || discoveredTeams.get(team)?.league || "";
  }

  function teamRecord(team) {
    const normalized = normalizeTeamName(team);
    return teamRegistry.get(normalized) || {
      id: slugifyId(normalized),
      display_name: normalized,
      short_name: teamCode(normalized),
      competition: teamLeague(normalized),
      country_code: countryCodesByName[normalized] || "",
      flag_emoji: flatFlagUrl(countryCodesByName[normalized] || ""),
      logo_url: logoForTeam(normalized),
      espn_team_id: "",
    };
  }

  function isCountry(name, league = "") {
    return league === "FIFA World Cup" || Boolean(countryCodesByName[name]);
  }

  function flagForTeam(name, abbreviation = "") {
    const discovered = discoveredTeams.get(name);
    const code = discovered?.country_code ||
      countryCodesByName[name] ||
      countryCodesByAbbreviation[abbreviation] ||
      countryCodesByAbbreviation[discovered?.abbreviation] ||
      "";
    return flatFlagUrl(code);
  }

  function flatFlagUrl(code) {
    const normalized = String(code || "").trim().toLowerCase();
    return normalized ? `https://flagcdn.com/${normalized}.svg` : "";
  }

  function logoForTeam(name, league = "") {
    if (!name) return "";
    const normalized = normalizeTeamName(name);
    if (localLogoOverrides[normalized]) return localLogoOverrides[normalized];
    const discovered = discoveredTeams.get(normalized);
    if (discovered?.logo) return discovered.logo;
    return "";
  }

  function iconHtmlForTeam(name, league = "", options = {}) {
    const normalized = normalizeTeamName(name);
    const code = options.code || teamCode(normalized);
    if (!normalized || normalized.includes("TBC")) {
      return `<span class="${options.className || "strip-logo"}" data-code="TBC" aria-label="Team TBC"></span>`;
    }
    const flag = isCountry(normalized, league) ? flagForTeam(normalized, options.abbreviation) : "";
    if (flag) {
      return `<span class="${options.className || "strip-logo"} team-flag" aria-label="${escapeHtml(normalized)} flag"><img src="${escapeAttr(flag)}" alt="${escapeAttr(normalized)} flag" loading="lazy" onerror="this.parentElement.dataset.code='${escapeAttr(code)}';this.parentElement.classList.remove('team-flag');this.parentElement.classList.add('generated-team-badge');this.remove()"></span>`;
    }
    const logo = logoForTeam(normalized, league);
    if (logo) {
      return `<span class="${options.className || "strip-logo"}" aria-label="${escapeHtml(normalized)} logo" style="--team-primary:${teamColor(normalized, 1)};--team-secondary:${teamColor(normalized, 2)}"><img src="${escapeAttr(logo)}" alt="${escapeAttr(normalized)} logo" loading="lazy" onerror="this.parentElement.dataset.code='${escapeAttr(code)}';this.parentElement.classList.add('generated-team-badge');this.remove()"></span>`;
    }
    return badgeHtml(normalized, options.className || "strip-logo", code);
  }

  function badgeElement(name, className = "strip-logo") {
    const wrap = document.createElement("span");
    wrap.className = `${className} generated-team-badge`;
    wrap.dataset.code = teamCode(name);
    wrap.style.setProperty("--team-primary", teamColor(name, 1));
    wrap.style.setProperty("--team-secondary", teamColor(name, 2));
    return wrap;
  }

  function badgeHtml(name, className = "strip-logo", code = "") {
    return `<span class="${className} generated-team-badge" data-code="${escapeAttr(code || teamCode(name))}" style="--team-primary:${teamColor(name, 1)};--team-secondary:${teamColor(name, 2)}" aria-label="${escapeAttr(name)} badge"></span>`;
  }

  function avatarHtmlForProfile(profile, fallback = "?") {
    if (profile?.avatar_type?.startsWith("sport:")) return sportIconFor(profile.avatar_type);
    if (profile?.avatar_type === "team" && (profile.avatar_team || profile.favorite_team)) {
      const team = profile.avatar_team || profile.favorite_team;
      const flag = flagForTeam(team);
      const logo = logoForTeam(team);
      const code = teamCode(team);
      if (flag) return `<img class="flat-flag-avatar" src="${escapeAttr(flag)}" alt="${escapeAttr(team)} flag">`;
      if (logo) return `<img src="${escapeAttr(logo)}" alt="${escapeAttr(team)}" onerror="this.parentElement.dataset.code='${escapeAttr(code)}';this.parentElement.classList.add('generated-team-badge');this.remove()">`;
      return code;
    }
    const avatarUrl = profile?.avatar_url || "";
    if (avatarUrl) {
      return `<img src="${escapeAttr(avatarUrl)}" alt="${escapeAttr(fallback)}" onerror="this.parentElement.textContent='${escapeAttr(fallback)}';this.remove()">`;
    }
    return fallback;
  }

  function sportIconFor(type) {
    return sportIconChoices.find((choice) => choice.id === type)?.icon || "🏟️";
  }

  function teamCode(team) {
    return teamCodeColorMap[team]?.[0] || teamInitials(team);
  }

  function teamColor(team, index) {
    return teamCodeColorMap[team]?.[index] || (index === 1 ? "#1e4a7c" : "#85b7ff");
  }

  function teamInitials(team) {
    return String(team || "Team")
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();
  }

  function slugifyId(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  window.gs.identity = {
    build: "identity-registry-v20",
    allCompetitions,
    competitionCatalog,
    leagueTeams,
    teamRegistry,
    teamCodeColorMap,
    teamAliases,
    sportIconChoices,
    normalizeTeamName,
    rememberTeam,
    rememberCompetitor,
    teamLeague,
    teamRecord,
    flagForTeam,
    logoForTeam,
    iconHtmlForTeam,
    avatarHtmlForProfile,
    badgeElement,
    sportIconFor,
    teamInitials,
  };
})();
