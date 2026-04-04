const viteEnv = (import.meta as ImportMeta & {
  env?: Record<string, string | undefined>;
}).env;

const API_BASE_URL =
  viteEnv?.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000/api/v1";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
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

async function apiRequestForm<T>(
  path: string,
  formData: FormData,
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: formData,
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

interface LogoutApiResponse {
  success: boolean;
  message: string;
  data: {
    loggedOutAt: string;
    userId: string | number;
  };
}

export interface MessageAttachmentApiItem {
  id: string | number;
  file_url: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
}

export interface MessageReactionApiItem {
  id: string | number;
  emoji: string;
  user_id: string | number;
  user?: {
    id: string | number;
    username: string;
    display_name?: string | null;
  };
}

export interface MessageApiItem {
  id: string | number;
  content: string;
  created_at: string;
  edited_at?: string | null;
  author_id?: string | number;
  channel_id?: string | number;
  author?: {
    id: string | number;
    username: string;
    display_name?: string | null;
  };
  attachments?: MessageAttachmentApiItem[];
  reactions?: MessageReactionApiItem[];
}

interface ListMessagesResponse {
  messages: MessageApiItem[];
  count: number;
}

interface SendMessageResponse {
  message: MessageApiItem;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
}

interface PinnedMessagesResponse {
  pinnedMessages: Array<MessageApiItem & { pinned_at?: string; pinned_by?: string }>;
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

export const logoutUser = async (token: string) => {
  return apiRequest<LogoutApiResponse>("/auth/logout", {
    method: "POST",
    token,
  });
};

export const getServers = async (token: string) => {
  return apiRequest<ServersApiResponse>("/servers", { token });
};

export const getChannelsByServer = async (serverId: string, token: string) => {
  return apiRequest<ChannelsApiResponse>(`/servers/${serverId}/channels`, { token });
};

export const getMessagesByChannel = async (
  serverId: string,
  channelId: string,
  token: string,
  params?: { limit?: number; before?: string; after?: string }
) => {
  const search = new URLSearchParams();
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.before) search.set("before", params.before);
  if (params?.after) search.set("after", params.after);

  const query = search.toString();
  const suffix = query ? `?${query}` : "";

  return apiRequest<ListMessagesResponse>(
    `/servers/${serverId}/channels/${channelId}/messages${suffix}`,
    { token }
  );
};

export const sendMessageToChannel = async (options: {
  serverId: string;
  channelId: string;
  content: string;
  token: string;
  attachments?: File[];
}) => {
  const { serverId, channelId, content, token, attachments } = options;

  if (attachments && attachments.length > 0) {
    const formData = new FormData();
    formData.append("content", content);
    attachments.forEach((file) => formData.append("attachments", file));

    return apiRequestForm<SendMessageResponse>(
      `/servers/${serverId}/channels/${channelId}/messages`,
      formData,
      token
    );
  }

  return apiRequest<SendMessageResponse>(
    `/servers/${serverId}/channels/${channelId}/messages`,
    {
      method: "POST",
      token,
      body: { content },
    }
  );
};

export const getAttachmentDownloadUrl = async (options: {
  serverId: string;
  channelId: string;
  attachmentId: string;
  token: string;
}) => {
  const { serverId, channelId, attachmentId, token } = options;

  return apiRequest<{ downloadUrl: string }>(
    `/servers/${serverId}/channels/${channelId}/messages/attachments/${attachmentId}/download-url`,
    { token }
  );
};

export const updateMessageContent = async (options: {
  serverId: string;
  channelId: string;
  messageId: string;
  content: string;
  token: string;
}) => {
  const { serverId, channelId, messageId, content, token } = options;
  return apiRequest<{ message: MessageApiItem }>(
    `/servers/${serverId}/channels/${channelId}/messages/${messageId}`,
    {
      method: "PUT",
      token,
      body: { content },
    }
  );
};

export const deleteMessageAttachments = async (options: {
  serverId: string;
  channelId: string;
  messageId: string;
  deleteAttachmentIds: string[];
  token: string;
}) => {
  const { serverId, channelId, messageId, deleteAttachmentIds, token } = options;
  return apiRequest<{ message: MessageApiItem; deletedAttachmentIds: string[] }>(
    `/servers/${serverId}/channels/${channelId}/messages/${messageId}`,
    {
      method: "PUT",
      token,
      body: { deleteAttachmentIds },
    }
  );
};

export const deleteMessageById = async (options: {
  serverId: string;
  channelId: string;
  messageId: string;
  token: string;
}) => {
  const { serverId, channelId, messageId, token } = options;
  return apiRequest<{ deleted: boolean; message: MessageApiItem }>(
    `/servers/${serverId}/channels/${channelId}/messages/${messageId}`,
    {
      method: "DELETE",
      token,
    }
  );
};

export const addReactionToMessage = async (options: {
  serverId: string;
  channelId: string;
  messageId: string;
  emoji: string;
  token: string;
}) => {
  const { serverId, channelId, messageId, emoji, token } = options;
  return apiRequest<{ success: boolean; message: string }>(
    `/servers/${serverId}/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
    {
      method: "PUT",
      token,
    }
  );
};

export const removeReactionFromMessage = async (options: {
  serverId: string;
  channelId: string;
  messageId: string;
  emoji: string;
  token: string;
}) => {
  const { serverId, channelId, messageId, emoji, token } = options;
  return apiRequest<{ success: boolean; message: string }>(
    `/servers/${serverId}/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
    {
      method: "DELETE",
      token,
    }
  );
};

export const pinMessage = async (options: {
  serverId: string;
  channelId: string;
  messageId: string;
  token: string;
}) => {
  const { serverId, channelId, messageId, token } = options;
  return apiRequest<{ success: boolean; message: string }>(
    `/servers/${serverId}/channels/${channelId}/messages/${messageId}/pin`,
    {
      method: "PUT",
      token,
    }
  );
};

export const unpinMessage = async (options: {
  serverId: string;
  channelId: string;
  messageId: string;
  token: string;
}) => {
  const { serverId, channelId, messageId, token } = options;
  return apiRequest<{ success: boolean; message: string }>(
    `/servers/${serverId}/channels/${channelId}/messages/${messageId}/pin`,
    {
      method: "DELETE",
      token,
    }
  );
};

export const getPinnedMessages = async (
  serverId: string,
  channelId: string,
  token: string
) => {
  return apiRequest<PinnedMessagesResponse>(
    `/servers/${serverId}/channels/${channelId}/messages/pinned`,
    { token }
  );
};

export { ApiError };
