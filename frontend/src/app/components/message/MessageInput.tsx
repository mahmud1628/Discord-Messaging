import { useState, useRef } from "react";
import { Plus, Smile, X, FileIcon, Send } from "lucide-react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { useApp } from "../../contexts/AppContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { AttachmentMenu } from "./AttachmentMenu";

interface MessageInputProps {
  channelId: string;
  channelName: string;
}

interface AttachmentPreview {
  file: File;
  url: string;
  type: "image" | "file";
}

export function MessageInput({ channelId, channelName }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sendMessage } = useApp();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && attachments.length === 0) return;

    try {
      // In a real app, you would upload attachments first and get URLs
      const messageText = message.trim() || (attachments.length > 0 ? `[${attachments.length} attachment${attachments.length > 1 ? 's' : ''}]` : "");
      await sendMessage(messageText, channelId);
      setMessage("");
      clearAttachments();
      toast.success("Message sent!");
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    const newAttachments: AttachmentPreview[] = [];

    files.forEach((file) => {
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large. Max size is 10MB.`);
        return;
      }

      const url = URL.createObjectURL(file);
      const type = file.type.startsWith("image/") ? "image" : "file";
      newAttachments.push({ file, url, type });
    });

    setAttachments((prev) => [...prev, ...newAttachments]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const newAttachments = [...prev];
      URL.revokeObjectURL(newAttachments[index].url);
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  };

  const clearAttachments = () => {
    attachments.forEach((attachment) => URL.revokeObjectURL(attachment.url));
    setAttachments([]);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="px-4 pb-6 pt-2">
      <form onSubmit={handleSubmit} className="relative">
        {/* Attachment Previews */}
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2 bg-[#2b2d31] rounded-lg p-3 border border-[#1e1f22]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#b5bac1] font-medium">
                  {attachments.length} file{attachments.length > 1 ? "s" : ""} attached
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAttachments}
                  className="text-[#f23f42] hover:text-[#f23f42] hover:bg-[#f23f42]/10 h-6 text-xs"
                >
                  Clear All
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {attachments.map((attachment, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative group"
                  >
                    {attachment.type === "image" ? (
                      <div className="relative aspect-square rounded overflow-hidden bg-[#1e1f22]">
                        <img
                          src={attachment.url}
                          alt={attachment.file.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(index)}
                            className="text-white hover:text-[#f23f42] hover:bg-black/50 h-8 w-8 p-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative p-3 rounded bg-[#1e1f22] flex items-center gap-2">
                        <FileIcon className="w-8 h-8 text-[#b5bac1] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#dbdee1] truncate">{attachment.file.name}</p>
                          <p className="text-xs text-[#949ba4]">
                            {(attachment.file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                          className="text-[#b5bac1] hover:text-[#f23f42] hover:bg-[#35363c] h-6 w-6 p-0 flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-[#949ba4] mt-1 truncate">{attachment.file.name}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message Input */}
        <div className="relative flex items-center bg-[#383a40] rounded-lg focus-within:border-transparent">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {/* Attachment Menu */}
          <AnimatePresence>
            {showAttachmentMenu && (
              <AttachmentMenu
                onClose={() => setShowAttachmentMenu(false)}
                onFileSelect={triggerFileInput}
              />
            )}
          </AnimatePresence>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            className={`absolute left-3 text-[#b5bac1] hover:text-[#dbdee1] hover:bg-[#4e5058] rounded-full w-6 h-6 p-0 transition-colors z-10 ${
              showAttachmentMenu ? "bg-[#4e5058] text-[#dbdee1]" : ""
            }`}
          >
            <Plus className="w-5 h-5" />
          </Button>
          
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${channelName}`}
            className="flex-1 bg-transparent border-0 text-[#dbdee1] placeholder:text-[#6d6f78] resize-none focus-visible:ring-0 focus-visible:ring-offset-0 pl-12 pr-20 py-3 min-h-[44px] max-h-[200px]"
            rows={1}
          />

          <div className="absolute right-3 flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-[#b5bac1] hover:text-[#dbdee1] hover:bg-[#4e5058] rounded-full w-6 h-6 p-0 transition-colors"
            >
              <Smile className="w-5 h-5" />
            </Button>
            
            {(message.trim() || attachments.length > 0) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="text-[#5865f2] hover:text-white hover:bg-[#5865f2] rounded-full w-8 h-8 p-0 transition-colors ml-1"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}