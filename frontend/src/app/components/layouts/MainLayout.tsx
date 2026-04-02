import { useEffect, useState } from "react";
import { Outlet, useParams, useNavigate } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import { useApp } from "../../contexts/AppContext";
import { ServerSidebar } from "../server/ServerSidebar";
import { ChannelSidebar } from "../channel/ChannelSidebar";
import { Menu } from "lucide-react";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";

export function MainLayout() {
  const { isAuthenticated } = useAuth();
  const { serverId, channelId } = useParams();
  const navigate = useNavigate();
  const { setSelectedServer, setSelectedChannel, servers, channels } = useApp();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (!serverId && servers.length > 0) {
      navigate(`/app/${servers[0].id}`);
    }
  }, [isAuthenticated, serverId, servers, navigate]);

  useEffect(() => {
    if (serverId) {
      setSelectedServer(serverId);
      
      // Auto-select first channel if no channel is selected
      if (!channelId) {
        const serverChannels = channels.filter((c) => c.serverId === serverId);
        if (serverChannels.length > 0) {
          navigate(`/app/${serverId}/${serverChannels[0].id}`);
        }
      } else {
        setSelectedChannel(channelId);
      }
    }
  }, [serverId, channelId, channels, navigate, setSelectedServer, setSelectedChannel]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-[#313338] overflow-hidden">
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-2 left-2 z-50">
        <Sheet open={showMobileSidebar} onOpenChange={setShowMobileSidebar}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="bg-[#1e1f22] hover:bg-[#2b2d31] text-white"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 bg-[#1e1f22] border-gray-900 w-80">
            <div className="flex h-full">
              <ServerSidebar />
              <ChannelSidebar />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebars */}
      <div className="hidden lg:flex">
        <ServerSidebar />
        <ChannelSidebar />
      </div>

      <div className="flex-1 flex flex-col">
        <Outlet />
      </div>
    </div>
  );
}