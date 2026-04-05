import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onSelectGif?: (gifId: string) => void;
  onSelectSticker?: (stickerId: string) => void;
  onClose: () => void;
}

const COMMON_EMOJIS = [
  "😀", "😁", "😂", "🤣", "😅", "😊", "😍", "😘", "😎", "🤩",
  "🤔", "😮", "😢", "😭", "😡", "👍", "👎", "👏", "🙌", "🙏",
  "💪", "🔥", "💯", "✨", "🎉", "🥳", "👀", "❤️", "💙", "💚",
  "💜", "🖤", "🤍", "💛", "😴", "🤯", "😬", "😇", "🤝", "🌟",
];

const GIFS = [
  { id: "celebrate", label: "Celebrate", emoji: "🎉" },
  { id: "thumbs_up", label: "Nice", emoji: "👍" },
  { id: "laugh", label: "Laugh", emoji: "😂" },
  { id: "wow", label: "Wow", emoji: "🤩" },
  { id: "cool", label: "Cool", emoji: "😎" },
  { id: "fire", label: "Fire", emoji: "🔥" },
];

const STICKERS = [
  { id: "heart", label: "Heart", emoji: "❤️" },
  { id: "clap", label: "Clap", emoji: "👏" },
  { id: "star", label: "Star", emoji: "⭐" },
  { id: "spark", label: "Spark", emoji: "✨" },
  { id: "good", label: "Good", emoji: "💯" },
  { id: "party", label: "Party", emoji: "🥳" },
];

export function EmojiPicker({ onSelectEmoji, onSelectGif, onSelectSticker, onClose }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"emoji" | "gifs" | "stickers">("emoji");

  const filteredEmojis = useMemo(() => {
    const value = search.trim();
    if (!value) return COMMON_EMOJIS;

    return COMMON_EMOJIS.filter((emoji) => emoji.includes(value));
  }, [search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-[360px] overflow-hidden rounded-xl border border-[#1e1f22] bg-[#2b2d31] shadow-2xl"
    >
      <div className="border-b border-[#1e1f22] px-3 pt-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("gifs")}
            className="rounded-lg bg-[#35363c] px-3 py-1.5 text-xs font-medium text-[#dbdee1]"
          >
            GIFs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("stickers")}
            className="rounded-lg bg-[#35363c] px-3 py-1.5 text-xs font-medium text-[#dbdee1]"
          >
            Stickers
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("emoji")}
            className="rounded-lg bg-[#404249] px-3 py-1.5 text-xs font-medium text-white"
          >
            Emoji
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#404249] bg-[#1e1f22] px-3 py-2">
          <span className="text-[#949ba4]">⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find the perfect emoji"
            className="w-full bg-transparent text-sm text-[#dbdee1] outline-none placeholder:text-[#72767d]"
          />
        </div>

        <div className="mt-3 flex items-center justify-between pb-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#949ba4]">
            Frequently Used
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#35363c] px-3 py-1.5 text-xs font-medium text-[#dbdee1]"
          >
            Add Emoji
          </button>
        </div>
      </div>

      {activeTab === "emoji" && (
        <div className="max-h-72 overflow-y-auto px-3 py-3">
          <div className="grid grid-cols-8 gap-1">
            {filteredEmojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onSelectEmoji(emoji)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-colors hover:bg-[#404249]"
              >
                {emoji}
              </button>
            ))}
          </div>

          {filteredEmojis.length === 0 && (
            <div className="py-8 text-center text-sm text-[#949ba4]">No emojis found</div>
          )}
        </div>
      )}

      {activeTab === "gifs" && (
        <div className="max-h-72 overflow-y-auto px-3 py-3">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#949ba4]">
            Trending GIFs
          </div>
          <div className="grid grid-cols-2 gap-2">
            {GIFS.map((gif) => (
              <button
                key={gif.id}
                type="button"
                onClick={() => onSelectGif?.(gif.id)}
                className="group rounded-lg border border-[#404249] bg-[#1e1f22] p-3 text-left transition-colors hover:border-[#5865f2]/70 hover:bg-[#26282d]"
              >
                <div className="flex h-28 items-center justify-center rounded-md bg-gradient-to-br from-[#3a3d44] to-[#222428] text-5xl transition-transform duration-200 group-hover:scale-[1.02]">
                  {gif.emoji}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-[#dbdee1]">{gif.label}</span>
                  <span className="rounded bg-[#404249] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#b5bac1]">
                    GIF
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === "stickers" && (
        <div className="max-h-72 overflow-y-auto px-3 py-3">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#949ba4]">
            Stickers
          </div>
          <div className="grid grid-cols-3 gap-2">
            {STICKERS.map((sticker) => (
              <button
                key={sticker.id}
                type="button"
                onClick={() => onSelectSticker?.(sticker.id)}
                className="rounded-xl border border-[#404249] bg-[#1e1f22] p-3 transition-colors hover:border-[#5865f2]/70 hover:bg-[#26282d]"
              >
                <div className="flex h-20 items-center justify-center rounded-lg bg-[#2b2d31] text-4xl">
                  {sticker.emoji}
                </div>
                <div className="mt-2 truncate text-center text-xs font-medium text-[#dbdee1]">
                  {sticker.label}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}