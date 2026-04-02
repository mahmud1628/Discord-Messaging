const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000/api/v1";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
};

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const parseResponse = async (response: Response) => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return null;
};

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    const message =
      payload?.message || payload?.error || `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  displayName: string;
  dateOfBirth: string;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  dateOfBirth: string;
  createdAt: string;
}

interface AuthApiResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    tokenType: string;
    expiresAt: string;
    user: AuthUser;
  };
}

export interface ServerApiItem {
  id: string | number;
  name: string;
  owner_id: string | number;
  created_at: string;
}

interface ServersApiResponse {
  servers: ServerApiItem[];
  count: number;
}

export interface ChannelApiItem {
  id: string | number;
  server_id: string | number;
  name: string;
  created_at: string;
}

interface ChannelsApiResponse {
  channels: ChannelApiItem[];
  count: number;
}

export const registerUser = async (payload: RegisterPayload) => {
  return apiRequest<AuthApiResponse>("/auth/register", {
    method: "POST",
    body: payload,
  });
};

export const loginUser = async (identifier: string, password: string) => {
  return apiRequest<AuthApiResponse>("/auth/login", {
    method: "POST",
    body: { identifier, password },
  });
};

export const getServers = async (token: string) => {
  return apiRequest<ServersApiResponse>("/servers", { token });
};

export const getChannelsByServer = async (serverId: string, token: string) => {
  return apiRequest<ChannelsApiResponse>(`/servers/${serverId}/channels`, { token });
};

export { ApiError };
