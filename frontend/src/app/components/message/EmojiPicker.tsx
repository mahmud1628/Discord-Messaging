import { useEffect, useRef } from "react";
import { motion } from "motion/react";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const COMMON_EMOJIS = [
  "👍", "❤️", "😂", "😮", "😢", "😡",
  "🎉", "🔥", "👏", "💯", "✨", "⭐",
  "👀", "💀", "🤔", "🙏", "💪", "🎊",
];

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

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
      className="bg-[#2b2d31] border border-[#1e1f22] rounded-lg shadow-2xl p-3 grid grid-cols-6 gap-1 w-64"
    >
      {COMMON_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          className="w-10 h-10 flex items-center justify-center text-xl hover:bg-[#35363c] rounded transition-colors"
        >
          {emoji}
        </button>
      ))}
    </motion.div>
  );
}