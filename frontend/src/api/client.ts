import type {
  AuthResponse,
  User,
  PlansResponse,
  CheckoutRequest,
  Agreement,
  AgreementDetail,
  RegisterRequest,
  LoginRequest,
  ApiError,
} from '@bnpl/shared';

const TOKEN_KEY = 'bnpl.token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** Thrown for any non-2xx response; carries the server-provided message + status. */
export class ApiRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  /** Skip the Authorization header (auth endpoints don't need it). */
  anonymous?: boolean;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, anonymous = false } = opts;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (!anonymous) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as ApiError;
      if (data && typeof data.error === 'string') message = data.error;
    } catch {
      // non-JSON error body; keep the default message
    }
    throw new ApiRequestError(message, res.status);
  }

  // 204 / empty bodies are not expected on this API, but guard anyway.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---- auth ----
export function register(payload: RegisterRequest): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: payload,
    anonymous: true,
  });
}

export function login(payload: LoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: payload,
    anonymous: true,
  });
}

export function me(): Promise<{ user: User }> {
  return request<{ user: User }>('/api/auth/me');
}

// ---- plans + checkout ----
export function getPlans(amount: number): Promise<PlansResponse> {
  return request<PlansResponse>(`/api/plans?amount=${encodeURIComponent(amount)}`);
}

export function checkout(body: CheckoutRequest): Promise<{ agreement: Agreement }> {
  return request<{ agreement: Agreement }>('/api/checkout', {
    method: 'POST',
    body,
  });
}

// ---- agreements ----
export function getAgreements(): Promise<{ agreements: Agreement[] }> {
  return request<{ agreements: Agreement[] }>('/api/agreements');
}

export function getAgreement(id: string): Promise<AgreementDetail> {
  return request<AgreementDetail>(`/api/agreements/${encodeURIComponent(id)}`);
}
