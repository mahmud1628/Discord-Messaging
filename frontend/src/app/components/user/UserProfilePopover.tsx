import { UserProfile } from "../../contexts/AppContext";
import { StatusIndicator } from "../common/StatusIndicator";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../ui/hover-card";

interface UserProfilePopoverProps {
  user: UserProfile;
  children: React.ReactNode;
}

export function UserProfilePopover({ user, children }: UserProfilePopoverProps) {
  return (
    <HoverCard openDelay={300}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        className="w-80 bg-[#111827] border-[#1e1f22] p-0 overflow-hidden"
        side="right"
      >
        {/* Banner */}
        <div
          className="h-16 w-full"
          style={{
            background: "linear-gradient(135deg, #5865f2 0%, #4752c4 100%)",
          }}
        />

        {/* Profile Content */}
        <div className="p-4 -mt-8">
          <div className="relative inline-block">
            <div className="w-20 h-20 rounded-full border-[6px] border-[#111827] bg-[#5865f2] flex items-center justify-center text-white text-2xl overflow-hidden">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                user.displayName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="absolute bottom-1 right-1">
              <StatusIndicator status={user.status} size="lg" />
            </div>
          </div>

          <div className="mt-4 bg-[#0d0d0d] rounded-lg p-3">
            <h3 className="text-white font-bold text-lg">{user.displayName}</h3>
            <p className="text-[#b5bac1] text-sm">@{user.username}</p>

            <div className="mt-3 pt-3 border-t border-[#3f4147]">
              <div className="text-xs font-bold text-[#b5bac1] uppercase mb-2">
                Member Since
              </div>
              <div className="text-sm text-[#dbdee1]">April 1, 2026</div>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}