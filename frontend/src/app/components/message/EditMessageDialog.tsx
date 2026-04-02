import { useMemo, useState } from "react";
import { Message, useApp } from "../../contexts/AppContext";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { toast } from "sonner";

interface EditMessageDialogProps {
  message: Message;
  open: boolean;
  onClose: () => void;
}

export function EditMessageDialog({ message, open, onClose }: EditMessageDialogProps) {
  const [content, setContent] = useState(message.content);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>([]);
  const { editMessage, deleteMessageAttachments } = useApp();
  const [isLoading, setIsLoading] = useState(false);

  const hasAttachments = (message.attachments || []).length > 0;
  const deletingAttachments = selectedAttachmentIds.length > 0;
  const trimmedContent = content.trim();
  const contentChanged = trimmedContent !== message.content;
  const canSubmit = deletingAttachments || (contentChanged && trimmedContent.length > 0);

  const attachmentOptions = useMemo(
    () => (message.attachments || []).map((attachment) => ({
      id: attachment.id,
      name: attachment.fileName,
    })),
    [message.attachments]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsLoading(true);
    try {
      if (deletingAttachments) {
        await deleteMessageAttachments(message.id, selectedAttachmentIds);
        toast.success("Attachment removed");
      } else {
        await editMessage(message.id, trimmedContent);
        toast.success("Message updated");
      }
      onClose();
    } catch (error) {
      toast.error("Failed to update message");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#2b2d31] border-[#1e1f22] text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Message</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="bg-[#1e1f22] border-[#1e1f22] text-white placeholder:text-[#6d6f78] min-h-[100px] focus-visible:ring-0 focus:border-[#5865f2]"
            placeholder="Edit your message..."
            autoFocus
            disabled={deletingAttachments}
          />

          {hasAttachments && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#949ba4]">
                Remove Attachments
              </p>
              <div className="mt-2 space-y-2">
                {attachmentOptions.map((attachment) => (
                  <label
                    key={attachment.id}
                    className="flex items-center gap-2 rounded-md border border-[#1e1f22] bg-[#1f2024] px-3 py-2 text-sm text-[#dbdee1]"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAttachmentIds.includes(attachment.id)}
                      onChange={(e) => {
                        setSelectedAttachmentIds((prev) =>
                          e.target.checked
                            ? [...prev, attachment.id]
                            : prev.filter((id) => id !== attachment.id)
                        );
                      }}
                      className="h-4 w-4"
                    />
                    <span className="truncate">{attachment.name}</span>
                  </label>
                ))}
              </div>
              {deletingAttachments && (
                <p className="mt-2 text-xs text-[#b5bac1]">
                  Attachment removal is a separate action. Clear selections to edit text.
                </p>
              )}
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="hover:bg-[#35363c] text-[#b5bac1] hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !canSubmit}
              className="bg-[#5865f2] hover:bg-[#4752c4]"
            >
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}