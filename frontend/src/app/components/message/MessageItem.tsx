import { useState } from "react";
import { Message, useApp } from "../../contexts/AppContext";
import { formatDistanceToNow } from "date-fns";
import { Edit, Trash2, Pin, Smile, MoreVertical } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { EditMessageDialog } from "./EditMessageDialog";
import { EmojiPicker } from "./EmojiPicker";
import { UserProfilePopover } from "../user/UserProfilePopover";
import { toast } from "sonner";

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { users, deleteMessage, togglePin, toggleReaction } = useApp();

  const user = users.find((u) => u.id === message.userId);
  const currentUserId = "user-1"; // In real app, get from auth context

  if (!user) return null;

  const handleDelete = async () => {
    try {
      await deleteMessage(message.id);
      toast.success("Message deleted");
      setShowDeleteDialog(false);
    } catch (error) {
      toast.error("Failed to delete message");
    }
  };

  const handlePin = async () => {
    try {
      await togglePin(message.id);
      toast.success(message.pinned ? "Message unpinned" : "Message pinned");
    } catch (error) {
      toast.error("Failed to pin message");
    }
  };

  const handleReaction = async (emoji: string) => {
    try {
      await toggleReaction(message.id, emoji, currentUserId);
      setShowEmojiPicker(false);
    } catch (error) {
      toast.error("Failed to add reaction");
    }
  };

  const handleReactionClick = async (emoji: string) => {
    try {
      await toggleReaction(message.id, emoji, currentUserId);
    } catch (error) {
      toast.error("Failed to toggle reaction");
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="group relative px-4 py-0.5 hover:bg-[#2e3035] transition-colors mt-[17px]"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            if (!dropdownOpen) {
              setIsHovered(false);
            }
          }}
        >
          <div className="flex gap-4 pt-0.5 pb-0.5">
            {/* Avatar */}
            {user && (
              <UserProfilePopover user={user}>
                <div className="w-10 h-10 rounded-full bg-[#5865f2] flex items-center justify-center text-white flex-shrink-0 overflow-hidden cursor-pointer mt-0.5">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold">
                      {user.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </UserProfilePopover>
            )}

            {/* Message Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-medium text-white text-[15px] hover:underline cursor-pointer">
                  {user?.displayName}
                </span>
                <span className="text-xs text-[#949ba4]">
                  {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                </span>
                {message.edited && (
                  <span className="text-xs text-[#949ba4]">(edited)</span>
                )}
                {message.pinned && (
                  <span className="text-xs text-[#f0b232] flex items-center gap-1">
                    <Pin className="w-3 h-3" />
                    Pinned
                  </span>
                )}
              </div>
              <p className="text-[#dbdee1] text-[15px] leading-[1.375rem] break-words mt-0.5">
                {message.content}
              </p>

              {/* Reactions */}
              {message.reactions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {message.reactions.map((reaction) => {
                    const hasReacted = reaction.userIds.includes(currentUserId);
                    return (
                      <motion.button
                        key={reaction.emoji}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleReactionClick(reaction.emoji)}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-sm transition-colors ${
                          hasReacted
                            ? "bg-[#5865f2]/20 border border-[#5865f2]/50"
                            : "bg-[#2e3035] border border-[#3f4147] hover:border-[#5865f2]/30"
                        }`}
                      >
                        <span>{reaction.emoji}</span>
                        <span
                          className={`text-xs ${
                            hasReacted ? "text-[#dbdee1]" : "text-[#b5bac1]"
                          }`}
                        >
                          {reaction.count}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Hover Actions */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.1 }}
                className="absolute -top-4 right-4 bg-[#2e3035] border border-[#1e1f22] rounded shadow-xl flex items-center"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="h-8 w-8 p-0 hover:bg-[#404249] text-[#b5bac1] hover:text-white rounded-none first:rounded-l last:rounded-r"
                >
                  <Smile className="w-[18px] h-[18px]" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-8 w-8 p-0 hover:bg-[#404249] text-[#b5bac1] hover:text-white rounded-none"
                >
                  <Edit className="w-[18px] h-[18px]" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePin}
                  className="h-8 w-8 p-0 hover:bg-[#404249] text-[#b5bac1] hover:text-white rounded-none"
                >
                  <Pin className="w-[18px] h-[18px]" />
                </Button>
                <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-[#404249] text-[#b5bac1] hover:text-white rounded-none last:rounded-r focus:outline-none"
                    >
                      <MoreVertical className="w-[18px] h-[18px]" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#111827] border-[#1e1f22] text-[#b5bac1]">
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        setDropdownOpen(false);
                        setTimeout(() => {
                          setShowDeleteDialog(true);
                          setIsHovered(false);
                        }, 100);
                      }}
                      className="text-[#f23f42] focus:text-[#f23f42] focus:bg-[#f23f42]/10 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Message
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="absolute top-0 right-16 z-10">
              <EmojiPicker onSelect={handleReaction} onClose={() => setShowEmojiPicker(false)} />
            </div>
          )}
        </motion.div>
      </ContextMenuTrigger>

      {/* Context Menu */}
      <ContextMenuContent className="bg-[#111827] border-[#1e1f22] text-[#b5bac1]">
        <ContextMenuItem
          onClick={() => setIsEditing(true)}
          className="focus:bg-[#4e5058] focus:text-white"
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit Message
        </ContextMenuItem>
        <ContextMenuItem
          onClick={handlePin}
          className="focus:bg-[#4e5058] focus:text-white"
        >
          <Pin className="w-4 h-4 mr-2" />
          {message.pinned ? "Unpin" : "Pin"} Message
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-[#3f4147]" />
        <ContextMenuItem
          onClick={() => setShowDeleteDialog(true)}
          className="text-[#f23f42] focus:text-[#f23f42] focus:bg-[#f23f42]/10"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Message
        </ContextMenuItem>
      </ContextMenuContent>

      {/* Edit Dialog */}
      <EditMessageDialog
        message={message}
        open={isEditing}
        onClose={() => setIsEditing(false)}
      />

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-0 text-white hover:bg-[#4e5058] hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-[#da373c] hover:bg-[#a12d30] text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ContextMenu>
  );
}