import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Message as MessageType } from "../../contexts/AppContext";
import { MessageItem } from "./MessageItem";
import { MessageSquare } from "lucide-react";

interface MessageListProps {
  messages: MessageType[];
}

export interface MessageListRef {
  scrollToMessage: (messageId: string) => void;
}

export const MessageList = forwardRef<MessageListRef, MessageListProps>(
  ({ messages }, ref) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useImperativeHandle(ref, () => ({
      scrollToMessage: (messageId: string) => {
        const messageElement = messageRefs.current.get(messageId);
        if (messageElement) {
          messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
          // Highlight effect
          messageElement.style.backgroundColor = "#5865f2";
          messageElement.style.transition = "background-color 0.3s ease";
          setTimeout(() => {
            messageElement.style.backgroundColor = "";
          }, 1000);
        }
      },
    }));

    if (messages.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-[#949ba4] px-4">
          <div className="w-16 h-16 rounded-full bg-[#2e3035] flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-[#6d6f78]" />
          </div>
          <h3 className="text-base font-semibold text-[#dbdee1] mb-1">No messages yet</h3>
          <p className="text-sm text-center">
            Be the first to send a message in this channel!
          </p>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto">
        <div className="pt-4 pb-2">
          {messages.map((message) => (
            <div
              key={message.id}
              ref={(el) => {
                if (el) {
                  messageRefs.current.set(message.id, el);
                } else {
                  messageRefs.current.delete(message.id);
                }
              }}
            >
              <MessageItem message={message} />
            </div>
          ))}
        </div>
        <div ref={messagesEndRef} />
      </div>
    );
  }
);

MessageList.displayName = "MessageList";