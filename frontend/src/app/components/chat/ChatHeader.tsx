import { Hash, Pin } from "lucide-react";
import { Channel, useApp } from "../../contexts/AppContext";
import { Button } from "../ui/button";
import { useState } from "react";
import { PinnedMessagesPanel } from "./PinnedMessagesPanel";

interface ChatHeaderProps {
  channel: Channel;
  onJumpToMessage: (messageId: string) => void;
}

export function ChatHeader({ channel, onJumpToMessage }: ChatHeaderProps) {
  const [showPinnedPanel, setShowPinnedPanel] = useState(false);
  const { messages } = useApp();
  
  const pinnedCount = messages.filter((m) => m.pinned && m.channelId === channel.id).length;

  return (
    <>
      <div className="h-12 border-b border-[#26272b] flex items-center justify-between px-4 bg-[#313338] shadow-sm">
        <div className="flex items-center gap-2">
          <Hash className="w-5 h-5 text-[#80848e]" />
          <h2 className="text-white font-semibold text-[16px]">{channel.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPinnedPanel(true)}
            className="text-[#b5bac1] hover:text-[#dbdee1] hover:bg-[#35363c] h-8 w-8 p-0 relative"
          >
            <Pin className="w-5 h-5" />
            {pinnedCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#f23f42] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {pinnedCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      <PinnedMessagesPanel
        isOpen={showPinnedPanel}
        onClose={() => setShowPinnedPanel(false)}
        onJumpToMessage={onJumpToMessage}
        channelId={channel.id}
      />
    </>
  );
}