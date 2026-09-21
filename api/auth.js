const { clearSession, hasSession, issueSession, safeEqual } = require("./_session");

function readBody(req) {
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  return req.body || {};
}

module.exports = (req, res) => {
  if (req.method === "GET") return res.status(200).json({ authenticated: hasSession(req) });
  if (req.method === "DELETE") {
    clearSession(res, req);
    return res.status(204).end();
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const configuredPassword = process.env.APP_ACCESS_PASSWORD;
  if (!configuredPassword) return res.status(500).json({ error: "APP_ACCESS_PASSWORD is not configured" });

  const password = String(readBody(req).password || "");
  if (!safeEqual(password, configuredPassword)) return res.status(401).json({ error: "Incorrect password" });

  try {
    issueSession(res, req);
  } catch (error) {
    console.error("Unable to issue session", error);
    return res.status(500).json({ error: "SESSION_SECRET is not configured" });
  }
  return res.status(200).json({ authenticated: true });
};
