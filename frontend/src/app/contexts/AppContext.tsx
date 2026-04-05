import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import {
  addReactionToMessage,
  deleteMessageById,
  deleteMessageAttachments,
  getChannelsByServer,
  getMessagesByChannel,
  getPinnedMessages,
  getServerMembers,
  getServers,
  MessageApiItem,
  MessageReactionApiItem,
  pinMessage,
  removeReactionFromMessage,
  sendMessageToChannel,
  unpinMessage,
  updateMessageContent,
} from "../utils/api";
import { createSocket, type AppSocket } from "../utils/socket";

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
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [socket, setSocket] = useState<AppSocket | null>(null);

  const isAttachmentPlaceholderContent = (value?: string) => {
    if (!value) return false;
    return /^\[\d+ attachments?\]$/i.test(value.trim());
  };

  const applyReactionMutation = (
    prevMessages: Message[],
    messageId: string,
    emoji: string,
    userId: string,
    action: "add" | "remove"
  ) => {
    return prevMessages.map((msg) => {
      if (msg.id !== messageId) return msg;

      const reaction = msg.reactions.find((entry) => entry.emoji === emoji);

      if (action === "add") {
        if (!reaction) {
          return {
            ...msg,
            reactions: [...msg.reactions, { emoji, userIds: [userId], count: 1 }],
          };
        }

        if (reaction.userIds.includes(userId)) {
          return msg;
        }

        return {
          ...msg,
          reactions: msg.reactions.map((entry) =>
            entry.emoji === emoji
              ? {
                  ...entry,
                  userIds: [...entry.userIds, userId],
                  count: entry.count + 1,
                }
              : entry
          ),
        };
      }

      if (!reaction || !reaction.userIds.includes(userId)) {
        return msg;
      }

      const remaining = reaction.userIds.filter((id) => id !== userId);
      if (remaining.length === 0) {
        return {
          ...msg,
          reactions: msg.reactions.filter((entry) => entry.emoji !== emoji),
        };
      }

      return {
        ...msg,
        reactions: msg.reactions.map((entry) =>
          entry.emoji === emoji
            ? {
                ...entry,
                userIds: remaining,
                count: remaining.length,
              }
            : entry
        ),
      };
    });
  };

  const applyPinMutation = (
    prevMessages: Message[],
    messageId: string,
    pinned: boolean
  ) => {
    return prevMessages.map((msg) =>
      msg.id === messageId ? { ...msg, pinned } : msg
    );
  };

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setSocket((prev) => {
        if (prev) {
          prev.disconnect();
        }
        return null;
      });
      return;
    }

    const nextSocket = createSocket(token);
    setSocket(nextSocket);

    return () => {
      nextSocket.disconnect();
    };
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (!socket) return;

    if (selectedChannelId) {
      socket.emit("channel:join", selectedChannelId);
    }

    return () => {
      if (selectedChannelId) {
        socket.emit("channel:leave", selectedChannelId);
      }
    };
  }, [socket, selectedChannelId]);

  useEffect(() => {
    if (!socket) return;

    const handleMessageNew = (incoming: {
      id: string | number;
      channelId: string | number;
      content: string;
      createdAt: string;
      author?: {
        id: string | number;
        username?: string;
      };
      attachments?: Array<{
        id?: string | number;
        file_url?: string;
        file_name?: string;
        file_size?: number;
        mime_type?: string;
      }>;
    }) => {
      const incomingChannelId = String(incoming.channelId);

      if (!selectedChannelId || incomingChannelId !== selectedChannelId) {
        return;
      }

      const mappedMessage: Message = {
        id: String(incoming.id),
        content: incoming.content,
        userId: String(incoming.author?.id ?? user?.id ?? "unknown-user"),
        channelId: incomingChannelId,
        createdAt: incoming.createdAt,
        edited: false,
        reactions: [],
        pinned: false,
        attachments: (incoming.attachments ?? [])
          .filter((attachment) => Boolean(attachment.id))
          .map((attachment) => ({
            id: String(attachment.id),
            fileUrl: attachment.file_url || "",
            fileName: attachment.file_name || "attachment",
            fileSize: attachment.file_size,
            mimeType: attachment.mime_type,
          })),
      };

      setMessages((prev) => {
        if (prev.some((msg) => msg.id === mappedMessage.id)) {
          return prev;
        }
        return [...prev, mappedMessage];
      });

      const incomingAuthorId = incoming.author?.id;
      const incomingAuthorUsername = incoming.author?.username;

      if (incomingAuthorId && incomingAuthorUsername) {
        const authorId = String(incomingAuthorId);
        setUsers((prev) => {
          if (prev.some((entry) => entry.id === authorId)) {
            return prev;
          }

          return [
            {
              id: authorId,
              username: incomingAuthorUsername,
              displayName: incomingAuthorUsername,
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${incomingAuthorUsername}`,
            },
            ...prev,
          ];
        });
      }
    };

    const handleReactionAdd = (incoming: {
      messageId: string | number;
      emoji: string;
      user?: {
        id: string | number;
        username?: string;
      };
    }) => {
      const reactorId = incoming.user?.id;
      if (!reactorId) {
        return;
      }

      setMessages((prev) =>
        applyReactionMutation(
          prev,
          String(incoming.messageId),
          String(incoming.emoji),
          String(reactorId),
          "add"
        )
      );

      const incomingReactorUsername = incoming.user?.username;

      if (incomingReactorUsername) {
        const authorId = String(reactorId);
        setUsers((prev) => {
          if (prev.some((entry) => entry.id === authorId)) {
            return prev;
          }

          return [
            {
              id: authorId,
              username: incomingReactorUsername,
              displayName: incomingReactorUsername,
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${incomingReactorUsername}`,
            },
            ...prev,
          ];
        });
      }
    };

    const handleReactionRemove = (incoming: {
      messageId: string | number;
      emoji: string;
      user?: {
        id: string | number;
      };
    }) => {
      const reactorId = incoming.user?.id;
      if (!reactorId) {
        return;
      }

      setMessages((prev) =>
        applyReactionMutation(
          prev,
          String(incoming.messageId),
          String(incoming.emoji),
          String(reactorId),
          "remove"
        )
      );
    };

    const handleMessageUpdated = (payload: {
      messageId: string | number;
      channelId: string | number;
      content?: string;
      editedAt?: string;
      deletedAttachmentIds?: Array<string | number>;
    }) => {
      const incomingChannelId = String(payload.channelId);

      if (!selectedChannelId || incomingChannelId !== selectedChannelId) {
        return;
      }

      setMessages((prev) =>
        prev.reduce<Message[]>((acc, msg) => {
          if (msg.id !== String(payload.messageId)) {
            acc.push(msg);
            return acc;
          }

          const removed = new Set(
            (payload.deletedAttachmentIds || []).map((id) => String(id))
          );
          const remainingAttachments = removed.size
            ? (msg.attachments || []).filter((attachment) => !removed.has(attachment.id))
            : msg.attachments;

          const nextContent = payload.content ?? msg.content;
          const shouldDropPlaceholderOnlyMessage =
            (remainingAttachments?.length || 0) === 0 &&
            isAttachmentPlaceholderContent(nextContent);

          if (shouldDropPlaceholderOnlyMessage) {
            return acc;
          }

          acc.push({
            ...msg,
            content: nextContent,
            edited: true,
            updatedAt: payload.editedAt ?? msg.updatedAt,
            attachments: remainingAttachments,
          });

          return acc;
        }, [])
      );
    };

    const handleMessageDeleted = (payload: {
      messageId: string | number;
      channelId: string | number;
      deletedBy?: string | number;
    }) => {
      const incomingChannelId = String(payload.channelId);

      if (!selectedChannelId || incomingChannelId !== selectedChannelId) {
        return;
      }

      setMessages((prev) => prev.filter((msg) => msg.id !== String(payload.messageId)));
    };

    const handleMessagePinned = (payload: {
      messageId: string | number;
      channelId: string | number;
      pinned?: boolean;
      pinnedAt?: string;
      pinnedBy?: string | number;
      pinnedByUsername?: string;
    }) => {
      const incomingChannelId = String(payload.channelId);

      if (!selectedChannelId || incomingChannelId !== selectedChannelId) {
        return;
      }

      setMessages((prev) =>
        applyPinMutation(prev, String(payload.messageId), payload.pinned !== false)
      );
    };

    const handleMessageUnpinned = (payload: {
      messageId: string | number;
      channelId: string | number;
      pinned?: boolean;
      unpinnedBy?: string | number;
    }) => {
      const incomingChannelId = String(payload.channelId);

      if (!selectedChannelId || incomingChannelId !== selectedChannelId) {
        return;
      }

      setMessages((prev) =>
        applyPinMutation(prev, String(payload.messageId), Boolean(payload.pinned))
      );
    };

    const handlePresenceState = (payload: { onlineUserIds?: Array<string | number> }) => {
      const ids = new Set((payload.onlineUserIds || []).map((id) => String(id)));
      setOnlineUserIds(ids);
    };

    const handlePresenceUpdate = (payload: {
      userId?: string | number;
      status?: "online" | "offline";
    }) => {
      if (!payload.userId || !payload.status) return;

      const userId = String(payload.userId);
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (payload.status === "online") {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
    };

    socket.on("message:new", handleMessageNew);
    socket.on("message:reaction:add", handleReactionAdd);
    socket.on("message:reaction:remove", handleReactionRemove);
    socket.on("message:updated", handleMessageUpdated);
    socket.on("message:deleted", handleMessageDeleted);
    socket.on("message:pinned", handleMessagePinned);
    socket.on("message:unpinned", handleMessageUnpinned);
    socket.on("presence:state", handlePresenceState);
    socket.on("presence:update", handlePresenceUpdate);

    return () => {
      socket.off("message:new", handleMessageNew);
      socket.off("message:reaction:add", handleReactionAdd);
      socket.off("message:reaction:remove", handleReactionRemove);
      socket.off("message:updated", handleMessageUpdated);
      socket.off("message:deleted", handleMessageDeleted);
      socket.off("message:pinned", handleMessagePinned);
      socket.off("message:unpinned", handleMessageUnpinned);
      socket.off("presence:state", handlePresenceState);
      socket.off("presence:update", handlePresenceUpdate);
    };
  }, [socket, selectedChannelId, user]);

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
    if (!isAuthenticated || !token || !selectedServerId) {
      setUsers([]);
      return;
    }

    let cancelled = false;

    const loadServerMembers = async () => {
      try {
        const response = await getServerMembers(selectedServerId, token);

        const mappedMembers: UserProfile[] = response.members.map((member) => ({
          id: String(member.id),
          username: member.username,
          displayName: member.display_name || member.username,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`,
        }));

        if (user && !mappedMembers.some((entry) => entry.id === user.id)) {
          mappedMembers.unshift({
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar,
          });
        }

        if (!cancelled) {
          setUsers(mappedMembers);
        }
      } catch (error) {
        console.error("Failed to load server members", error);
        if (!cancelled) {
          setUsers([]);
        }
      }
    };

    loadServerMembers();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token, selectedServerId, user]);

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

        const fallbackUserId = user?.id ?? "unknown-user";
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

  const usersWithPresence = useMemo(
    (): UserProfile[] =>
      users.map((entry) => ({
        ...entry,
        status: (onlineUserIds.has(entry.id) ? "online" : "offline") as
          | "online"
          | "offline",
      })),
    [users, onlineUserIds]
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

    const fallbackUserId = user?.id ?? "unknown-user";
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
              id: String(response.attachment_id || ""),
              fileUrl: response.file_url,
              fileName: response.file_name || "attachment",
              fileSize: response.file_size,
              mimeType: response.mime_type,
            },
          ].filter((attachment) => Boolean(attachment.id))
        : [],
    };

    setMessages((prev) => {
      if (prev.some((msg) => msg.id === newMessage.id)) {
        return prev;
      }
      return [...prev, newMessage];
    });
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
      prev.reduce<Message[]>((acc, msg) => {
        if (msg.id !== messageId) {
          acc.push(msg);
          return acc;
        }

        const removed = new Set(response.deletedAttachmentIds || attachmentIds);
        const remaining = (msg.attachments || []).filter(
          (attachment) => !removed.has(attachment.id)
        );

        const shouldDropPlaceholderOnlyMessage =
          remaining.length === 0 && isAttachmentPlaceholderContent(msg.content);

        if (shouldDropPlaceholderOnlyMessage) {
          return acc;
        }

        acc.push({ ...msg, attachments: remaining });
        return acc;
      }, [])
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
      applyReactionMutation(prev, messageId, emoji, userId, hasReacted ? "remove" : "add")
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

      setMessages((prev) => applyPinMutation(prev, messageId, false));
    } else {
      await pinMessage({
        serverId: selectedServerId,
        channelId: selectedChannelId,
        messageId,
        token,
      });

      setMessages((prev) => applyPinMutation(prev, messageId, true));
    }
  };

  return (
    <AppContext.Provider
      value={{
        servers,
        channels,
        messages,
        users: usersWithPresence,
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
