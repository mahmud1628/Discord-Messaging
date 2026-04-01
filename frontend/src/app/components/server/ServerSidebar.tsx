import { useParams, useNavigate } from "react-router";
import { useApp } from "../../contexts/AppContext";
import { Plus } from "lucide-react";
import { motion } from "motion/react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

export function ServerSidebar() {
  const { serverId } = useParams();
  const navigate = useNavigate();
  const { servers } = useApp();

  const handleServerClick = (id: string) => {
    navigate(`/app/${id}`);
  };

  return (
    <div className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 gap-2">
      <TooltipProvider delayDuration={100}>
        {servers.map((server) => (
          <Tooltip key={server.id}>
            <TooltipTrigger asChild>
              <div className="relative flex items-center">
                {/* Active/Hover Pill Indicator */}
                <div className="absolute -left-3 flex items-center">
                  <motion.div
                    initial={false}
                    animate={{
                      height: serverId === server.id ? 40 : 0,
                      opacity: serverId === server.id ? 1 : 0,
                    }}
                    className="w-1 bg-white rounded-r-full"
                  />
                </div>
                
                <motion.button
                  whileHover={{ borderRadius: "16px" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleServerClick(server.id)}
                  className={`w-12 h-12 flex items-center justify-center font-semibold text-white transition-all overflow-hidden ${
                    serverId === server.id
                      ? "rounded-2xl"
                      : "rounded-3xl hover:rounded-2xl"
                  }`}
                  style={{ backgroundColor: server.icon ? "transparent" : server.iconColor }}
                >
                  {server.icon ? (
                    <img 
                      src={server.icon} 
                      alt={server.name} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <span className="text-lg">{server.name.slice(0, 2).toUpperCase()}</span>
                  )}
                </motion.button>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-[#111827] border-gray-800 text-sm">
              <p>{server.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}

        {/* Separator */}
        <div className="w-8 h-[2px] bg-[#35363c] rounded-full my-1" />

        {/* Add Server Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileHover={{ borderRadius: "16px", backgroundColor: "#23a559" }}
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 rounded-3xl bg-[#313338] hover:rounded-2xl flex items-center justify-center text-[#23a559] hover:text-white transition-all"
            >
              <Plus className="w-6 h-6" />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-[#111827] border-gray-800 text-sm">
            <p>Add a Server</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}