import { motion } from "motion/react";

export function TypingIndicator({ username }: { username: string }) {
  return (
    <div className="px-4 py-2 flex items-center gap-2 text-sm text-gray-400">
      <span className="font-semibold">{username}</span>
      <span>is typing</span>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 bg-gray-400 rounded-full"
            animate={{
              y: [0, -4, 0],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.1,
            }}
          />
        ))}
      </div>
    </div>
  );
}
