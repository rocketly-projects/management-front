const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields?: Record<string, string[]>,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("auth-store");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Clear auth state and redirect to login
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth-store");
      window.location.href = "/login";
    }
    throw new ApiError(401, "Sesión expirada");
  }

  if (!res.ok) {
    let message = `Error ${res.status}`;
    let fields: Record<string, string[]> | undefined;
    let data: unknown;
    try {
      const body = await res.json();
      message = body.message ?? body.error ?? message;
      fields = body.fields;
      data = body;
    } catch {}
    throw new ApiError(res.status, message, fields, data);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}
