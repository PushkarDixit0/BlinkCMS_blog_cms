const SESSION_STORAGE_KEY = "blogCmsSession";
const TOKEN_STORAGE_KEY = "blogCmsJwt";
const SESSION_DURATION_MS = 60 * 60 * 1000;

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );

  return atob(padded);
}

function parseJwt(token) {
  const parts = token?.split(".");

  if (parts?.length !== 3) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Url(parts[1]));
  } catch {
    return null;
  }
}

function isTokenValid(token) {
  const payload = parseJwt(token);
  const nowInSeconds = Math.floor(Date.now() / 1000);

  if (!payload || typeof payload.exp !== "number") {
    return false;
  }

  if (payload.exp <= nowInSeconds) {
    return false;
  }

  if (typeof payload.nbf === "number" && payload.nbf > nowInSeconds) {
    return false;
  }

  return true;
}

function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY));
  } catch {
    return null;
  }
}

function isSessionValid(session) {
  return Boolean(
    session?.isAuthenticated &&
      typeof session.expiresAt === "number" &&
      session.expiresAt > Date.now(),
  );
}

export function clearAuthSession() {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function getAuthState() {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  const session = getSession();
  const hasValidSession = isSessionValid(session);
  const hasValidToken = isTokenValid(token);

  if (!hasValidSession || !hasValidToken) {
    clearAuthSession();

    return {
      isAuthenticated: false,
      reason: !hasValidSession ? "invalid-session" : "invalid-token",
    };
  }

  return {
    isAuthenticated: true,
    session,
    token,
  };
}

export function saveAuthSession({ token, user }) {
  if (!isTokenValid(token)) {
    clearAuthSession();
    return false;
  }

  const session = {
    isAuthenticated: true,
    user,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };

  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  localStorage.setItem(TOKEN_STORAGE_KEY, token);

  return true;
}

export function createDemoJwt(username) {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const header = { alg: "none", typ: "JWT" };
  const payload = {
    sub: username,
    role: "admin",
    iat: nowInSeconds,
    exp: nowInSeconds + SESSION_DURATION_MS / 1000,
  };
  const encode = (value) =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  return `${encode(header)}.${encode(payload)}.demo-signature`;
}
