const { neon } = require("@neondatabase/serverless");
const { hasSession } = require("./_session");

function readBody(req) {
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  return req.body || {};
}

function sanitizeLibrary(value) {
  const out = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  Object.entries(value).slice(0, 5000).forEach(([key, entry]) => {
    if (!/^a2z-\d+$/.test(key)) return;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return;
    const approaches = Array.isArray(entry.approaches)
      ? entry.approaches.slice(0, 24).filter(a => a && typeof a === "object" && !Array.isArray(a))
      : [];
    if (!approaches.length) return;
    out[key] = { approaches };
  });
  return out;
}

// The table is created once per cold start instead of on every request.
let ensureTablePromise = null;
function ensureTable(sql) {
  if (!ensureTablePromise) {
    ensureTablePromise = sql`CREATE TABLE IF NOT EXISTS dsa_solutions (
      id SMALLINT PRIMARY KEY CHECK (id = 1),
      solutions JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`.catch(error => {
      ensureTablePromise = null;
      throw error;
    });
  }
  return ensureTablePromise;
}

module.exports = async (req, res) => {
  if (!hasSession(req)) return res.status(401).json({ error: "Sign in required" });
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: "DATABASE_URL is not configured" });
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const sql = neon(process.env.DATABASE_URL);
    await ensureTable(sql);

    if (req.method === "GET") {
      const rows = await sql`SELECT solutions, updated_at FROM dsa_solutions WHERE id = 1`;
      return res.status(200).json({ solutions: rows[0]?.solutions || null, updatedAt: rows[0]?.updated_at || null });
    }

    const library = sanitizeLibrary(readBody(req).solutions);
    const count = Object.keys(library).length;
    if (!count) return res.status(400).json({ error: "No valid solution entries in payload" });
    const payload = JSON.stringify(library);
    if (payload.length > 3000000) return res.status(413).json({ error: "Solution library is too large" });
    await sql`INSERT INTO dsa_solutions (id, solutions, updated_at)
      VALUES (1, ${payload}::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET solutions = EXCLUDED.solutions, updated_at = NOW()`;
    return res.status(200).json({ saved: true, count });
  } catch (error) {
    console.error("Unable to persist solution library", error);
    return res.status(500).json({ error: "Unable to save solution library" });
  }
};
