import { motion } from "framer-motion";
import DashboardCard from "@/components/DashboardCard";
import { X, Mail, MapPin, Calendar, Activity, Target, Clock } from "lucide-react";

interface ProfilePageProps {
  onClose: () => void;
  avatarType: string;
}

const ProfilePage = ({ onClose }: ProfilePageProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <DashboardCard glass className="p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted/50 transition-colors"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Alex Researcher</h3>
              <p className="text-xs text-muted-foreground">UX Research Lead</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { icon: Mail, label: "alex@uxtracker.io" },
              { icon: MapPin, label: "San Francisco, CA" },
              { icon: Calendar, label: "Joined Mar 2025" },
              { icon: Activity, label: "Pro Plan" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <item.icon size={12} className="flex-shrink-0" />
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-[10px] font-medium text-muted-foreground tracking-wide uppercase mb-3">Session Overview</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Clock, label: "Total Time", value: "142h" },
                { icon: Target, label: "Sessions", value: "284" },
                { icon: Activity, label: "Avg Score", value: "73%" },
              ].map((item, i) => (
                <div key={i} className="glass-card p-3 text-center">
                  <item.icon size={14} className="mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">{item.value}</p>
                  <p className="text-[9px] text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </DashboardCard>
      </motion.div>
    </motion.div>
  );
};

export default ProfilePage;
