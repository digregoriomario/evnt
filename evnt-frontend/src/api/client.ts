import { API_BASE_URL, API_BASE_URLS } from "./config";

let authToken: string | null = null;
let activeBaseUrl = API_BASE_URL;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};
export const getAuthToken = () => authToken;
export const getActiveApiBaseUrl = () => activeBaseUrl;

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
};

function orderedBaseUrls() {
  return [activeBaseUrl, ...API_BASE_URLS].filter(
    (baseUrl, index, all): baseUrl is string => !!baseUrl && all.indexOf(baseUrl) === index
  );
}

async function requestFromBaseUrl<T>(
  baseUrl: string,
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, auth = true, signal } = options;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: { error?: string; details?: unknown } | undefined;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = undefined;
  }

  if (!res.ok) {
    const message = (data && (data.error as string)) || `Request failed (${res.status})`;
    throw new ApiError(res.status, message, data?.details);
  }
  if (text && data === undefined) {
    throw new Error(`Invalid JSON response from ${baseUrl}`);
  }

  return data as T;
}

// Thin fetch wrapper: JSON in/out, bearer auth, typed errors.
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let lastNetworkError: unknown;

  for (const baseUrl of orderedBaseUrls()) {
    try {
      const data = await requestFromBaseUrl<T>(baseUrl, path, options);
      activeBaseUrl = baseUrl;
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      lastNetworkError = error;
    }
  }

  throw lastNetworkError instanceof Error ? lastNetworkError : new Error("Backend not reachable");
}

// Quick reachability check used before requesting live backend data.
export async function isBackendReachable(timeoutMs = 2500): Promise<boolean> {
  for (const baseUrl of orderedBaseUrls()) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      await requestFromBaseUrl(baseUrl, "/health", { auth: false, signal: controller.signal });
      activeBaseUrl = baseUrl;
      return true;
    } catch {
      // Try the next candidate URL.
    } finally {
      clearTimeout(timer);
    }
  }

  return false;
}
