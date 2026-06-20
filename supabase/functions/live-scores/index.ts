import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SCOREBOARDS: Record<string, string> = {
  NRL: "https://site.api.espn.com/apis/site/v2/sports/rugby-league/3/scoreboard",
  AFL: "https://site.api.espn.com/apis/site/v2/sports/australian-football/afl/scoreboard",
  "Super Rugby": "https://site.api.espn.com/apis/site/v2/sports/rugby/242041/scoreboard",
  "FIFA World Cup": "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard",
  NFL: "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
  NBA: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
  MLB: "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard",
  NHL: "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard",
  MLS: "https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard",
};

const CACHE_KEY = "all-live-scores";
const MAX_AGE_MS = 15_000;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Supabase function environment is incomplete." }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const { data: cached } = await supabase
    .from("score_feed_cache")
    .select("payload, fetched_at")
    .eq("cache_key", CACHE_KEY)
    .maybeSingle();

  const cachedAt = cached?.fetched_at ? new Date(cached.fetched_at).getTime() : 0;
  if (cached?.payload && Date.now() - cachedAt < MAX_AGE_MS) {
    return json(cached.payload, 200, "database-cache");
  }

  const now = new Date();
  const dateRange = `${dateKey(addDays(now, -1))}-${dateKey(addDays(now, 1))}`;
  const results = await Promise.allSettled(
    Object.entries(SCOREBOARDS).map(async ([league, endpoint]) => {
      const response = await fetch(`${endpoint}?dates=${dateRange}&limit=100`, {
        headers: { "User-Agent": "Grandstand/1.0 shared score collector" },
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) throw new Error(`${league}: ESPN HTTP ${response.status}`);
      const data = await response.json();
      return { league, events: data.events || [] };
    }),
  );

  const leagues = results
    .filter((result): result is PromiseFulfilledResult<{ league: string; events: unknown[] }> =>
      result.status === "fulfilled"
    )
    .map((result) => result.value);
  const errors = results
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => result.reason?.message || "Unknown ESPN error");

  const payload = {
    fetchedAt: now.toISOString(),
    dateRange,
    leagues,
    errors,
  };

  if (leagues.length) {
    await supabase.from("score_feed_cache").upsert({
      cache_key: CACHE_KEY,
      payload,
      fetched_at: now.toISOString(),
    });
  } else if (cached?.payload) {
    return json(cached.payload, 200, "stale-database-cache");
  }

  return json(payload, leagues.length ? 200 : 502, "espn-refresh");
});

function json(payload: unknown, status = 200, source = "edge-function") {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=5, stale-while-revalidate=30",
      "X-Grandstand-Source": source,
    },
  });
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function dateKey(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("");
}
