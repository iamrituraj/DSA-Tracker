const { neon } = require("@neondatabase/serverless");
const { hasSession } = require("./_session");

const emptyState = { progress: {}, notes: {}, solutions: {}, activity: {}, settings: { dailyGoal: 3, theme: "light" } };
const object = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};

function readBody(req) {
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  return req.body || {};
}

function sanitize(value) {
  const state = object(value);
  return {
    progress: object(state.progress),
    notes: object(state.notes),
    solutions: object(state.solutions),
    activity: object(state.activity),
    settings: { ...emptyState.settings, ...object(state.settings) },
  };
}

module.exports = async (req, res) => {
  if (!hasSession(req)) return res.status(401).json({ error: "Sign in required" });
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: "DATABASE_URL is not configured" });
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`CREATE TABLE IF NOT EXISTS dsa_tracker_state (
      id SMALLINT PRIMARY KEY CHECK (id = 1),
      state JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;

    if (req.method === "GET") {
      const rows = await sql`SELECT state, updated_at FROM dsa_tracker_state WHERE id = 1`;
      return res.status(200).json({ state: rows[0]?.state || null, updatedAt: rows[0]?.updated_at || null });
    }

    const state = sanitize(readBody(req).state);
    await sql`INSERT INTO dsa_tracker_state (id, state, updated_at)
      VALUES (1, ${JSON.stringify(state)}::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`;
    return res.status(200).json({ saved: true });
  } catch (error) {
    console.error("Unable to persist tracker state", error);
    return res.status(500).json({ error: "Unable to save cloud data" });
  }
};
