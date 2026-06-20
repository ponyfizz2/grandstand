/**
 * Grandstand — Main App Script
 * Fixtures, results, tables, live scores, filtering, theme, timezone.
 * Refactored from Footy Watch with FIFA World Cup, dynamic competitions,
 * proper Intl timezone handling, and live chat integration.
 */

"use strict";

// ── League colours ────────────────────────────────────────────
const leagues = {
  NRL: { color: "#147a5a" },
  AFL: { color: "#c73d32" },
  "Super Rugby": { color: "#2168a7" },
  "FIFA World Cup": { color: "#d49a22" },
  NFL: { color: "#244b7a" },
  NBA: { color: "#1d5da8" },
  MLB: { color: "#236192" },
  NHL: { color: "#2f3a45" },
  MLS: { color: "#315c50" },
};

// ── ESPN API configs (static + dynamic) ──────────────────────
// Static competitions — always available
const staticEspnConfigs = {
  NRL: {
    scoreboard: "https://site.api.espn.com/apis/site/v2/sports/rugby-league/3/scoreboard",
    standings: "https://site.web.api.espn.com/apis/v2/sports/rugby-league/3/standings?region=us&lang=en&contentorigin=espn&season=2026",
    finals: { qualifying: 8, protected: 4, protectedLabel: "Top 4", qualifyingLabel: "Finals" },
  },
  AFL: {
    scoreboard: "https://site.api.espn.com/apis/site/v2/sports/australian-football/afl/scoreboard",
    standings: "https://site.web.api.espn.com/apis/v2/sports/australian-football/afl/standings?region=us&lang=en&contentorigin=espn&season=2026",
    finals: { qualifying: 10, protected: 4, protectedLabel: "Top 4", qualifyingLabel: "Finals" },
  },
  "Super Rugby": {
    scoreboard: "https://site.api.espn.com/apis/site/v2/sports/rugby/242041/scoreboard",
    standings: "https://site.web.api.espn.com/apis/v2/sports/rugby/242041/standings?region=us&lang=en&contentorigin=espn&season=2026",
    finals: { qualifying: 6, protected: 6, protectedLabel: "Finals", qualifyingLabel: "Finals" },
  },
  "FIFA World Cup": {
    scoreboard: "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard",
    standings: "https://site.web.api.espn.com/apis/v2/sports/soccer/fifa.world/standings?region=us&lang=en&contentorigin=espn&season=2026",
    finals: { qualifying: 8, protected: 4, protectedLabel: "Knockouts", qualifyingLabel: "Qualified" },
    isKnockout: true,
  },
  NFL: {
    scoreboard: "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
    standings: "https://site.web.api.espn.com/apis/v2/sports/football/nfl/standings?region=us&lang=en&contentorigin=espn&season=2026",
    finals: { qualifying: 7, protected: 1, protectedLabel: "First-round bye", qualifyingLabel: "Playoffs" },
    fixtureEnd: "20270215",
  },
  NBA: {
    scoreboard: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
    standings: "https://site.web.api.espn.com/apis/v2/sports/basketball/nba/standings?region=us&lang=en&contentorigin=espn&season=2026",
    finals: { qualifying: 10, protected: 6, protectedLabel: "Playoffs", qualifyingLabel: "Play-in" },
    fixtureEnd: "20270630",
  },
  MLB: {
    scoreboard: "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard",
    standings: "https://site.web.api.espn.com/apis/v2/sports/baseball/mlb/standings?region=us&lang=en&contentorigin=espn&season=2026",
    finals: { qualifying: 6, protected: 2, protectedLabel: "First-round bye", qualifyingLabel: "Playoffs" },
    fixtureEnd: "20261115",
  },
  NHL: {
    scoreboard: "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard",
    standings: "https://site.web.api.espn.com/apis/v2/sports/hockey/nhl/standings?region=us&lang=en&contentorigin=espn&season=2026",
    finals: { qualifying: 8, protected: 3, protectedLabel: "Division place", qualifyingLabel: "Playoff race" },
    fixtureEnd: "20270630",
  },
  MLS: {
    scoreboard: "https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard",
    standings: "https://site.web.api.espn.com/apis/v2/sports/soccer/usa.1/standings?region=us&lang=en&contentorigin=espn&season=2026",
    finals: { qualifying: 9, protected: 7, protectedLabel: "Playoffs", qualifyingLabel: "Wild card" },
    fixtureEnd: "20261215",
  },
};

// Dynamic competitions loaded from admin-registered slugs (via Supabase or Netlify DB)
// These are merged into espnConfigs at runtime
let dynamicCompetitions = {};

// Active config = static + dynamic
let espnConfigs = { ...staticEspnConfigs };

// ── Display timezone options ──────────────────────────────────
const TIME_ZONE_ALIASES = {
  NZ: "Pacific/Auckland",
  AEST: "Australia/Sydney",
};

const FALLBACK_TIME_ZONE = "Pacific/Auckland";
const FEATURED_TIME_ZONES = [
  "Pacific/Auckland",
  "Australia/Sydney",
  "Australia/Perth",
  "Pacific/Fiji",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "UTC",
];

// ── Team data ─────────────────────────────────────────────────
const teams = {
  // NRL
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
  // AFL
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
  // Super Rugby
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

const leagueTeams = window.gs?.identity?.leagueTeams || {
  NRL: ["Broncos", "Bulldogs", "Cowboys", "Dolphins", "Dragons", "Eels", "Knights", "Panthers", "Rabbitohs", "Raiders", "Roosters", "Sea Eagles", "Sharks", "Storm", "Titans", "Warriors", "Wests Tigers"],
  AFL: ["Adelaide Crows", "Brisbane Lions", "Carlton", "Collingwood", "Essendon", "Fremantle", "Geelong Cats", "Gold Coast Suns", "GWS Giants", "Hawthorn", "Melbourne", "North Melbourne", "Port Adelaide", "Richmond", "St Kilda", "Sydney Swans", "West Coast Eagles", "Western Bulldogs"],
  "Super Rugby": ["ACT Brumbies", "Blues", "Chiefs", "Crusaders", "Fijian Drua", "Highlanders", "Hurricanes", "Moana Pasifika", "NSW Waratahs", "Queensland Reds", "Western Force"],
  "FIFA World Cup": [], // populated from ESPN API
  NFL: [],
  NBA: [],
  MLB: [],
  NHL: [],
  MLS: [],
};

const logoOverrides = {
  "ACT Brumbies": "assets/logos/super-rugby-brumbies.png",
  "Fijian Drua": "assets/logos/super-rugby-fijian-drua.png",
  "North Melbourne": "assets/logos/afl-north-melbourne.png",
  "Western Force": "assets/logos/super-rugby-western-force.png",
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
};

// ── Static last meetings ──────────────────────────────────────
const lastMeetings = {
  "Sea Eagles|Rabbitohs": { date: "2025-07-06", home: "Sea Eagles", away: "Rabbitohs", homeScore: 30, awayScore: 12 },
  "Storm|Knights": { date: "2025-07-12", home: "Knights", away: "Storm", homeScore: 14, awayScore: 32 },
  "Raiders|Roosters": { date: "2025-06-01", home: "Roosters", away: "Raiders", homeScore: 24, awayScore: 26 },
  "Cowboys|Dolphins": { date: "2025-07-17", home: "Dolphins", away: "Cowboys", homeScore: 43, awayScore: 24 },
  "Broncos|Titans": { date: "2026-04-04", home: "Titans", away: "Broncos", homeScore: 12, awayScore: 26 },
  "Wests Tigers|Panthers": { date: "2025-07-26", home: "Panthers", away: "Wests Tigers", homeScore: 36, awayScore: 2 },
  "Sharks|Dragons": { date: "2025-08-09", home: "Dragons", away: "Sharks", homeScore: 22, awayScore: 14 },
  "Bulldogs|Eels": { date: "2026-04-19", home: "Eels", away: "Bulldogs", homeScore: 38, awayScore: 20 },
  "Rabbitohs|Broncos": { date: "2025-08-01", home: "Broncos", away: "Rabbitohs", homeScore: 60, awayScore: 14 },
  "Dolphins|Roosters": { date: "2025-08-09", home: "Dolphins", away: "Roosters", homeScore: 12, awayScore: 64 },
  "Warriors|Sharks": { date: "2026-04-05", home: "Sharks", away: "Warriors", homeScore: 36, awayScore: 22 },
  "Eels|Raiders": { date: "2025-07-19", home: "Raiders", away: "Eels", homeScore: 40, awayScore: 16 },
  "Wests Tigers|Titans": { date: "2025-09-06", home: "Titans", away: "Wests Tigers", homeScore: 36, awayScore: 28 },
  "Knights|Dragons": { date: "2026-05-09", home: "Dragons", away: "Knights", homeScore: 10, awayScore: 44 },
  "Wests Tigers|Dolphins": { date: "2025-03-22", home: "Dolphins", away: "Wests Tigers", homeScore: 18, awayScore: 30 },
  "Titans|Panthers": { date: "2025-08-02", home: "Titans", away: "Panthers", homeScore: 26, awayScore: 30 },
  "Bulldogs|Sea Eagles": { date: "2025-07-27", home: "Bulldogs", away: "Sea Eagles", homeScore: 42, awayScore: 4 },
  "Warriors|Cowboys": { date: "2025-05-03", home: "Warriors", away: "Cowboys", homeScore: 30, awayScore: 26 },
  "Storm|Raiders": { date: "2026-04-17", home: "Raiders", away: "Storm", homeScore: 26, awayScore: 22 },
  "Roosters|Sharks": { date: "2026-04-11", home: "Sharks", away: "Roosters", homeScore: 22, awayScore: 34 },
  "Adelaide Crows|Geelong Cats": { date: "2026-03-26", home: "Geelong Cats", away: "Adelaide Crows", homeScore: 68, awayScore: 60 },
  "Hawthorn|Western Bulldogs": { date: "2026-04-11", home: "Hawthorn", away: "Western Bulldogs", homeScore: 104, awayScore: 64 },
  "North Melbourne|Fremantle": { date: "2025-06-14", home: "North Melbourne", away: "Fremantle", homeScore: 67, awayScore: 73 },
  "Gold Coast Suns|Brisbane Lions": { date: "2026-02-26", home: "Brisbane Lions", away: "Gold Coast Suns", homeScore: 126, awayScore: 101 },
  "West Coast Eagles|Port Adelaide": { date: "2026-03-29", home: "Port Adelaide", away: "West Coast Eagles", homeScore: 90, awayScore: 92 },
  "Sydney Swans|St Kilda": { date: "2025-07-13", home: "St Kilda", away: "Sydney Swans", homeScore: 87, awayScore: 92 },
  "Essendon|Carlton": { date: "2025-08-21", home: "Essendon", away: "Carlton", homeScore: 56, awayScore: 90 },
  "Collingwood|Melbourne": { date: "2025-08-22", home: "Collingwood", away: "Melbourne", homeScore: 82, awayScore: 76 },
  "Western Bulldogs|Adelaide Crows": { date: "2026-03-20", home: "Adelaide Crows", away: "Western Bulldogs", homeScore: 88, awayScore: 94 },
  "Geelong Cats|Gold Coast Suns": { date: "2026-03-06", home: "Gold Coast Suns", away: "Geelong Cats", homeScore: 125, awayScore: 69 },
  "Melbourne|Essendon": { date: "2026-04-11", home: "Essendon", away: "Melbourne", homeScore: 113, awayScore: 68 },
  "North Melbourne|West Coast Eagles": { date: "2026-03-22", home: "West Coast Eagles", away: "North Melbourne", homeScore: 111, awayScore: 94 },
  "Port Adelaide|Sydney Swans": { date: "2025-06-21", home: "Port Adelaide", away: "Sydney Swans", homeScore: 52, awayScore: 71 },
  "Richmond|Brisbane Lions": { date: "2025-04-05", home: "Richmond", away: "Brisbane Lions", homeScore: 90, awayScore: 118 },
  "St Kilda|GWS Giants": { date: "2026-03-21", home: "GWS Giants", away: "St Kilda", homeScore: 74, awayScore: 78 },
  "Hurricanes|ACT Brumbies": { date: "2026-04-25", home: "Hurricanes", away: "ACT Brumbies", homeScore: 45, awayScore: 12 },
  "Crusaders|Blues": { date: "2026-05-08", home: "Crusaders", away: "Blues", homeScore: 36, awayScore: 20 },
  "Chiefs|Queensland Reds": { date: "2026-05-08", home: "Queensland Reds", away: "Chiefs", homeScore: 21, awayScore: 31 },
};

// ── Seed fixtures ─────────────────────────────────────────────
const seasonYear = 2026;

const fixtures = [
  match("NRL", "Round 14", "2026-06-04T09:50:00Z", "Sea Eagles", "Rabbitohs", "4 Pines Park, Sydney"),
  match("NRL", "Round 14", "2026-06-05T08:00:00Z", "Storm", "Knights", "AAMI Park, Melbourne"),
  match("NRL", "Round 14", "2026-06-05T10:00:00Z", "Raiders", "Roosters", "GIO Stadium, Canberra"),
  match("NRL", "Round 14", "2026-06-06T07:30:00Z", "Cowboys", "Dolphins", "Queensland Country Bank Stadium, Townsville"),
  match("NRL", "Round 14", "2026-06-06T09:30:00Z", "Broncos", "Titans", "Suncorp Stadium, Brisbane"),
  match("NRL", "Round 14", "2026-06-07T04:00:00Z", "Wests Tigers", "Panthers", "CommBank Stadium, Parramatta"),
  match("NRL", "Round 14", "2026-06-07T06:05:00Z", "Sharks", "Dragons", "Sharks Stadium, Sydney"),
  match("NRL", "Round 14", "2026-06-08T06:05:00Z", "Bulldogs", "Eels", "Accor Stadium, Sydney"),
  match("NRL", "Round 15", "2026-06-11T09:50:00Z", "Rabbitohs", "Broncos", "Accor Stadium, Sydney"),
  match("NRL", "Round 15", "2026-06-12T10:00:00Z", "Dolphins", "Roosters", "Suncorp Stadium, Brisbane"),
  match("NRL", "Round 15", "2026-06-13T07:30:00Z", "Warriors", "Sharks", "Go Media Stadium, Auckland"),
  match("NRL", "Round 15", "2026-06-13T09:30:00Z", "Eels", "Raiders", "CommBank Stadium, Parramatta"),
  match("NRL", "Round 15", "2026-06-14T06:05:00Z", "Wests Tigers", "Titans", "Leichhardt Oval, Sydney"),
  match("NRL", "Round 16", "2026-06-19T10:00:00Z", "Knights", "Dragons", "McDonald Jones Stadium, Newcastle"),
  match("NRL", "Round 16", "2026-06-20T05:00:00Z", "Wests Tigers", "Dolphins", "Campbelltown Stadium, Sydney"),
  match("NRL", "Round 16", "2026-06-20T07:30:00Z", "Titans", "Panthers", "Cbus Super Stadium, Gold Coast"),
  match("NRL", "Round 16", "2026-06-20T09:30:00Z", "Bulldogs", "Sea Eagles", "Accor Stadium, Sydney"),
  match("NRL", "Round 16", "2026-06-21T04:00:00Z", "Warriors", "Cowboys", "One NZ Stadium, Christchurch"),
  match("NRL", "Round 16", "2026-06-21T06:05:00Z", "Storm", "Raiders", "AAMI Park, Melbourne"),
  match("NRL", "Round 16", "2026-06-21T08:15:00Z", "Roosters", "Sharks", "Allianz Stadium, Sydney"),

  match("AFL", "Round 13", "2026-06-04T09:30:00Z", "Adelaide Crows", "Geelong Cats", "Adelaide Oval"),
  match("AFL", "Round 13", "2026-06-05T09:40:00Z", "Hawthorn", "Western Bulldogs", "MCG"),
  match("AFL", "Round 13", "2026-06-06T04:15:00Z", "North Melbourne", "Fremantle", "Hands Oval, Bunbury"),
  match("AFL", "Round 13", "2026-06-06T07:15:00Z", "Gold Coast Suns", "Brisbane Lions", "People First Stadium, Gold Coast"),
  match("AFL", "Round 13", "2026-06-06T10:15:00Z", "West Coast Eagles", "Port Adelaide", "Optus Stadium, Perth"),
  match("AFL", "Round 13", "2026-06-07T05:15:00Z", "Sydney Swans", "St Kilda", "SCG"),
  match("AFL", "Round 13", "2026-06-07T09:20:00Z", "Essendon", "Carlton", "MCG"),
  match("AFL", "Round 13", "2026-06-08T05:15:00Z", "Collingwood", "Melbourne", "MCG"),
  match("AFL", "Round 14", "2026-06-11T09:30:00Z", "Western Bulldogs", "Adelaide Crows", "Marvel Stadium"),
  match("AFL", "Round 14", "2026-06-12T09:40:00Z", "Geelong Cats", "Gold Coast Suns", "GMHBA Stadium"),
  match("AFL", "Round 14", "2026-06-13T03:15:00Z", "Melbourne", "Essendon", "MCG"),
  match("AFL", "Round 14", "2026-06-13T06:15:00Z", "North Melbourne", "West Coast Eagles", "Optus Stadium, Perth"),
  match("AFL", "Round 14", "2026-06-13T09:35:00Z", "Port Adelaide", "Sydney Swans", "Adelaide Oval"),
  match("AFL", "Round 14", "2026-06-14T03:10:00Z", "Richmond", "Brisbane Lions", "Blundstone Arena, Hobart"),
  match("AFL", "Round 14", "2026-06-14T05:15:00Z", "St Kilda", "GWS Giants", "Marvel Stadium"),

  match("Super Rugby", "Qualifying Final", "2026-06-05T07:05:00Z", "Hurricanes", "ACT Brumbies", "Hnry Stadium, Wellington"),
  match("Super Rugby", "Qualifying Final", "2026-06-06T04:35:00Z", "Crusaders", "Blues", "One New Zealand Stadium, Christchurch"),
  match("Super Rugby", "Qualifying Final", "2026-06-06T07:05:00Z", "Chiefs", "Queensland Reds", "FMG Stadium Waikato, Hamilton"),
].sort((a, b) => a.date - b.date);

// ── App state ─────────────────────────────────────────────────
const state = {
  mode: "fixtures",
  competition: "all",
  window: "next",
  selectedTeam: "all",
  timeZone: normalizeTimeZone(localStorage.getItem("gs.timeZone") || browserTimeZone()),
  theme: localStorage.getItem("gs.theme") || "dark",
};

const liveState = {
  loading: true,
  error: "",
  fixtures: [],
  results: [],
  liveGames: [],
  history: [],
  standings: {},
  updatedAt: null,
  scoreSource: "shared",
};

// Expose setters for settings panel
window.gs = window.gs || {};
window.gs.setTheme = (theme) => {
  if (!["light", "dark"].includes(theme)) return;
  state.theme = theme;
  document.body.dataset.theme = theme;
  localStorage.setItem("gs.theme", theme);
};
window.gs.setTz = (tz) => {
  state.timeZone = normalizeTimeZone(tz);
  window.gs.currentTz = state.timeZone;
  localStorage.setItem("gs.timeZone", state.timeZone);
  syncTimeZoneSelect();
  tick();
  safeRender();
  refreshRenderedTimes();
};
window.gs.currentTz = state.timeZone;
const identityRegistry = window.gs.identity || {};

// ── DOM refs ──────────────────────────────────────────────────
const currentTimeEl = document.getElementById("current-time");
const currentDateEl = document.getElementById("current-date");
const fixturesEl = document.getElementById("fixtures");
const rangeNoteEl = document.getElementById("range-note");
const fixturesTitleEl = document.getElementById("fixtures-title");
const sectionKickerMainEl = document.getElementById("section-kicker-main");
const rangeLabelEl = document.getElementById("range-label");
const rangeControlEl = document.getElementById("range-control");
const teamSelectEl = document.getElementById("team-select");
const teamFocusEl = document.getElementById("team-focus");
const favoriteLiveEl = document.getElementById("favorite-live");
const favoriteLiveListEl = document.getElementById("favorite-live-list");
const favoriteLiveUpdatedEl = document.getElementById("favorite-live-updated");
const favoriteLiveKickerEl = document.getElementById("favorite-live-kicker");
const favoriteLiveTitleEl = document.getElementById("favorite-live-title");
const controlsEl = document.querySelector(".controls");
const communityPulseEl = document.getElementById("community-pulse");
const roomCountOpenEl = document.getElementById("room-count-open");
const roomCountLiveEl = document.getElementById("room-count-live");
const roomCountRecentEl = document.getElementById("room-count-recent");
const timeZoneEyebrowEl = document.getElementById("time-zone-eyebrow");
const clockTzLabelEl = document.getElementById("clock-tz-label");
const sportsPickerModalEl = document.getElementById("sports-picker-modal");
const sportsCatalogEl = document.getElementById("sports-catalog");
const sportsSearchEl = document.getElementById("sports-search");
const sportsRegionFiltersEl = document.getElementById("sports-region-filters");
const sportsTypeFiltersEl = document.getElementById("sports-type-filters");

const sportsPickerState = {
  region: "all",
  sport: "all",
  search: "",
};

// ── Event wiring ──────────────────────────────────────────────
document.getElementById("mode-filters").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  selectMode(btn.dataset.mode);
});

document.getElementById("competition-filters").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  setActive(btn, "#competition-filters");
  state.competition = btn.dataset.filter;
  if (state.selectedTeam !== "all" && state.competition !== "all" && teamLeague(state.selectedTeam) !== state.competition) {
    state.selectedTeam = "all";
  }
  populateTeamSelect();
  safeRender();
  closeMobileFilters();
});

document.getElementById("window-filters").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  setActive(btn, "#window-filters");
  state.window = btn.dataset.window;
  safeRender();
  closeMobileFilters();
});

teamSelectEl.addEventListener("change", () => {
  state.selectedTeam = teamSelectEl.value;
  if (state.selectedTeam !== "all") {
    const league = teamLeague(state.selectedTeam);
    if (league) {
      state.competition = league;
      ensureCompetitionQuickButton(league);
      setActive(document.querySelector(`#competition-filters button[data-filter="${league}"]`), "#competition-filters");
      populateTeamSelect();
    }
  }
  safeRender();
  closeMobileFilters();
});

document.querySelector(".mobile-bottom-nav")?.addEventListener("click", (e) => {
  const modeButton = e.target.closest("[data-mobile-mode]");
  if (modeButton) {
    selectMode(modeButton.dataset.mobileMode);
    closeMobileFilters();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});
document.getElementById("btn-mobile-filters")?.addEventListener("click", () => {
  controlsEl?.classList.add("filters-open");
});
document.getElementById("btn-mobile-filters-close")?.addEventListener("click", closeMobileFilters);
favoriteLiveListEl?.addEventListener("click", (e) => {
  const card = e.target.closest("[data-for-you-league]");
  if (!card) return;
  state.competition = card.dataset.forYouLeague;
  ensureCompetitionQuickButton(state.competition);
  setActive(document.querySelector(`#competition-filters button[data-filter="${cssEscape(state.competition)}"]`), "#competition-filters");
  populateTeamSelect();
  selectMode(card.dataset.forYouMode || "fixtures");
  document.getElementById("fixtures-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.getElementById("btn-browse-sports")?.addEventListener("click", openSportsPicker);
document.getElementById("sports-picker-close")?.addEventListener("click", closeSportsPicker);
sportsPickerModalEl?.addEventListener("click", (e) => {
  if (e.target === sportsPickerModalEl) closeSportsPicker();
});
sportsSearchEl?.addEventListener("input", () => {
  sportsPickerState.search = sportsSearchEl.value.trim().toLowerCase();
  renderSportsCatalog();
});
sportsRegionFiltersEl?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-region]");
  if (!btn) return;
  sportsPickerState.region = btn.dataset.region;
  setActive(btn, "#sports-region-filters");
  renderSportsCatalog();
});
sportsTypeFiltersEl?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-sport]");
  if (!btn) return;
  sportsPickerState.sport = btn.dataset.sport;
  setActive(btn, "#sports-type-filters");
  renderSportsCatalog();
});
sportsCatalogEl?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-select-competition]");
  if (!btn || btn.disabled) return;
  state.competition = btn.dataset.selectCompetition;
  ensureCompetitionQuickButton(state.competition);
  setActive(document.querySelector(`#competition-filters button[data-filter="${cssEscape(state.competition)}"]`), "#competition-filters");
  populateTeamSelect();
  safeRender();
  closeSportsPicker();
});
document.addEventListener("gs:recent-rooms-changed", () => updateCommunityPulse(
  liveState.fixtures.length ? liveState.fixtures : fixtures,
  liveState.liveGames
));

// Listen for prefs updates from auth module
document.addEventListener("gs:prefs-updated", () => {
  populateTeamSelect();
  safeRender();
});
document.addEventListener("gs:auth-ready", (event) => {
  applyProfileDisplay(event.detail?.profile);
  populateTeamSelect();
  safeRender();
});
document.addEventListener("gs:profile-updated", (event) => {
  applyProfileDisplay(event.detail?.profile);
  populateTeamSelect();
  safeRender();
});
document.addEventListener("gs:auth-signout", () => {
  populateTeamSelect();
  safeRender();
});

// ── Bootstrap ─────────────────────────────────────────────────
populateTimeZoneSelect();
populateTeamSelect();
document.body.dataset.theme = state.theme;
safeRender();
tick();
loadLiveData();
loadDynamicCompetitions();
setInterval(tick, 30000);
setInterval(refreshLiveScores, 20000);

// ── Match factory ─────────────────────────────────────────────
function match(league, round, utc, home, away, venue) {
  return {
    league,
    round,
    date: new Date(utc),
    home,
    away,
    venue,
    lastMeeting: lastMeetings[`${home}|${away}`] || lastMeetings[`${away}|${home}`] || null,
  };
}

// ── Tick (clock) ──────────────────────────────────────────────
function tick() {
  const now = new Date();
  const tz = displayTimeZoneObj();
  const label = tz.label;
  timeZoneEyebrowEl.textContent = `Kickoff times in ${tz.description}`;
  clockTzLabelEl.textContent = `Now ${label}`;
  currentTimeEl.textContent = new Intl.DateTimeFormat("en-NZ", {
    timeZone: tz.zone,
    hour: "numeric",
    minute: "2-digit",
  }).format(now);
  currentDateEl.textContent = new Intl.DateTimeFormat("en-NZ", {
    timeZone: tz.zone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(now);
}

// ── Render ────────────────────────────────────────────────────
function render() {
  const now = new Date();
  const scheduleSource = liveState.fixtures.length ? liveState.fixtures : fixtures;
  const liveKeys = new Set(liveState.liveGames.map(matchKey));
  const upcoming = scheduleSource.filter((item) => item.date > now && !liveKeys.has(matchKey(item)));
  updateModeControls();
  renderTeamFocus(scheduleSource);
  renderFavoriteLiveShelf(liveState.liveGames, upcoming);
  updateCommunityPulse(scheduleSource, liveState.liveGames, now);

  if (state.mode === "live") {
    const live = filterLiveGames(liveState.liveGames);
    renderSummary(live);
    renderResults([], live);
    return;
  }

  if (state.mode === "results") {
    const live = filterLiveGames(liveState.liveGames);
    const visible = filterResults(liveState.results);
    renderSummary([...live, ...visible]);
    renderResults(visible, live);
    return;
  }

  if (state.mode === "tables") {
    const visible = filterStandings(liveState.standings);
    renderSummary(visible.flatMap((t) => t.rows));
    renderTables(visible);
    return;
  }

  const visible = filterFixtures(upcoming);
  renderSummary(visible);
  renderList(visible);
}

function safeRender() {
  try {
    render();
  } catch (e) {
    console.error("Render error:", e);
    if (fixturesEl) fixturesEl.innerHTML = '<div class="empty-state">The fixture view could not render. Please refresh the page.</div>';
    if (rangeNoteEl) rangeNoteEl.textContent = "A display error stopped this view from updating.";
  }
}

function applyProfileDisplay(profile) {
  if (profile?.theme && ["light", "dark"].includes(profile.theme)) {
    state.theme = profile.theme;
    document.body.dataset.theme = profile.theme;
    localStorage.setItem("gs.theme", profile.theme);
  }
  if (profile?.timezone) {
    state.timeZone = normalizeTimeZone(profile.timezone);
    window.gs.currentTz = state.timeZone;
    localStorage.setItem("gs.timeZone", state.timeZone);
    syncTimeZoneSelect();
    tick();
  }
}

// ── Filters ───────────────────────────────────────────────────
function filterByCompetition(items) {
  if (state.competition === "all") {
    const prefs = preferredCompetitionSet();
    return prefs ? items.filter((item) => prefs.has(item.league)) : items;
  }
  return items.filter((item) => item.league === state.competition);
}

function filterFixtures(items) {
  const cf = filterByCompetition(items);
  const tf = filterBySelectedTeam(cf);
  if (state.window === "next") return tf.slice(0, 12);

  const now = new Date();
  if (state.window === "weekend") {
    return tf.filter((item) => {
      const day = new Intl.DateTimeFormat("en-NZ", { timeZone: displayTimeZoneObj().zone, weekday: "short" }).format(item.date);
      const daysAway = daysBetween(now, item.date);
      return daysAway >= 0 && daysAway <= 7 && (day === "Sat" || day === "Sun");
    });
  }
  if (state.window === "21") return tf;
  return tf.filter((item) => daysBetween(now, item.date) <= Number(state.window));
}

function filterResults(items) {
  const cf = filterByCompetition(items);
  const tf = filterBySelectedTeam(cf);
  if (state.window === "next") return tf.slice(0, 20);
  const now = new Date();
  if (state.window === "weekend") return tf.filter((item) => daysBetween(item.date, now) <= 7);
  if (state.window === "7") return tf.filter((item) => daysBetween(item.date, now) <= 30);
  return tf;
}

function filterLiveGames(items) {
  return filterBySelectedTeam(filterByCompetition(items)).sort((a, b) => a.date - b.date);
}

function filterStandings(tables) {
  const leaguesToShow = state.competition === "all" ? Object.keys(leagues) : [state.competition];
  return leaguesToShow
    .flatMap((league) => {
      const table = tables[league];
      return Array.isArray(table) ? table : table ? [table] : [];
    })
    .filter((table) => table.rows?.length);
}

function filterBySelectedTeam(items) {
  if (state.selectedTeam === "all") return items;
  return items.filter((item) => teamMatches(item, state.selectedTeam));
}

// ── Summary strip ─────────────────────────────────────────────
function renderSummary(items) {
  document.getElementById("count-all").textContent = items.length;
  document.getElementById("count-all").nextElementSibling.textContent =
    state.mode === "tables" ? "table rows" : state.mode === "results" ? "results" : state.mode === "live" ? "live" : "fixtures";
  document.getElementById("count-nrl").textContent = items.filter((i) => i.league === "NRL").length;
  document.getElementById("count-afl").textContent = items.filter((i) => i.league === "AFL").length;
  document.getElementById("count-super").textContent = items.filter((i) => i.league === "Super Rugby").length;
  document.getElementById("count-wc").textContent = items.filter((i) => i.league === "FIFA World Cup").length;
}

function renderFavoriteLiveShelf(liveGames, upcomingGames) {
  if (!favoriteLiveEl || !favoriteLiveListEl) return;
  const preferences = preferredCompetitionSet();
  const favoriteTeam = window.gs?.auth?.profile?.favorite_team || "";
  const isPreferred = (game) => !preferences || preferences.has(game.league);
  const prioritySort = (a, b) =>
    Number(teamMatches(b, favoriteTeam)) - Number(teamMatches(a, favoriteTeam)) ||
    a.date - b.date;
  const preferredLive = liveGames.filter(isPreferred).sort(prioritySort);
  const showingLive = preferredLive.length > 0;
  const relevant = showingLive
    ? preferredLive.slice(0, 4)
    : upcomingGames.filter(isPreferred).sort(prioritySort).slice(0, 4);

  favoriteLiveEl.classList.toggle("has-live", showingLive);
  favoriteLiveKickerEl.textContent = showingLive ? "Live for you" : "For you";
  favoriteLiveTitleEl.textContent = showingLive ? "Your sports are live now" : "Your next games";
  favoriteLiveUpdatedEl.textContent = showingLive
    ? (liveState.updatedAt ? `Shared live feed · ${formatTime(liveState.updatedAt)}` : "Shared live feed")
    : "Based on your favourite sports";

  if (!relevant.length) {
    favoriteLiveListEl.innerHTML = `
      <div class="favorite-live-empty">
        <strong>Your personalised fixture list will appear here.</strong>
        <span>Choose favourite sports and a team in Settings.</span>
      </div>
    `;
    return;
  }

  favoriteLiveListEl.innerHTML = relevant.map((game) => {
    const favoriteMatch = favoriteTeam && teamMatches(game, favoriteTeam);
    const status = showingLive ? liveStatusText(game) : `${formatDay(game.date)} · ${formatTime(game.date)}`;
    const centre = showingLive ? `${scoreText(game, "home")}–${scoreText(game, "away")}` : "vs";
    return `
    <button type="button" class="favorite-live-card ${showingLive ? "is-live" : "is-upcoming"}"
            data-for-you-league="${escapeAttr(game.league)}"
            data-for-you-mode="${showingLive ? "live" : "fixtures"}">
      <span class="favorite-live-meta">
        <span class="league-pill" style="--league-color:${leagues[game.league]?.color || "#61717f"}">${game.league === "FIFA World Cup" ? "World Cup" : game.league}</span>
        <span>${favoriteMatch ? "Your team · " : ""}${escapeHtml(status)}</span>
      </span>
      <span class="favorite-live-teams">
        <span>${teamIconHtml(game.home, game.league, "favorite-live-logo")}${escapeHtml(game.home)}</span>
        <strong>${centre}</strong>
        <span>${teamIconHtml(game.away, game.league, "favorite-live-logo")}${escapeHtml(game.away)}</span>
      </span>
      <span class="favorite-live-action">${showingLive ? "Open live view" : `Starts ${escapeHtml(timeUntil(game.date))}`}</span>
    </button>
  `;
  }).join("");
}

function updateCommunityPulse(scheduleSource, liveGames, now = new Date()) {
  if (!communityPulseEl) return;
  const nextOpenRooms = scheduleSource
    .filter((item) => !item.isPlaceholder)
    .map((item) => chatWindowFor(item, now))
    .filter((room) => ["pre", "lineup", "post"].includes(room.phase)).length;
  const recentRooms = recentRoomList().length;
  roomCountOpenEl.textContent = String(nextOpenRooms);
  roomCountLiveEl.textContent = String(liveGames.length);
  roomCountRecentEl.textContent = String(recentRooms);
}

function selectMode(mode) {
  if (!["live", "fixtures", "results", "tables"].includes(mode)) return;
  state.mode = mode;
  state.window = "next";
  setActive(document.querySelector(`#mode-filters button[data-mode="${mode}"]`), "#mode-filters");
  setActive(document.querySelector('#window-filters button[data-window="next"]'), "#window-filters");
  document.querySelectorAll("[data-mobile-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.mobileMode === mode);
  });
  updateModeControls();
  safeRender();
}

function closeMobileFilters() {
  controlsEl?.classList.remove("filters-open");
}

function ensureCompetitionQuickButton(league) {
  const filters = document.getElementById("competition-filters");
  if (!filters || filters.querySelector(`[data-filter="${cssEscape(league)}"]`)) return;
  filters.querySelector(".is-more-competition")?.remove();
  const button = document.createElement("button");
  button.type = "button";
  button.className = "is-more-competition";
  button.dataset.filter = league;
  button.textContent = league;
  filters.appendChild(button);
}

function openSportsPicker() {
  renderSportsCatalog();
  sportsPickerModalEl?.classList.remove("is-hidden");
  document.body.classList.add("modal-open");
  requestAnimationFrame(() => sportsSearchEl?.focus());
}

function closeSportsPicker() {
  sportsPickerModalEl?.classList.add("is-hidden");
  document.body.classList.remove("modal-open");
}

function renderSportsCatalog() {
  if (!sportsCatalogEl) return;
  const catalog = identityRegistry.competitionCatalog || Object.entries(leagues).map(([id, value]) => ({
    id,
    label: id,
    color: value.color,
    sub: "",
    region: "Global",
    sport: "Sport",
    status: "available",
  }));
  const query = sportsPickerState.search;
  const filtered = catalog.filter((comp) => {
    const text = [comp.id, comp.label, comp.sub, comp.region, comp.sport].join(" ").toLowerCase();
    return (!query || text.includes(query)) &&
      (sportsPickerState.region === "all" || comp.region === sportsPickerState.region) &&
      (sportsPickerState.sport === "all" || comp.sport === sportsPickerState.sport);
  });

  sportsCatalogEl.innerHTML = filtered.length ? filtered.map((comp) => {
    const available = Boolean(espnConfigs[comp.id]);
    const active = state.competition === comp.id;
    return `
      <article class="sports-card${available ? "" : " is-recommended"}" style="--sport-color:${comp.color || "#888"}">
        <span class="sports-card-swatch" aria-hidden="true"></span>
        <div>
          <strong>${escapeHtml(comp.label || comp.id)}</strong>
          <small>${escapeHtml([comp.sub, comp.region, comp.sport].filter(Boolean).join(" · "))}</small>
        </div>
        <button type="button" data-select-competition="${escapeAttr(comp.id)}" ${available ? "" : "disabled"}>
          ${available ? (active ? "Selected" : "View") : "Planned"}
        </button>
      </article>
    `;
  }).join("") : `<div class="empty-state">No competitions match that search.</div>`;
}

// ── Team focus panel ──────────────────────────────────────────
function renderTeamFocus(scheduleSource) {
  if (state.selectedTeam === "all") {
    teamFocusEl.classList.add("is-hidden");
    teamFocusEl.innerHTML = "";
    return;
  }

  const team = state.selectedTeam;
  const league = teamLeague(team) || state.competition;
  const now = new Date();
  const upcoming = scheduleSource
    .filter((item) => item.date > now && teamMatches(item, team))
    .sort((a, b) => a.date - b.date)
    .slice(0, 6);
  const results = liveState.results
    .filter((item) => teamMatches(item, team))
    .sort((a, b) => b.date - a.date)
    .slice(0, 6);

  teamFocusEl.classList.remove("is-hidden");
  teamFocusEl.innerHTML = `
    <div class="team-focus-header">
      <span class="team-focus-logo">
        ${teamIconHtml(team, league, "strip-logo")}
      </span>
      <div>
        <p class="section-kicker">${league}</p>
        <h3>${team}</h3>
      </div>
      <div class="team-focus-stats">
        <span><strong>${results.length}</strong> recent</span>
        <span><strong>${upcoming.length}</strong> upcoming</span>
      </div>
    </div>
    <div class="team-focus-grid">
      <div>
        <h4>Recent results</h4>
        ${results.length
          ? results.map((item) => teamHistoryRow(item, team)).join("")
          : `<p class="team-focus-empty">${liveState.loading ? "Loading results..." : "No recent results found."}</p>`}
      </div>
      <div>
        <h4>Upcoming games</h4>
        ${upcoming.length
          ? upcoming.map((item) => teamFixtureRow(item, team)).join("")
          : '<p class="team-focus-empty">No upcoming games found.</p>'}
      </div>
    </div>
  `;
}

function teamHistoryRow(item, team) {
  const isHome = item.home === team;
  const opponent = isHome ? item.away : item.home;
  const teamScore = isHome ? item.homeScore : item.awayScore;
  const oppScore = isHome ? item.awayScore : item.homeScore;
  const result = teamScore > oppScore ? "W" : teamScore < oppScore ? "L" : "D";
  return `
    <div class="team-focus-row">
      <span class="form-dot ${result === "W" ? "win" : result === "L" ? "loss" : "draw"}">${result}</span>
      <div>
        <strong>${teamScore}–${oppScore} vs ${opponent}</strong>
        <span>${formatDay(item.date)} · ${item.round}</span>
      </div>
    </div>
  `;
}

function teamFixtureRow(item, team) {
  const opponent = item.home === team ? item.away : item.home;
  const homeAway = item.home === team ? "Home" : "Away";
  return `
    <div class="team-focus-row">
      <span class="team-focus-mini-logo">
        ${teamIconHtml(opponent, item.league, "strip-logo")}
      </span>
      <div>
        <strong>${homeAway} vs ${opponent}</strong>
        <span>${formatDay(item.date)} · ${item.timeTbc ? "Time TBC" : `<span data-kickoff-utc="${dateAttr(item.date)}">${formatTime(item.date)}</span>`}</span>
      </div>
    </div>
  `;
}

// ── Fixture list ──────────────────────────────────────────────
function renderList(items) {
  if (!items.length) {
    fixturesEl.innerHTML = '<div class="empty-state">No fixtures match this view.</div>';
    rangeNoteEl.textContent = "Try a broader window or a different competition.";
    return;
  }

  rangeNoteEl.textContent = `Showing ${items.length} confirmed kickoff${items.length === 1 ? "" : "s"} in ${displayTimeZoneObj().description}.`;
  const groups = groupByDate(items);
  fixturesEl.innerHTML = Object.entries(groups).map(([date, group]) => `
    <div class="date-group">
      <div class="date-heading">${date}</div>
      <div class="cards">
        ${group.map((item) => `<article class="match-card">${cardTemplate(item)}</article>`).join("")}
      </div>
    </div>
  `).join("");
}

// ── Results list ──────────────────────────────────────────────
function renderResults(items, liveItems = []) {
  fixturesTitleEl.textContent = state.mode === "live" ? "Live games" : "Recent results";
  if (liveState.loading) {
    fixturesEl.innerHTML = `<div class="loading-state">Loading ESPN ${state.mode === "live" ? "live games" : "results"}...</div>`;
    rangeNoteEl.textContent = state.mode === "live" ? "Checking live scoreboards." : "Fetching season results and tables.";
    return;
  }
  if (liveState.error && !liveState.results.length && !liveItems.length) {
    fixturesEl.innerHTML = `<div class="empty-state">${liveState.error}</div>`;
    rangeNoteEl.textContent = "Live data could not be loaded.";
    return;
  }
  if (state.mode === "live" && !liveItems.length) {
    fixturesEl.innerHTML = '<div class="empty-state">No games are live right now.</div>';
    rangeNoteEl.textContent = "Switch to Upcoming for the next confirmed kickoffs.";
    return;
  }
  if (!items.length && !liveItems.length) {
    fixturesEl.innerHTML = '<div class="empty-state">No results match this view yet.</div>';
    rangeNoteEl.textContent = "Try a broader range or a different competition.";
    return;
  }

  rangeNoteEl.textContent = `${liveItems.length ? `${liveItems.length} live, ` : ""}${items.length} result${items.length === 1 ? "" : "s"} via ESPN.${liveState.updatedAt ? ` Updated ${formatTime(liveState.updatedAt)}.` : ""}`;
  const groups = groupByDate(items);
  const liveMarkup = liveItems.length ? `
    <div class="date-group live-group">
      <div class="date-heading live-heading">Live now</div>
      <div class="cards">
        ${liveItems.map((item) => `<article class="match-card live-card">${resultTemplate(item)}</article>`).join("")}
      </div>
    </div>
  ` : "";
  fixturesEl.innerHTML = liveMarkup + Object.entries(groups).map(([date, group]) => `
    <div class="date-group">
      <div class="date-heading">${date}</div>
      <div class="cards">
        ${group.map((item) => `<article class="match-card">${resultTemplate(item)}</article>`).join("")}
      </div>
    </div>
  `).join("");
}

// ── Tables ────────────────────────────────────────────────────
function renderTables(tables) {
  fixturesTitleEl.textContent = "Competition tables";
  if (liveState.loading) {
    fixturesEl.innerHTML = '<div class="loading-state">Loading ESPN tables...</div>';
    rangeNoteEl.textContent = "Fetching standings and finals positions.";
    return;
  }
  if (liveState.error && !Object.keys(liveState.standings).length) {
    fixturesEl.innerHTML = `<div class="empty-state">${liveState.error}</div>`;
    rangeNoteEl.textContent = "Live data could not be loaded.";
    return;
  }
  if (!tables.length) {
    fixturesEl.innerHTML = '<div class="empty-state">No table available for this competition.</div>';
    rangeNoteEl.textContent = "Try All, NRL, AFL, Super Rugby or World Cup.";
    return;
  }

  const adjustedTables = tables.map(applyLiveTableAdjustments);
  const liveRowCount = adjustedTables.flatMap((t) => t.rows).filter((r) => r.liveAdjusted).length;
  const groupCount = adjustedTables.filter((table) => table.groupName).length;
  rangeNoteEl.textContent = `${liveRowCount ? "Live-adjusted. " : ""}${groupCount ? `${groupCount} World Cup groups shown. ` : "Finals zones from official formats. "}${liveState.updatedAt ? `Updated ${formatTime(liveState.updatedAt)}.` : ""}`;
  fixturesEl.innerHTML = `<div class="standings-board ${groupCount ? "is-grouped" : ""}">${adjustedTables.map(tableTemplate).join("")}</div>`;
}

// ── Card templates ────────────────────────────────────────────
function cardTemplate(item) {
  return stripTemplate(item, leagues[item.league] || { color: "#888" });
}

function stripTemplate(item, league) {
  const chat = chatWindowFor(item);
  return `
    <div class="strip-match" style="--league-color: ${league.color}">
      <div class="strip-meta">
        <span class="league-pill">${item.league === "FIFA World Cup" ? "World Cup" : item.league}</span>
        <span>${item.round}</span>
      </div>
      <div class="strip-teams">
        ${stripTeamTemplate(item.home, item.league)}
        <span class="strip-versus">VS</span>
        ${stripTeamTemplate(item.away, item.league)}
      </div>
      <div class="strip-kickoff">
        <span>${formatDay(item.date)}</span>
        <strong ${item.timeTbc ? "" : `data-kickoff-utc="${dateAttr(item.date)}" data-time-zone="${state.timeZone}"`}>${item.timeTbc ? "Time TBC" : formatTime(item.date)}</strong>
      </div>
      ${item.isPlaceholder
        ? `<div class="last-meeting"><span>Finals fixture</span><strong>Teams and host to be confirmed</strong></div>`
        : lastMeetingTemplate(lastMeetingFor(item))}
      <div class="strip-tail">
        ${chatButtonTemplate(item, chat)}
        <span class="countdown">${timeUntil(item.date)}</span>
        <span class="venue">${item.venue}</span>
      </div>
    </div>
  `;
}

function resultTemplate(item) {
  const league = leagues[item.league] || { color: "#888" };
  const homeWinner = item.homeScore > item.awayScore;
  const awayWinner = item.awayScore > item.homeScore;
  const chatBtn = chatButtonTemplate(item, chatWindowFor(item));
  return `
    <div class="strip-match result-match ${item.isLive ? "live-match" : ""}" style="--league-color: ${league.color}">
      <div class="strip-meta">
        <span class="league-pill ${item.isLive ? "live-pill" : ""}">${item.isLive ? "Live" : (item.league === "FIFA World Cup" ? "World Cup" : item.league)}</span>
        <span>${item.round}</span>
      </div>
      <div class="strip-teams">
        ${stripTeamTemplate(item.home, item.league)}
        <span class="strip-versus">${item.isLive ? "▶" : "FT"}</span>
        ${stripTeamTemplate(item.away, item.league)}
      </div>
	      <div class="result-score">
	        <span>${item.isLive ? liveStatusText(item) : formatDay(item.date)}</span>
	        <strong>${scoreText(item, "home")}–${scoreText(item, "away")}</strong>
	      </div>
      <div class="strip-tail">
        ${chatBtn}
        <span class="venue">${item.venue || ""}</span>
      </div>
    </div>
  `;
}

function chatButtonTemplate(item, chat) {
  if (!window.GRANDSTAND_CONFIG?.CHAT_ENABLED || chat.phase === "closed") return "";
  const scoreAttrs = Number.isFinite(item.homeScore) && Number.isFinite(item.awayScore)
    ? `data-home-score="${item.homeScore}" data-away-score="${item.awayScore}"`
    : "";
  return `
    <button type="button" class="btn-chat-trigger" data-game-id="${escapeAttr(matchKey(item))}"
            data-legacy-game-id="${escapeAttr(legacyMatchKey(item))}"
            data-league="${escapeAttr(item.league)}"
            data-home="${escapeAttr(item.home)}" data-away="${escapeAttr(item.away)}"
            data-chat-phase="${escapeAttr(chat.phase)}" data-chat-label="${escapeAttr(chat.label)}"
            data-chat-readonly="${chat.readOnly ? "true" : "false"}"
            ${scoreAttrs}
            data-home-goals="${item.homeGoals ?? ""}" data-home-behinds="${item.homeBehinds ?? ""}"
            data-away-goals="${item.awayGoals ?? ""}" data-away-behinds="${item.awayBehinds ?? ""}">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      ${escapeHtml(chat.button)}
    </button>
  `;
}

function chatWindowFor(item, now = new Date()) {
  if (item.isPlaceholder) return { phase: "closed", label: "Room closed", button: "", readOnly: true };
  if (item.isLive) return { phase: "live", label: "Live room", button: "Chat", readOnly: false };

  const kickoff = new Date(item.date).getTime();
  const diff = kickoff - now.getTime();
  const preOpen = 24 * 60 * 60 * 1000;
  const liveOpen = 30 * 60 * 1000;
  const postClose = 8 * 60 * 60 * 1000;

  if (diff > preOpen) return { phase: "closed", label: "Room opens 24h before kickoff", button: "", readOnly: true };
  if (diff > liveOpen) return { phase: "pre", label: "Pre-game room", button: "Pre-game", readOnly: false };
  if (diff > 0) return { phase: "lineup", label: "Lineup room", button: "Lineups", readOnly: false };
  if (now.getTime() - kickoff <= postClose) return { phase: "post", label: "Post-game room", button: "React", readOnly: false };
  return { phase: "archive", label: "Saved match archive", button: "Archive", readOnly: true };
}

// Wire chat buttons (event delegation on fixture list)
fixturesEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-chat-trigger");
  if (!btn) return;
  const cfg = window.GRANDSTAND_CONFIG;
  if (!cfg.CHAT_ENABLED) return;

  window.gs?.openChat?.({
    id: btn.dataset.gameId,
    aliases: [btn.dataset.legacyGameId].filter(Boolean),
    league: btn.dataset.league,
    leagueColor: leagues[btn.dataset.league]?.color,
    title: `${btn.dataset.home} vs ${btn.dataset.away}`,
	    home: btn.dataset.home,
	    away: btn.dataset.away,
	    homeScore: nullableNumber(btn.dataset.homeScore),
	    awayScore: nullableNumber(btn.dataset.awayScore),
      phase: btn.dataset.chatPhase || "live",
      statusLabel: btn.dataset.chatLabel || "Live room",
      readOnly: btn.dataset.chatReadonly === "true",
	    homeGoals: nullableNumber(btn.dataset.homeGoals),
	    homeBehinds: nullableNumber(btn.dataset.homeBehinds),
	    awayGoals: nullableNumber(btn.dataset.awayGoals),
	    awayBehinds: nullableNumber(btn.dataset.awayBehinds),
	  });
	});

function stripTeamTemplate(name, league) {
  const [code] = teams[name] || [name.slice(0, 3).toUpperCase()];
  if (name.includes("TBC")) {
    return `
      <div class="strip-team tbc-team">
        <span class="strip-logo" data-code="TBC" aria-label="Team TBC"></span>
        <span>${name}</span>
      </div>
    `;
  }
  return `
    <div class="strip-team">
      ${teamIconHtml(name, league, "strip-logo", code)}
      <span>${name}</span>
    </div>
  `;
}

function lastMeetingTemplate(meeting) {
  if (!meeting) {
    return `
      <div class="last-meeting">
        <span>Last meeting</span>
        <strong>${liveState.loading ? "Searching history..." : "No recent result found"}</strong>
      </div>
    `;
  }
  return `
    <div class="last-meeting">
      <span>Last meeting</span>
      <strong>${meeting.home} ${meeting.homeScore}–${meeting.awayScore} ${meeting.away}</strong>
      <small>${formatShortDate(meeting.date)}</small>
    </div>
  `;
}

// ── Table template ────────────────────────────────────────────
function tableTemplate(table) {
  const diffScale = Math.max(1, ...table.rows.map((r) => Math.abs(diffDelta(r.differential, table.league))));
  return `
    <div class="table-wrap ${table.groupName ? "group-table" : ""}">
      <div class="table-heading">
        <div>
          <h3>${table.title || table.league}</h3>
          ${table.subtitle ? `<p>${table.subtitle}</p>` : ""}
        </div>
        <span>${table.rows.length} teams</span>
      </div>
      <table class="standings-table">
        <thead>
          <tr>
            <th>Pos</th>
            <th class="team-cell">Team</th>
            <th>P</th>
            <th>W</th>
            <th>L</th>
            <th>D</th>
            <th>Pts</th>
            <th class="diff-cell">${table.league === "AFL" ? "%" : "Diff"}</th>
            <th>Form</th>
            <th>Finals</th>
          </tr>
        </thead>
        <tbody>
          ${table.rows.map((row) => {
            const displayForm = row.liveAdjusted
              ? row.form
              : formForTeam(liveState.results, table.league, row.team) || row.form;
            return `
              <tr class="${row.team === state.selectedTeam ? "selected-team-row" : ""} ${row.liveAdjusted ? "live-adjusted-row" : ""}">
                <td>${row.liveRank || row.rank}</td>
                <td class="team-cell">
                  <span class="table-team">
                    ${teamIconHtml(row.team, table.league, "table-team-logo")}
                    <span>${row.team}</span>
                    ${row.liveAdjusted ? '<span class="mini-live-badge">Live</span>' : ""}
                  </span>
                </td>
                <td>${row.played}</td>
                <td>${row.wins}</td>
                <td>${row.losses}</td>
                <td>${row.draws}</td>
                <td>${row.points}</td>
                <td class="diff-cell">${diffBarTemplate(row.differential, table.league, diffScale)}</td>
                <td>${formTemplate(displayForm)}</td>
                <td>${qualificationBadge(row.qualification)}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

// ── Live table adjustments ────────────────────────────────────
function applyLiveTableAdjustments(table) {
  const liveForLeague = filterLiveGames(liveState.liveGames)
    .filter((item) => item.league === table.league && hasTableLiveScore(item));
  if (!liveForLeague.length) return table;

  const rows = table.rows.map((row) => ({ ...row, sortPoints: numberValue(row.points), sortDifferential: numberValue(row.differential) }));
  liveForLeague.forEach((game) => {
    applyLiveResultToRows(rows, table.league, game, game.home, game.homeScore, game.awayScore);
    applyLiveResultToRows(rows, table.league, game, game.away, game.awayScore, game.homeScore);
  });

  const sortedRows = rows
    .sort((a, b) =>
      numberValue(b.points) - numberValue(a.points) ||
      numberValue(b.differential) - numberValue(a.differential) ||
      a.rank - b.rank
    )
    .map((row, index) => ({ ...row, liveRank: index + 1 }));

  return { ...table, rows: sortedRows };
}

function applyLiveResultToRows(rows, league, game, team, teamScore, oppScore) {
  const row = rows.find((r) => r.team === team);
  if (!row) return;
  const tp = Number(teamScore);
  const op = Number(oppScore);
  if (!Number.isFinite(tp) || !Number.isFinite(op)) return;

  row.played = String(numberValue(row.played) + 1);
  row.liveAdjusted = true;
  row.liveStatus = liveStatusText(game);
  const baseForm = String(formForTeam(liveState.results, league, team) || row.form || "").replace(/[^WLD]/g, "");
  const letter = tp > op ? "W" : tp < op ? "L" : "D";
  row.form = `${baseForm.slice(-4)}${letter}`;

  if (tp > op) {
    row.wins = String(numberValue(row.wins) + 1);
    row.points = String(numberValue(row.points) + winPointsForLeague(league));
  } else if (tp < op) {
    row.losses = String(numberValue(row.losses) + 1);
  } else {
    row.draws = String(numberValue(row.draws) + 1);
    row.points = String(numberValue(row.points) + drawPointsForLeague(league));
  }

  if (league === "AFL" && Number.isFinite(row.forPoints) && Number.isFinite(row.againstPoints)) {
    const af = row.forPoints + tp;
    const aa = row.againstPoints + op;
    row.differential = aa ? String(Math.round((af / aa) * 100)) : row.differential;
  } else {
    row.differential = signedNumber(numberValue(row.differential) + tp - op);
  }
}

function winPointsForLeague(league) { return league === "AFL" ? 4 : league === "NRL" ? 2 : 4; }
function drawPointsForLeague(league) { return league === "AFL" ? 2 : league === "NRL" ? 1 : 2; }

// ── Live data loading ─────────────────────────────────────────
async function loadLiveData() {
  liveState.loading = true;
  liveState.error = "";
  safeRender();

  const [results, history, futureFixtures, liveGames, standings] = await Promise.allSettled([
    loadSeasonResults(),
    loadPreviousSeasonResults(),
    loadSeasonFixtures(),
    loadLiveGames(),
    loadStandings(),
  ]);

  liveState.results = settledValue(results, []);
  liveState.history = uniqueResults([...liveState.results, ...settledValue(history, [])]);
  liveState.fixtures = settledValue(futureFixtures, []);
  liveState.liveGames = settledValue(liveGames, []);
  const standingsData = settledValue(standings, []);
  liveState.standings = standingsData.length ? parseAllStandings(standingsData, liveState.results) : {};
  liveState.updatedAt = new Date();

  if (!liveState.results.length && !liveState.fixtures.length && !Object.keys(liveState.standings).length) {
    liveState.error = "Could not load ESPN data. The fixture view still works from the local schedule.";
  }

  liveState.loading = false;
  safeRender();

  // Broadcast live score updates for chat panel
  liveState.liveGames.forEach((game) => {
    document.dispatchEvent(new CustomEvent("gs:live-score-update", { detail: game }));
  });
}

async function refreshLiveScores() {
  try {
    const hadLive = liveState.liveGames.length > 0;
    liveState.liveGames = await loadLiveGames();
    if (hadLive && !liveState.liveGames.length) {
      const [results, standings] = await Promise.allSettled([loadSeasonResults(), loadStandings()]);
      liveState.results = settledValue(results, liveState.results);
      liveState.history = uniqueResults([...liveState.results, ...liveState.history]);
      const sd = settledValue(standings, []);
      if (sd.length) liveState.standings = parseAllStandings(sd, liveState.results);
    }
    liveState.updatedAt = new Date();
    safeRender();
    liveState.liveGames.forEach((game) => {
      document.dispatchEvent(new CustomEvent("gs:live-score-update", { detail: game }));
    });
  } catch (e) {
    console.error(e);
  }
}

async function loadSeasonResults() {
  const range = `${seasonYear}0101-${formatEspnDateKey(new Date())}`;
  return loadResultsForRange(range);
}

async function loadPreviousSeasonResults() {
  const range = `${seasonYear - 1}0101-${seasonYear - 1}1231`;
  return loadResultsForRange(range);
}

async function loadLiveGames() {
  const now = new Date();
  try {
    const sharedFeedUrl = window.GRANDSTAND_CONFIG?.LIVE_SCORES_URL || "/api/live-scores";
    const shared = await getJson(sharedFeedUrl);
    if (Array.isArray(shared.leagues)) {
      liveState.scoreSource = "shared";
      const staticGames = shared.leagues.flatMap(({ league, events }) =>
        (events || []).map((event) => parseLiveScoreboardEvent(event, league, now)).filter(Boolean)
      );
      const dynamicGames = await loadDynamicLiveGames(now);
      return [...staticGames, ...dynamicGames].sort((a, b) => a.date - b.date);
    }
  } catch (error) {
    console.warn("Shared live-score feed unavailable; using direct ESPN fallback.", error);
  }

  liveState.scoreSource = "direct-fallback";
  return loadDirectLiveGames(now, Object.entries(espnConfigs));
}

async function loadDynamicLiveGames(now) {
  const entries = Object.entries(espnConfigs).filter(([league]) => !staticEspnConfigs[league]);
  return entries.length ? loadDirectLiveGames(now, entries) : [];
}

async function loadDirectLiveGames(now, entries) {
  const range = `${formatEspnDateKey(addDays(now, -1))}-${formatEspnDateKey(addDays(now, 1))}`;
  const payloads = await Promise.allSettled(
    entries.map(async ([league, config]) => {
      const data = await getJson(`${config.scoreboard}?dates=${range}&limit=100`);
      return (data.events || []).map((event) => parseLiveScoreboardEvent(event, league, now)).filter(Boolean);
    })
  );
  return payloads.filter((r) => r.status === "fulfilled").flatMap((r) => r.value).sort((a, b) => a.date - b.date);
}

async function loadResultsForRange(range) {
  const payloads = await Promise.allSettled(
    Object.entries(espnConfigs).map(async ([league, config]) => {
      const data = await getJson(`${config.scoreboard}?dates=${range}&limit=1000`);
      return (data.events || []).map((event) => parseScoreboardEvent(event, league)).filter(Boolean);
    })
  );
  return payloads.filter((r) => r.status === "fulfilled").flatMap((r) => r.value).sort((a, b) => b.date - a.date);
}

async function loadStandings() {
  const payloads = await Promise.allSettled(
    Object.entries(espnConfigs).map(async ([league, config]) => {
      const data = await getJson(config.standings);
      return [league, data];
    })
  );
  return payloads.filter((r) => r.status === "fulfilled").map((r) => r.value);
}

async function loadSeasonFixtures() {
  const start = formatEspnDateKey(new Date());
  const payloads = await Promise.allSettled(
    Object.entries(espnConfigs).map(async ([league, config]) => {
      const isWC = league === "FIFA World Cup";
      const end = config.fixtureEnd ||
        (league === "Super Rugby" ? `${seasonYear}0630` : isWC ? `${seasonYear}0731` : `${seasonYear}1031`);
      const data = await getJson(`${config.scoreboard}?dates=${start}-${end}&limit=500`);
      return (data.events || []).map((event) => parseScheduleEvent(event, league)).filter(Boolean);
    })
  );
  return [
    ...payloads.filter((r) => r.status === "fulfilled").flatMap((r) => r.value),
    ...placeholderFinals(),
  ]
    .filter((item) => item.date > new Date())
    .sort((a, b) => a.date - b.date);
}

// ── Dynamic competitions (admin-registered) ───────────────────
async function loadDynamicCompetitions() {
  // Loaded from Supabase `competitions` table (if available)
  const supabase = window.gs?.supabase;
  if (!supabase) return;

  const { data, error } = await supabase
    .from("competitions")
    .select("*")
    .eq("is_active", true);

  if (error || !data?.length) return;

  data.forEach((comp) => {
    // Skip if already in static configs
    if (espnConfigs[comp.label]) return;

    const scoreboard = `https://site.api.espn.com/apis/site/v2/sports/${comp.sport_slug}/${comp.league_slug}/scoreboard`;
    const standings = `https://site.web.api.espn.com/apis/v2/sports/${comp.sport_slug}/${comp.league_slug}/standings?region=us&lang=en&contentorigin=espn&season=${seasonYear}`;

    espnConfigs[comp.label] = {
      scoreboard,
      standings,
      finals: {
        qualifying: comp.finals_qualifying || 8,
        protected: comp.finals_protected || 4,
        protectedLabel: comp.finals_protected_label || "Finals",
        qualifyingLabel: comp.finals_qualifying_label || "Finals",
      },
    };

    leagues[comp.label] = { color: comp.color || "#888" };
    leagueTeams[comp.label] = [];

    // Add filter button
    const filtersEl = document.getElementById("competition-filters");
    if (!filtersEl.querySelector(`[data-filter="${comp.label}"]`)) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.filter = comp.label;
      btn.textContent = comp.label;
      filtersEl.appendChild(btn);
    }

    // Add summary strip item
    // (Dynamic additions just add to total, not a new strip box to avoid layout breaks)
  });
}

// ── ESPN parsers ──────────────────────────────────────────────
function parseScoreboardEvent(event, league) {
  const competition = event.competitions?.[0];
  const competitors = competition?.competitors || [];
  if (!competition || competitors.length < 2) return null;
  if (!event.status?.type?.completed) return null;

  const home = competitors.find((c) => c.homeAway === "home") || competitors[0];
  const away = competitors.find((c) => c.homeAway === "away") || competitors[1];
  const homeScore = Number(home.score);
  const awayScore = Number(away.score);
  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) return null;
  const homeAfl = aflScoreParts(home);
  const awayAfl = aflScoreParts(away);

  return {
    id: event.id ? String(event.id) : "",
    league,
    round: event.week?.number ? `Round ${event.week.number}` : event.season?.slug || "Result",
    date: new Date(event.date),
    home: competitorTeamName(home, league),
    away: competitorTeamName(away, league),
    homeScore,
    awayScore,
    homeGoals: homeAfl?.goals,
    homeBehinds: homeAfl?.behinds,
    awayGoals: awayAfl?.goals,
    awayBehinds: awayAfl?.behinds,
    venue: competition.venue?.fullName || "",
  };
}

function parseLiveScoreboardEvent(event, league, now = new Date()) {
  const statusType = event.status?.type;
  if (!statusType || statusType.completed) return null;
  const date = new Date(event.date);
  const isLive = statusType.state === "in" || date <= now;
  if (!isLive) return null;
  const parsed = parseScoreEvent(event, league);
  if (!parsed) return null;
  return {
    ...parsed,
    isLive: true,
    statusState: statusType.state,
    statusDescription: statusType.description,
    statusDetail: statusType.shortDetail || statusType.detail || statusType.description || "Live",
    clock: event.status?.displayClock || "",
    period: event.status?.period || "",
  };
}

function parseScoreEvent(event, league) {
  const competition = event.competitions?.[0];
  const competitors = competition?.competitors || [];
  if (!competition || competitors.length < 2) return null;

  const home = competitors.find((c) => c.homeAway === "home") || competitors[0];
  const away = competitors.find((c) => c.homeAway === "away") || competitors[1];
  const homeScore = Number(home.score ?? 0);
  const awayScore = Number(away.score ?? 0);
  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) return null;
  const homeAfl = aflScoreParts(home);
  const awayAfl = aflScoreParts(away);

  return {
    id: event.id ? String(event.id) : "",
    league,
    round: event.week?.number ? `Round ${event.week.number}` : event.season?.slug || "Result",
    date: new Date(event.date),
    home: competitorTeamName(home, league),
    away: competitorTeamName(away, league),
    homeScore,
    awayScore,
    homeGoals: homeAfl?.goals,
    homeBehinds: homeAfl?.behinds,
    awayGoals: awayAfl?.goals,
    awayBehinds: awayAfl?.behinds,
    venue: competition.venue?.fullName || "",
  };
}

function parseScheduleEvent(event, league) {
  if (event.status?.type?.completed) return null;
  const competition = event.competitions?.[0];
  const competitors = competition?.competitors || [];
  if (!competition || competitors.length < 2) return null;

  const home = competitors.find((c) => c.homeAway === "home") || competitors[0];
  const away = competitors.find((c) => c.homeAway === "away") || competitors[1];
  return {
    ...match(
    league,
    event.week?.number ? `Round ${event.week.number}` : event.season?.slug || "Scheduled",
    event.date,
    competitorTeamName(home, league),
    competitorTeamName(away, league),
    competition.venue?.fullName || "Venue TBC"
    ),
    id: event.id ? String(event.id) : "",
  };
}

function placeholderFinals() {
  return [
    placeholder("Super Rugby", "Semi Final", "2026-06-12T07:05:00Z", "Teams TBC", "Teams TBC", "Venue TBC"),
    placeholder("Super Rugby", "Semi Final", "2026-06-13T07:05:00Z", "Teams TBC", "Teams TBC", "Venue TBC"),
    placeholder("Super Rugby", "Grand Final", "2026-06-20T07:05:00Z", "Teams TBC", "Teams TBC", "Venue TBC"),
    placeholder("AFL", "Wildcard Final", "2026-08-28T09:50:00Z", "Teams TBC", "Teams TBC", "Venue TBC"),
    placeholder("AFL", "Wildcard Final", "2026-08-29T09:50:00Z", "Teams TBC", "Teams TBC", "Venue TBC"),
    placeholder("AFL", "Qualifying/Elimination Final", "2026-09-04T09:50:00Z", "Teams TBC", "Teams TBC", "Venue TBC"),
    placeholder("AFL", "Qualifying/Elimination Final", "2026-09-05T09:50:00Z", "Teams TBC", "Teams TBC", "Venue TBC"),
    placeholder("AFL", "Semi Final", "2026-09-11T09:50:00Z", "Teams TBC", "Teams TBC", "Venue TBC"),
    placeholder("AFL", "Semi Final", "2026-09-12T09:50:00Z", "Teams TBC", "Teams TBC", "Venue TBC"),
    placeholder("AFL", "Preliminary Final", "2026-09-18T09:50:00Z", "Teams TBC", "Teams TBC", "Venue TBC"),
    placeholder("AFL", "Preliminary Final", "2026-09-19T09:50:00Z", "Teams TBC", "Teams TBC", "Venue TBC"),
    placeholder("AFL", "Grand Final", "2026-09-26T04:30:00Z", "Teams TBC", "Teams TBC", "MCG"),
    placeholder("NRL", "Qualifying/Elimination Final", "2026-09-11T09:50:00Z", "Teams TBC", "Teams TBC", "Venue TBC"),
    placeholder("NRL", "Qualifying/Elimination Final", "2026-09-12T07:30:00Z", "Teams TBC", "Teams TBC", "Venue TBC"),
    placeholder("NRL", "Semi Final", "2026-09-18T09:50:00Z", "Teams TBC", "Teams TBC", "Venue TBC"),
    placeholder("NRL", "Semi Final", "2026-09-19T09:50:00Z", "Teams TBC", "Teams TBC", "Venue TBC"),
    placeholder("NRL", "Preliminary Final", "2026-09-25T09:50:00Z", "Teams TBC", "Teams TBC", "Venue TBC"),
    placeholder("NRL", "Preliminary Final", "2026-09-26T09:50:00Z", "Teams TBC", "Teams TBC", "Venue TBC"),
    placeholder("NRL", "Grand Final", "2026-10-04T08:30:00Z", "Teams TBC", "Teams TBC", "Accor Stadium"),
  ];
}

function placeholder(league, round, utc, home, away, venue) {
  return { league, round, date: new Date(utc), home, away, venue, isPlaceholder: true, timeTbc: true, lastMeeting: null };
}

// ── Standings parser ──────────────────────────────────────────
function parseAllStandings(entries, results) {
  return Object.fromEntries(
    entries.map(([league, data]) => [league, parseStandings(data, league, espnConfigs[league]?.finals, results)])
  );
}

function parseStandings(data, league, finals, results) {
  if (Array.isArray(data.children) && data.children.some((child) => child.standings?.entries?.length)) {
    return data.children
      .map((child, index) => parseStandingsGroup(child.standings, league, groupFinalsForLeague(league, finals), results, {
        title: child.name || child.abbreviation || child.standings?.displayName || `${league} group ${index + 1}`,
        subtitle: league,
        groupName: child.name || child.abbreviation || `Group ${index + 1}`,
        stage: "group",
      }))
      .filter((table) => table.rows.length);
  }

  return parseStandingsGroup(data.standings, league, finals, results, {
    title: league === "FIFA World Cup" ? "FIFA World Cup" : league,
    subtitle: "",
  });
}

function parseStandingsGroup(standings, league, finals, results, meta = {}) {
  const rows = (standings?.entries || []).map((entry, index) => {
    const stats = Object.fromEntries((entry.stats || []).map((s) => [s.type, s]));
    const rank = statValue(stats, "rank", "playoffseed", index + 1);
    const team = normalizeTeamName(entry.team?.displayName || entry.team?.name);
    identityRegistry.rememberTeam?.(team, {
      league,
      logo: entry.team?.logo || entry.team?.logos?.[0]?.href || "",
      abbreviation: entry.team?.abbreviation || "",
    });
    return {
      league,
      rank,
      team,
      played: statDisplay(stats, "gamesplayed"),
      wins: statDisplay(stats, "gameswon", "wins"),
      losses: statDisplay(stats, "gameslost", "losses"),
      draws: statDisplay(stats, "gamesdrawn", "ties"),
      points: statDisplay(stats, "points"),
      forPoints: statNumber(stats, "pointsfor", "for", "scorefor", "pointsFor"),
      againstPoints: statNumber(stats, "pointsagainst", "against", "scoreagainst", "pointsAgainst"),
      differential: league === "AFL"
        ? wholeNumberDisplay(statDisplay(stats, "percentage"))
        : statDisplay(stats, "pointsdifference", "pointdifferential", "differential"),
      form: formForTeam(results, league, team) || statDisplay(stats, "total", "form", "streak"),
      qualification: finals ? qualificationForRank(rank, finals) : { kind: "outside", label: "N/A" },
    };
  }).sort((a, b) => a.rank - b.rank);

  return {
    league,
    title: meta.title || league,
    subtitle: meta.subtitle || "",
    groupName: meta.groupName || "",
    stage: meta.stage || "",
    rows,
  };
}

function groupFinalsForLeague(league, finals) {
  if (league !== "FIFA World Cup") return finals;
  return {
    protected: 2,
    qualifying: 3,
    protectedLabel: "Top 2",
    qualifyingLabel: "Third-place watch",
  };
}

function aflScoreParts(competitor) {
  const stats = Object.fromEntries((competitor.statistics || []).map((stat) => [
    String(stat.name || stat.type || stat.abbreviation || "").toLowerCase(),
    stat,
  ]));
  const goals = statNumberFromMap(stats, "goals", "goal", "g");
  const behinds = statNumberFromMap(stats, "behinds", "behind", "b");
  return Number.isFinite(goals) && Number.isFinite(behinds) ? { goals, behinds } : null;
}

function statNumberFromMap(stats, ...keys) {
  for (const key of keys) {
    const stat = stats[key];
    const value = Number(stat?.value ?? stat?.displayValue);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function scoreText(item, side) {
  const score = item[`${side}Score`];
  if (item.league === "AFL") {
    const goals = item[`${side}Goals`];
    const behinds = item[`${side}Behinds`];
    if (Number.isFinite(goals) && Number.isFinite(behinds)) return `${goals}-${behinds} ${score}`;
  }
  return String(score);
}

function nullableNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function statDisplay(stats, ...keys) {
  for (const key of keys) {
    if (stats[key]?.displayValue !== undefined) return stats[key].displayValue;
  }
  return "-";
}

function statValue(stats, key, fallbackKey, fallback) {
  return Number(stats[key]?.value ?? stats[fallbackKey]?.value ?? fallback);
}

function statNumber(stats, ...keys) {
  for (const key of keys) {
    const value = Number(stats[key]?.value ?? stats[key]?.displayValue);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

// ── Utilities ─────────────────────────────────────────────────
function settledValue(result, fallback) {
  return result.status === "fulfilled" ? result.value : fallback;
}

function uniqueResults(results) {
  const seen = new Set();
  return results.filter((item) => {
    const key = [item.league, item.date.toISOString(), item.home, item.away, item.homeScore, item.awayScore].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => b.date - a.date);
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function normalizeTeamName(name) { return identityRegistry.normalizeTeamName?.(name) || teamAliases[name] || name; }

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

function cssEscape(value) {
  return window.CSS?.escape ? CSS.escape(value) : String(value).replace(/"/g, '\\"');
}

function recentRoomList() {
  try {
    const rooms = JSON.parse(localStorage.getItem("gs.recentRooms") || "[]");
    return Array.isArray(rooms) ? rooms : [];
  } catch {
    return [];
  }
}

function competitorTeamName(competitor, league) {
  if (identityRegistry.rememberCompetitor) return identityRegistry.rememberCompetitor(competitor, league);
  return normalizeTeamName(competitor?.team?.displayName || competitor?.team?.name);
}

function numberValue(value) {
  const n = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function signedNumber(value) { return value > 0 ? `+${value}` : String(value); }

function hasTableLiveScore(item) {
  return item.statusState === "in" || Number(item.homeScore) > 0 || Number(item.awayScore) > 0;
}

function wholeNumberDisplay(value) {
  const n = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? String(Math.round(n)) : value;
}

function formForTeam(results, league, team) {
  const recent = results
    .filter((item) => item.league === league && (item.home === team || item.away === team))
    .sort((a, b) => a.date - b.date)
    .slice(-5);
  if (!recent.length) return "";
  return recent.map((item) => {
    const isHome = item.home === team;
    const ts = isHome ? item.homeScore : item.awayScore;
    const os = isHome ? item.awayScore : item.homeScore;
    return ts > os ? "W" : ts < os ? "L" : "D";
  }).join("");
}

function qualificationForRank(rank, finals) {
  if (rank <= finals.protected) return { kind: "qualified", label: finals.protectedLabel };
  if (rank <= finals.qualifying) return { kind: "watch", label: finals.qualifyingLabel };
  return { kind: "outside", label: "Outside" };
}

function diffDelta(value, league) {
  const n = numberValue(value);
  return league === "AFL" ? n - 100 : n;
}

function diffBarTemplate(value, league, scale) {
  const delta = diffDelta(value, league);
  const direction = delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral";
  const size = Math.min(50, Math.round((Math.abs(delta) / scale) * 50));
  const display = league === "AFL" ? wholeNumberDisplay(value) : value;
  return `
    <span class="diff-visual ${direction}" style="--bar-size: ${size}%">
      <span class="diff-track" aria-hidden="true"><span></span></span>
      <span class="diff-number">${display}</span>
    </span>
  `;
}

function qualificationBadge(qualification) {
  const cn = qualification.kind === "outside" ? "outside" : qualification.kind === "watch" ? "watch" : "";
  return `<span class="qualification ${cn}">${qualification.label}</span>`;
}

function formTemplate(form) {
  if (!form || form === "-") return "-";
  return `<span class="form-strip">${String(form).split("").map((letter) => {
    const type = letter === "W" ? "win" : letter === "L" ? "loss" : "draw";
    return `<span class="form-dot ${type}">${letter}</span>`;
  }).join("")}</span>`;
}

function liveStatusText(item) {
  if (item.statusState === "pre") return "Kickoff due";
  const detail = item.statusDetail && !/^(live|in progress)$/i.test(item.statusDetail) ? item.statusDetail : "";
  const clock = item.clock && item.clock !== "0:00" && !detail.includes(item.clock) ? item.clock : "";
  return ["Live", detail, clock].filter(Boolean).join(" · ");
}

function updateModeControls() {
  rangeControlEl.classList.toggle("is-hidden", state.mode === "tables" || state.mode === "live");
  const labels = state.mode === "results"
    ? { next: "Recent", weekend: "7 days", 7: "30 days", 21: "Season" }
    : { next: "Next", weekend: "Weekend", 7: "7 days", 21: "Season" };
  rangeLabelEl.textContent = state.mode === "results" ? "Range" : "Window";
  document.querySelectorAll("#window-filters button").forEach((btn) => {
    btn.textContent = labels[btn.dataset.window];
  });
  if (state.mode === "live") {
    sectionKickerMainEl.textContent = "Live";
    fixturesTitleEl.textContent = "Live games";
  } else if (state.mode === "fixtures") {
    sectionKickerMainEl.textContent = "Schedule";
    fixturesTitleEl.textContent = "Upcoming kickoffs";
  } else if (state.mode === "results") {
    sectionKickerMainEl.textContent = "Results";
    fixturesTitleEl.textContent = "Recent results";
  } else {
    sectionKickerMainEl.textContent = "Tables";
    fixturesTitleEl.textContent = "Competition tables";
  }
}

function populateTeamSelect() {
  const selected = state.selectedTeam;
  const prefs = state.competition === "all" ? preferredCompetitionSet() : null;
  const entries = state.competition === "all"
    ? Object.entries(leagueTeams).filter(([league, names]) => names.length && (!prefs || prefs.has(league)))
    : [[state.competition, leagueTeams[state.competition] || []]];
  teamSelectEl.innerHTML = `
    <option value="all">All teams</option>
    ${entries.map(([league, names]) => names.length ? `
      <optgroup label="${league}">
        ${names.map((name) => `<option value="${name}">${name}</option>`).join("")}
      </optgroup>
    ` : "").join("")}
  `;
  teamSelectEl.value = selected !== "all" && entries.some(([, names]) => names.includes(selected)) ? selected : "all";
  state.selectedTeam = teamSelectEl.value;
}

function preferredCompetitionSet() {
  const prefs = window.gs?.auth?.profile?.preferred_competitions;
  return Array.isArray(prefs) && prefs.length ? new Set(prefs) : null;
}

function teamLeague(team) {
  return Object.entries(leagueTeams).find(([, names]) => names.includes(team))?.[0] || "";
}

function teamMatches(item, team) {
  return item.home === team || item.away === team;
}

function lastMeetingFor(item) {
  if (item.isPlaceholder) return null;
  const historyMatch = liveState.history
    .filter((r) => r.league === item.league && r.date < item.date && sameTeams(r, item))
    .sort((a, b) => b.date - a.date)[0];
  return historyMatch || item.lastMeeting || null;
}

function sameTeams(a, b) {
  return (a.home === b.home && a.away === b.away) || (a.home === b.away && a.away === b.home);
}

function groupByDate(items) {
  return items.reduce((groups, item) => {
    const key = formatDateHeading(item.date);
    groups[key] = groups[key] || [];
    groups[key].push(item);
    return groups;
  }, {});
}

function displayTimeZoneObj() {
  const zone = normalizeTimeZone(state.timeZone);
  return {
    zone,
    label: timeZoneShortLabel(zone),
    description: timeZoneDescription(zone),
  };
}

function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIME_ZONE;
}

function normalizeTimeZone(value) {
  const zone = TIME_ZONE_ALIASES[value] || value || FALLBACK_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("en-NZ", { timeZone: zone }).format(new Date());
    return zone;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}

function populateTimeZoneSelect() {
  const select = document.getElementById("settings-tz-select");
  if (!select) return;
  const browserZone = browserTimeZone();
  const supported = typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("timeZone")
    : [];
  const zones = [...new Set([browserZone, ...FEATURED_TIME_ZONES, ...supported].map(normalizeTimeZone))];
  select.innerHTML = zones.map((zone) => `<option value="${zone}">${timeZoneOptionLabel(zone, zone === browserZone)}</option>`).join("");
  syncTimeZoneSelect();
}

function syncTimeZoneSelect() {
  const select = document.getElementById("settings-tz-select");
  if (!select) return;
  const zone = normalizeTimeZone(state.timeZone);
  if (![...select.options].some((option) => option.value === zone)) {
    select.add(new Option(timeZoneOptionLabel(zone, false), zone), 0);
  }
  select.value = zone;
}

function timeZoneShortLabel(zone) {
  if (zone === "Pacific/Auckland") return "NZT";
  if (zone === "Australia/Sydney") return "AEST";
  if (zone === "UTC") return "UTC";
  const parts = new Intl.DateTimeFormat("en-NZ", { timeZone: zone, timeZoneName: "short" }).formatToParts(new Date());
  return parts.find((part) => part.type === "timeZoneName")?.value || timeZoneCity(zone);
}

function timeZoneDescription(zone) {
  return `${timeZoneCity(zone)} time`;
}

function timeZoneOptionLabel(zone, isBrowserZone) {
  const suffix = isBrowserZone ? " (your browser)" : "";
  return `${timeZoneCity(zone)} - ${timeZoneShortLabel(zone)}${suffix}`;
}

function timeZoneCity(zone) {
  if (zone === "UTC") return "UTC";
  return zone.split("/").pop().replaceAll("_", " ");
}

function formatTime(date) {
  const tz = displayTimeZoneObj();
  return new Intl.DateTimeFormat("en-NZ", {
    timeZone: tz.zone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date)).replace(/\s/, " ").toLowerCase() + " " + tz.label;
}

function formatDay(date) {
  const tz = displayTimeZoneObj();
  return new Intl.DateTimeFormat("en-NZ", {
    timeZone: tz.zone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(date));
}

function formatDateHeading(date) {
  const tz = displayTimeZoneObj();
  return new Intl.DateTimeFormat("en-NZ", {
    timeZone: tz.zone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(date));
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat("en-NZ", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value instanceof Date ? value : new Date(value));
}

function formatEspnDateKey(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date).replaceAll("-", "");
}

function refreshRenderedTimes() {
  document.querySelectorAll("[data-kickoff-utc]").forEach((el) => {
    el.textContent = formatTime(new Date(el.dataset.kickoffUtc));
  });
}

function dateAttr(date) { return new Date(date).toISOString(); }

function matchKey(item) {
  return item.id ? `espn:${item.id}` : legacyMatchKey(item);
}

function legacyMatchKey(item) {
  return [item.league, [item.home, item.away].sort().join("/"), dateAttr(item.date)].join("|");
}

function timeUntil(date) {
  const ms = date - new Date();
  if (ms <= 0) return "Now";
  const mins = Math.floor(ms / 60000);
  const days = Math.floor(mins / 1440);
  const hrs = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (days > 0) return `${days}d ${hrs}h`;
  if (hrs > 0) return `${hrs}h ${m}m`;
  return `${m}m`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function daysBetween(start, end) {
  return Math.floor((end - start) / (24 * 60 * 60 * 1000));
}

function logoPath(name, league) {
  const sharedLogo = identityRegistry.logoForTeam?.(name, league);
  if (sharedLogo) return sharedLogo;
  if (logoOverrides[name]) return logoOverrides[name];
  const prefix = { NRL: "nrl", AFL: "afl", "Super Rugby": "super-rugby", "FIFA World Cup": "wc" }[league] || "sports";
  const ext = league === "Super Rugby" ? "png" : "svg";
  return `assets/logos/${prefix}-${slugify(name)}.${ext}`;
}

function teamIconHtml(name, league, className = "strip-logo", code = "") {
  if (identityRegistry.iconHtmlForTeam) {
    return identityRegistry.iconHtmlForTeam(name, league, { className, code });
  }
  const logo = logoPath(name, league);
  return `<span class="${className}" aria-label="${name} logo"><img src="${logo}" alt="${name} logo" loading="lazy" onerror="this.parentElement.dataset.code='${code || name.slice(0, 3).toUpperCase()}';this.remove()"></span>`;
}

function slugify(value) {
  return value.toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function setActive(activeButton, parentSelector) {
  document.querySelectorAll(`${parentSelector} button`).forEach((btn) => {
    btn.classList.toggle("active", btn === activeButton);
  });
}
