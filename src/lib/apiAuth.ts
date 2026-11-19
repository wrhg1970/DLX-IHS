import { auth } from "./firebase";

export async function authFetch(input: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  const user = auth.currentUser;
  if (user) {
    headers.set("Authorization", `Bearer ${await user.getIdToken()}`);
  }
  return fetch(input, { ...init, headers });
}
