import { Paperclip } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";

interface AttachmentMenuProps {
  onClose: () => void;
  onFileSelect: () => void;
}

export function AttachmentMenu({ onClose, onFileSelect }: AttachmentMenuProps) {
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
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.1 }}
      className="absolute bottom-full left-3 mb-2 bg-[#111827] border border-[#1e1f22] rounded-lg shadow-2xl overflow-hidden min-w-[200px]"
    >
      <button
        onClick={() => {
          onFileSelect();
          onClose();
        }}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#4e5058] transition-colors text-left"
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#5865f2]">
          <Paperclip className="w-5 h-5 text-white" />
        </div>
        <span className="text-[#dbdee1] text-sm font-medium">Upload a File</span>
      </button>
    </motion.div>
  );
}