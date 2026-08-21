// Authentication Client Module matching login.js and publicClient.js

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  token: string;
}

const AUTH_STORAGE_KEY = "sajilo_patra_auth_user";
const authListeners = new Set<(user: AuthUser | null) => void>();

export function getStoredAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    // 1. Check tab-scoped sessionStorage first for multi-tab account isolation
    const sessionRaw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (sessionRaw) {
      return JSON.parse(sessionRaw);
    }
    // 2. Fall back to localStorage
    const localRaw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!localRaw) return null;
    const user = JSON.parse(localRaw);
    if (user) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    }
    return user;
  } catch {
    return null;
  }
}

export function setStoredAuthUser(user: AuthUser | null): void {
  if (typeof window === "undefined") return;
  if (!user) {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } else {
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  }
  authListeners.forEach((cb) => cb(user));
}

export function clearAuthSession(): void {
  setStoredAuthUser(null);
}

export function subscribeAuth(callback: (user: AuthUser | null) => void): () => void {
  authListeners.add(callback);
  return () => {
    authListeners.delete(callback);
  };
}

export async function loginUser(email: string, password: string): Promise<{ user?: AuthUser; error?: string }> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { error: data.error || "Login failed" };
    }

    const authUser: AuthUser = {
      id: data.user?.id || `user-${data.username}`,
      email: data.user?.email || email,
      username: data.username || email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "_"),
      token: data.token || data.session?.access_token || `dev-token-${data.username}`,
    };

    setStoredAuthUser(authUser);
    return { user: authUser };
  } catch (err: any) {
    return { error: err.message || "Network error during login" };
  }
}

export async function signupUser(
  email: string,
  password: string,
  username: string
): Promise<{ user?: AuthUser; error?: string }> {
  try {
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, username: cleanUsername }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { error: data.error || "Signup failed" };
    }

    const authUser: AuthUser = {
      id: data.user?.id || `user-${data.username || cleanUsername}`,
      email: data.user?.email || email,
      username: data.username || cleanUsername,
      token: data.token || data.session?.access_token || `dev-token-${cleanUsername}`,
    };

    setStoredAuthUser(authUser);
    return { user: authUser };
  } catch (err: any) {
    return { error: err.message || "Network error during signup" };
  }
}

export function logoutUser(): void {
  setStoredAuthUser(null);
}

