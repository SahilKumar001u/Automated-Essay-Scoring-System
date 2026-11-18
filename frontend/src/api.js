const TOKEN_KEY = "aes_token";
const USER_KEY = "aes_user";

export const session = {
  token: () => localStorage.getItem(TOKEN_KEY),
  user: () => JSON.parse(localStorage.getItem(USER_KEY) || "null"),
  save: ({ access_token, user }) => {
    localStorage.setItem(TOKEN_KEY, access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

// FastAPI sends `detail` as a string, or as a list of field errors for validation failures
function errorMessage(data, status) {
  const detail = data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((d) => `${d.loc?.at(-1) ?? "input"}: ${d.msg.replace(/^Value error, /, "")}`).join(". ");
  return `Request failed (${status})`;
}

/** api("/path", { method, body: object -> JSON, form: FormData }) */
export async function api(path, { method = "GET", body, form } = {}) {
  const headers = {};
  if (session.token()) headers.Authorization = `Bearer ${session.token()}`;
  if (body) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: form ?? (body && JSON.stringify(body)) });
  } catch {
    throw new Error("Cannot reach the server. Check your connection and try again.");
  }
  if (res.status === 401 && session.token()) {
    // token expired or revoked: drop the session and send the user to sign in
    session.clear();
    window.location.assign("/login");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(errorMessage(data, res.status));
  return data;
}
