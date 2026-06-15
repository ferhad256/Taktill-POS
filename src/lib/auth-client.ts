import { AppError } from "../types";

const API = import.meta.env.VITE_API_URL || "/api/v1";
const USER_TOKEN_KEY = "taktill:token"; // owner/manager — persists across tabs
const CASHIER_TOKEN_KEY = "taktill:cashier-token"; // cashier — clears on tab close

export function getToken(): string | null {
  return (
    sessionStorage.getItem(CASHIER_TOKEN_KEY) ||
    localStorage.getItem(USER_TOKEN_KEY)
  );
}

export function setUserToken(token: string) {
  localStorage.setItem(USER_TOKEN_KEY, token);
  sessionStorage.removeItem(CASHIER_TOKEN_KEY);
}

export function setCashierToken(token: string) {
  sessionStorage.setItem(CASHIER_TOKEN_KEY, token);
  localStorage.removeItem(USER_TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(USER_TOKEN_KEY);
  sessionStorage.removeItem(CASHIER_TOKEN_KEY);
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

/**
 * Typed fetch against the Taktill REST API. Adds the bearer token, parses the
 * `{ success, data, error, details }` envelope, and throws AppError on failure.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  let body: Envelope<T>;
  try {
    body = await res.json();
  } catch {
    throw new AppError("NETWORK_ERROR", res.status);
  }

  if (!res.ok || !body.success) {
    throw new AppError(body.error ?? "REQUEST_FAILED", res.status, body.details);
  }
  return body.data as T;
}
