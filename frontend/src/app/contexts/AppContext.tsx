import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { getChannelsByServer, getServers } from "../utils/api";

export interface Message {
  id: string;
  content: string;
  userId: string;
  channelId: string;
  createdAt: string;
  updatedAt?: string;
  edited: boolean;
  reactions: Reaction[];
  pinned: boolean;
}

export interface Reaction {
  emoji: string;
  userIds: string[];
  count: number;
}

export interface Channel {
  id: string;
  name: string;
  serverId: string;
  type: "text";
}

export interface Server {
  id: string;
  name: string;
  icon?: string;
  iconColor: string;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  status?: "online" | "offline" | "away";
}

interface AppContextType {
  servers: Server[];
  channels: Channel[];
  messages: Message[];
  users: UserProfile[];
  selectedServerId: string | null;
  selectedChannelId: string | null;
  pinnedMessages: Message[];
  setSelectedServer: (serverId: string) => void;
  setSelectedChannel: (channelId: string) => void;
  sendMessage: (content: string, channelId: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  toggleReaction: (messageId: string, emoji: string, userId: string) => Promise<void>;
  togglePin: (messageId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Mock data
const mockUsers: UserProfile[] = [
  {
    id: "user-1",
    username: "john_doe",
    displayName: "John Doe",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=john",
    status: "online",
  },
  {
    id: "user-2",
    username: "jane_smith",
    displayName: "Jane Smith",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jane",
    status: "online",
  },
  {
    id: "user-3",
    username: "bob_wilson",
    displayName: "Bob Wilson",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=bob",
    status: "away",
  },
];

const mockMessages: Message[] = [
  {
    id: "msg-1",
    content: "Hey everyone! Welcome to the server 🎉",
    userId: "user-1",
    channelId: "channel-1",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    edited: false,
    reactions: [
      { emoji: "👋", userIds: ["user-2", "user-3"], count: 2 },
      { emoji: "🎉", userIds: ["user-2"], count: 1 },
    ],
    pinned: true,
  },
  {
    id: "msg-2",
    content: "Thanks for having me! This is awesome.",
    userId: "user-2",
    channelId: "channel-1",
    createdAt: new Date(Date.now() - 3000000).toISOString(),
    edited: false,
    reactions: [],
    pinned: false,
  },
  {
    id: "msg-3",
    content: "Has anyone tried the new feature?",
    userId: "user-3",
    channelId: "channel-1",
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    edited: false,
    reactions: [{ emoji: "🤔", userIds: ["user-1"], count: 1 }],
    pinned: false,
  },
  {
    id: "msg-4",
    content: "Yes! It's really cool. Let me know if you need help setting it up.",
    userId: "user-1",
    channelId: "channel-1",
    createdAt: new Date(Date.now() - 900000).toISOString(),
    edited: true,
    reactions: [{ emoji: "👍", userIds: ["user-2", "user-3"], count: 2 }],
    pinned: false,
  },
  {
    id: "msg-5",
    content: "That would be great, thanks!",
    userId: "user-3",
    channelId: "channel-1",
    createdAt: new Date(Date.now() - 300000).toISOString(),
    edited: false,
    reactions: [],
    pinned: false,
  },
];

const SERVER_COLORS = ["#5865F2", "#57F287", "#FEE75C", "#EB459E", "#ED4245", "#3BA55D"];

const getServerColor = (serverId: string) => {
  let hash = 0;
  for (let i = 0; i < serverId.length; i += 1) {
    hash = (hash << 5) - hash + serverId.charCodeAt(i);
    hash |= 0;
  }

  const index = Math.abs(hash) % SERVER_COLORS.length;
  return SERVER_COLORS[index];
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token } = useAuth();
  const [servers, setServers] = useState<Server[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [users] = useState<UserProfile[]>(mockUsers);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setServers([]);
      setChannels([]);
      setSelectedServerId(null);
      setSelectedChannelId(null);
      return;
    }

    const loadServersAndChannels = async () => {
      try {
        const serverResponse = await getServers(token);
        const mappedServers: Server[] = serverResponse.servers.map((server) => {
          const id = String(server.id);
          return {
            id,
            name: server.name,
            iconColor: getServerColor(id),
          };
        });

        setServers(mappedServers);

        if (mappedServers.length === 0) {
          setChannels([]);
          return;
        }

        const channelResponses = await Promise.all(
          mappedServers.map((server) => getChannelsByServer(server.id, token))
        );

        const allChannels: Channel[] = channelResponses.flatMap((response) =>
          response.channels.map((channel) => ({
            id: String(channel.id),
            name: channel.name,
            serverId: String(channel.server_id),
            type: "text" as const,
          }))
        );

        setChannels(allChannels);
      } catch (error) {
        console.error("Failed to load servers/channels", error);
        setServers([]);
        setChannels([]);
      }
    };

    loadServersAndChannels();
  }, [isAuthenticated, token]);

  const pinnedMessages = useMemo(
    () => messages.filter((msg) => msg.pinned && msg.channelId === selectedChannelId),
    [messages, selectedChannelId]
  );

  const setSelectedServer = (serverId: string) => {
    setSelectedServerId(serverId);
  };

  const setSelectedChannel = (channelId: string) => {
    setSelectedChannelId(channelId);
  };

  const sendMessage = async (content: string, channelId: string) => {
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 300));

    const newMessage: Message = {
      id: "msg-" + Date.now(),
      content,
      userId: "user-1",
      channelId,
      createdAt: new Date().toISOString(),
      edited: false,
      reactions: [],
      pinned: false,
    };

    setMessages((prev) => [...prev, newMessage]);
  };

  const editMessage = async (messageId: string, content: string) => {
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 300));

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, content, edited: true, updatedAt: new Date().toISOString() }
          : msg
      )
    );
  };

  const deleteMessage = async (messageId: string) => {
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 300));

    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
  };

  const toggleReaction = async (messageId: string, emoji: string, userId: string) => {
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 100));

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;

        const existingReaction = msg.reactions.find((r) => r.emoji === emoji);

        if (existingReaction) {
          const hasReacted = existingReaction.userIds.includes(userId);

          if (hasReacted) {
            // Remove reaction
            const newUserIds = existingReaction.userIds.filter((id) => id !== userId);
            if (newUserIds.length === 0) {
              return {
                ...msg,
                reactions: msg.reactions.filter((r) => r.emoji !== emoji),
              };
            }
            return {
              ...msg,
              reactions: msg.reactions.map((r) =>
                r.emoji === emoji
                  ? { ...r, userIds: newUserIds, count: newUserIds.length }
                  : r
              ),
            };
          } else {
            // Add reaction
            return {
              ...msg,
              reactions: msg.reactions.map((r) =>
                r.emoji === emoji
                  ? {
                      ...r,
                      userIds: [...r.userIds, userId],
                      count: r.count + 1,
                    }
                  : r
              ),
            };
          }
        } else {
          // New reaction
          return {
            ...msg,
            reactions: [...msg.reactions, { emoji, userIds: [userId], count: 1 }],
          };
        }
      })
    );
  };

  const togglePin = async (messageId: string) => {
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 300));

    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, pinned: !msg.pinned } : msg))
    );
  };

  return (
    <AppContext.Provider
      value={{
        servers,
        channels,
        messages,
        users,
        selectedServerId,
        selectedChannelId,
        pinnedMessages,
        setSelectedServer,
        setSelectedChannel,
        sendMessage,
        editMessage,
        deleteMessage,
        toggleReaction,
        togglePin,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}