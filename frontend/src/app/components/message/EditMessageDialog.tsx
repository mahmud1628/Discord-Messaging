import { useState } from "react";
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
  const { editMessage } = useApp();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsLoading(true);
    try {
      await editMessage(message.id, content);
      toast.success("Message updated");
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
          />
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
              disabled={isLoading || !content.trim()}
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