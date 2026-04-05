import { useApp } from "../../contexts/AppContext";
import { Pin, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../ui/button";
import { useEffect, useState } from "react";

export function PinnedMessagesBanner() {
  const { pinnedMessages, selectedChannelId } = useApp();
  const [isDismissed, setIsDismissed] = useState(false);
  const latestPinned = pinnedMessages[pinnedMessages.length - 1];

  useEffect(() => {
    setIsDismissed(false);
  }, [selectedChannelId, latestPinned?.id, pinnedMessages.length]);

  if (!latestPinned) return null;

  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          key="pinned-messages-banner"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-[#2e3035] border-b border-[#26272b] overflow-hidden"
        >
          <div className="px-4 py-2 flex items-center gap-3">
            <Pin className="w-4 h-4 text-[#f0b232] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#dbdee1] truncate">{latestPinned.content}</p>
              {pinnedMessages.length > 1 && (
                <p className="text-xs text-[#949ba4] mt-0.5">
                  {pinnedMessages.length} pinned messages
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDismissed(true)}
              className="text-[#b5bac1] hover:text-[#dbdee1] hover:bg-[#35363c] h-6 w-6 p-0"
              aria-label="Dismiss pinned messages banner"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}