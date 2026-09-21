const crypto = require("crypto");

const COOKIE_NAME = "dsa_tracker_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is not configured.");
  return value;
}

function sign(value) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map(part => {
    const index = part.indexOf("=");
    return index === -1 ? [] : [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(pair => pair.length));
}

function safeEqual(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function isSecureRequest(req) {
  const proto = String(req?.headers?.["x-forwarded-proto"] || "").split(",")[0].trim().toLowerCase();
  if (proto) return proto === "https";
  return Boolean(process.env.VERCEL);
}

function issueSession(res, req) {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + MAX_AGE_SECONDS * 1000 })).toString("base64url");
  const value = `${payload}.${sign(payload)}`;
  const secure = isSecureRequest(req) ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=${value}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}`);
}

function clearSession(res, req) {
  const secure = isSecureRequest(req) ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=0`);
}

function hasSession(req) {
  try {
    const value = parseCookies(req.headers.cookie)[COOKIE_NAME];
    if (!value) return false;
    const [payload, signature] = value.split(".");
    if (!payload || !signature || !safeEqual(signature, sign(payload))) return false;
    return JSON.parse(Buffer.from(payload, "base64url").toString()).exp > Date.now();
  } catch {
    return false;
  }
}

module.exports = { clearSession, hasSession, issueSession, safeEqual };
