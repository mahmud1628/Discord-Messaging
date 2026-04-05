import { useParams, useNavigate } from "react-router";
import { useApp } from "../../contexts/AppContext";
import { useAuth } from "../../contexts/AuthContext";
import { Hash, LogOut } from "lucide-react";
import { motion } from "motion/react";

export function ChannelSidebar() {
  const { serverId, channelId } = useParams();
  const navigate = useNavigate();
  const { channels, servers } = useApp();
  const { logout, user } = useAuth();

  const currentServer = servers.find((s) => s.id === serverId);
  const serverChannels = channels.filter((c) => c.serverId === serverId);

  const handleLogout = () => {
    void logout();
  };

  const handleChannelClick = (id: string) => {
    if (serverId) {
      navigate(`/app/${serverId}/${id}`);
    }
  };

  if (!currentServer) {
    return null;
  }

  return (
    <div className="w-60 bg-[#2b2d31] flex flex-col">
      {/* Server Header */}
      <div className="flex items-center px-4 h-12 border-b border-[#1e1f22] text-white font-semibold text-[15px] shadow-sm">
        <span className="truncate">{currentServer.name}</span>
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <div className="mb-2">
          <div className="flex items-center px-2 text-xs font-semibold text-[#949ba4] uppercase tracking-wide mb-1 hover:text-[#dbdee1] transition-colors cursor-pointer">
            Text Channels
          </div>
          {serverChannels.map((channel) => (
            <motion.button
              key={channel.id}
              whileHover={{ x: 2 }}
              onClick={() => handleChannelClick(channel.id)}
              className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-[#949ba4] hover:bg-[#35363c] hover:text-[#dbdee1] transition-colors mb-0.5 group ${
                channelId === channel.id ? "bg-[#404249] text-white" : ""
              }`}
            >
              <Hash className="w-5 h-5 flex-shrink-0" />
              <span className="text-[15px] font-medium truncate">{channel.name}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* User Panel */}
      <div className="h-[52px] bg-[#232428] flex items-center px-2 gap-2">
        <div className="w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 overflow-hidden relative">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            user?.displayName.charAt(0).toUpperCase()
          )}
          {/* Online status indicator */}
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#23a559] rounded-full border-2 border-[#232428]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white font-medium truncate">{user?.displayName}</div>
          <div className="text-xs text-[#949ba4]">Online</div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="p-1.5 hover:bg-[#35363c] rounded text-[#b5bac1] hover:text-[#f23f42] focus:outline-none transition-colors"
          aria-label="Log Out"
          title="Log Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}