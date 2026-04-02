import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import {
  addReactionToMessage,
  deleteMessageById,
  deleteMessageAttachments,
  getChannelsByServer,
  getMessagesByChannel,
  getPinnedMessages,
  getServers,
  MessageApiItem,
  MessageReactionApiItem,
  pinMessage,
  removeReactionFromMessage,
  sendMessageToChannel,
  unpinMessage,
  updateMessageContent,
} from "../utils/api";

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
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  id: string;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
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
  sendMessage: (content: string, channelId: string, attachments?: File[]) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessageAttachments: (messageId: string, attachmentIds: string[]) => Promise<void>;
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
  const { isAuthenticated, token, user } = useAuth();
  const [servers, setServers] = useState<Server[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<UserProfile[]>(mockUsers);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    setUsers((prev) => {
      if (prev.some((entry) => entry.id === user.id)) {
        return prev;
      }

      return [
        {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar,
          status: "online",
        },
        ...prev,
      ];
    });
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setServers([]);
      setChannels([]);
      setMessages([]);
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

  useEffect(() => {
    if (!isAuthenticated || !token || !selectedServerId || !selectedChannelId) {
      return;
    }

    let cancelled = false;

    const mapReactions = (reactions: MessageReactionApiItem[] = []) => {
      const reactionMap = new Map<string, Set<string>>();

      reactions.forEach((reaction) => {
        const emoji = String(reaction.emoji);
        const reactorId = reaction.user?.id ?? reaction.user_id;
        if (!reactionMap.has(emoji)) {
          reactionMap.set(emoji, new Set());
        }
        reactionMap.get(emoji)?.add(String(reactorId));
      });

      return Array.from(reactionMap.entries()).map(([emoji, userIds]) => ({
        emoji,
        userIds: Array.from(userIds),
        count: userIds.size,
      }));
    };

    const mapMessage = (message: MessageApiItem, fallbackUserId: string) => {
      const authorId = message.author?.id ?? message.author_id ?? fallbackUserId;

      return {
        id: String(message.id),
        content: message.content,
        userId: String(authorId),
        channelId: String(message.channel_id ?? selectedChannelId),
        createdAt: message.created_at,
        updatedAt: message.edited_at ?? undefined,
        edited: Boolean(message.edited_at),
        reactions: mapReactions(message.reactions ?? []),
        pinned: false,
        attachments: (message.attachments ?? []).map((attachment) => ({
          id: String(attachment.id),
          fileUrl: attachment.file_url,
          fileName: attachment.file_name,
          fileSize: attachment.file_size,
          mimeType: attachment.mime_type,
        })),
      };
    };

    const loadMessages = async () => {
      try {
        const [messageResponse, pinnedResponse] = await Promise.all([
          getMessagesByChannel(selectedServerId, selectedChannelId, token),
          getPinnedMessages(selectedServerId, selectedChannelId, token),
        ]);

        const fallbackUserId = user?.id ?? mockUsers[0].id;
        const pinnedIds = new Set(
          pinnedResponse.pinnedMessages.map((pinned) => String(pinned.id))
        );

        const mappedMessages = messageResponse.messages.map((message) => {
          const mapped = mapMessage(message, fallbackUserId);
          return { ...mapped, pinned: pinnedIds.has(mapped.id) };
        });

        const newUsers = new Map<string, UserProfile>();
        messageResponse.messages.forEach((message) => {
          if (message.author) {
            const id = String(message.author.id);
            newUsers.set(id, {
              id,
              username: message.author.username,
              displayName: message.author.display_name || message.author.username,
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.author.username}`,
              status: "online",
            });
          }

          (message.reactions ?? []).forEach((reaction) => {
            if (!reaction.user) return;
            const id = String(reaction.user.id);
            newUsers.set(id, {
              id,
              username: reaction.user.username,
              displayName: reaction.user.display_name || reaction.user.username,
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${reaction.user.username}`,
              status: "online",
            });
          });
        });

        if (!cancelled && newUsers.size > 0) {
          setUsers((prev) => {
            const existingIds = new Set(prev.map((entry) => entry.id));
            const merged = [...prev];
            newUsers.forEach((profile, id) => {
              if (!existingIds.has(id)) {
                merged.push(profile);
              }
            });
            return merged;
          });
        }

        if (!cancelled) {
          setMessages(mappedMessages);
        }
      } catch (error) {
        console.error("Failed to load messages", error);
        if (!cancelled) {
          setMessages([]);
        }
      }
    };

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token, selectedServerId, selectedChannelId, user]);

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

  const sendMessage = async (content: string, channelId: string, attachments?: File[]) => {
    if (!token || !selectedServerId) {
      throw new Error("Not authenticated");
    }

    const response = await sendMessageToChannel({
      serverId: selectedServerId,
      channelId,
      content,
      token,
      attachments,
    });

    const fallbackUserId = user?.id ?? mockUsers[0].id;
    const newMessage: Message = {
      id: String(response.message.id),
      content: response.message.content,
      userId: String(response.message.author_id ?? fallbackUserId),
      channelId: String(response.message.channel_id ?? channelId),
      createdAt: response.message.created_at,
      updatedAt: response.message.edited_at ?? undefined,
      edited: Boolean(response.message.edited_at),
      reactions: [],
      pinned: false,
      attachments: response.file_url
        ? [
            {
              id: "uploaded",
              fileUrl: response.file_url,
              fileName: response.file_name || "attachment",
              fileSize: response.file_size,
              mimeType: response.mime_type,
            },
          ]
        : [],
    };

    setMessages((prev) => [...prev, newMessage]);
  };

  const editMessage = async (messageId: string, content: string) => {
    if (!token || !selectedServerId || !selectedChannelId) {
      throw new Error("Not authenticated");
    }

    const response = await updateMessageContent({
      serverId: selectedServerId,
      channelId: selectedChannelId,
      messageId,
      content,
      token,
    });

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              content: response.message.content,
              edited: true,
              updatedAt: response.message.edited_at ?? new Date().toISOString(),
            }
          : msg
      )
    );
  };

  const deleteMessageAttachmentsHandler = async (
    messageId: string,
    attachmentIds: string[]
  ) => {
    if (!token || !selectedServerId || !selectedChannelId) {
      throw new Error("Not authenticated");
    }

    const response = await deleteMessageAttachments({
      serverId: selectedServerId,
      channelId: selectedChannelId,
      messageId,
      deleteAttachmentIds: attachmentIds,
      token,
    });

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;

        const removed = new Set(response.deletedAttachmentIds || attachmentIds);
        const remaining = (msg.attachments || []).filter(
          (attachment) => !removed.has(attachment.id)
        );

        return { ...msg, attachments: remaining };
      })
    );
  };

  const deleteMessage = async (messageId: string) => {
    if (!token || !selectedServerId || !selectedChannelId) {
      throw new Error("Not authenticated");
    }

    await deleteMessageById({
      serverId: selectedServerId,
      channelId: selectedChannelId,
      messageId,
      token,
    });

    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
  };

  const toggleReaction = async (messageId: string, emoji: string, userId: string) => {
    if (!token || !selectedServerId || !selectedChannelId) {
      throw new Error("Not authenticated");
    }

    const target = messages.find((msg) => msg.id === messageId);
    const existingReaction = target?.reactions.find((r) => r.emoji === emoji);
    const hasReacted = existingReaction ? existingReaction.userIds.includes(userId) : false;

    if (hasReacted) {
      await removeReactionFromMessage({
        serverId: selectedServerId,
        channelId: selectedChannelId,
        messageId,
        emoji,
        token,
      });
    } else {
      await addReactionToMessage({
        serverId: selectedServerId,
        channelId: selectedChannelId,
        messageId,
        emoji,
        token,
      });
    }

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;

        const reaction = msg.reactions.find((r) => r.emoji === emoji);
        if (!reaction) {
          return {
            ...msg,
            reactions: [...msg.reactions, { emoji, userIds: [userId], count: 1 }],
          };
        }

        const hasUser = reaction.userIds.includes(userId);
        if (hasUser) {
          const remaining = reaction.userIds.filter((id) => id !== userId);
          if (remaining.length === 0) {
            return {
              ...msg,
              reactions: msg.reactions.filter((r) => r.emoji !== emoji),
            };
          }

          return {
            ...msg,
            reactions: msg.reactions.map((r) =>
              r.emoji === emoji ? { ...r, userIds: remaining, count: remaining.length } : r
            ),
          };
        }

        return {
          ...msg,
          reactions: msg.reactions.map((r) =>
            r.emoji === emoji
              ? { ...r, userIds: [...r.userIds, userId], count: r.count + 1 }
              : r
          ),
        };
      })
    );
  };

  const togglePin = async (messageId: string) => {
    if (!token || !selectedServerId || !selectedChannelId) {
      throw new Error("Not authenticated");
    }

    const target = messages.find((msg) => msg.id === messageId);
    const shouldUnpin = Boolean(target?.pinned);

    if (shouldUnpin) {
      await unpinMessage({
        serverId: selectedServerId,
        channelId: selectedChannelId,
        messageId,
        token,
      });
    } else {
      await pinMessage({
        serverId: selectedServerId,
        channelId: selectedChannelId,
        messageId,
        token,
      });
    }

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
        deleteMessageAttachments: deleteMessageAttachmentsHandler,
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