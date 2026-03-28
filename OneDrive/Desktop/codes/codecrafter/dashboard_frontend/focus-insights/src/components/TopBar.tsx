import { Moon, Sun, Settings, User } from "lucide-react";
import { motion } from "framer-motion";

type AvatarType = "fatigued" | "distracted" | "rage" | "focused" | "confused";

interface TopBarProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onProfileClick?: () => void;
  avatarType: AvatarType;
  setAvatarType: (type: AvatarType) => void;
}

const TopBar = ({ isDark, onToggleTheme, onProfileClick, avatarType, setAvatarType }: TopBarProps) => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-6 glass-effect"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tracking-tight text-foreground">Focus Insights</span>
        <span className="text-xs text-muted-foreground">/ Dashboard</span>
      </div>
      <div className="flex items-center gap-3">
        <select 
          value={avatarType} 
          onChange={(e) => setAvatarType(e.target.value as AvatarType)}
          className="bg-transparent text-sm border border-muted rounded-md px-2 py-1 outline-none text-foreground cursor-pointer"
        >
          <option value="fatigued">Fatigued</option>
          <option value="distracted">Distracted</option>
          <option value="rage">Rage</option>
          <option value="focused">Focused</option>
          <option value="confused">Confused</option>
        </select>
        <button
          onClick={onToggleTheme}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted/50 transition-colors"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted/50 transition-colors">
          <Settings size={16} />
        </button>
        <button
          onClick={onProfileClick}
          className="w-8 h-8 rounded-full glass-card flex items-center justify-center hover:border-accent transition-colors cursor-pointer"
        >
          <User size={14} className="text-muted-foreground" />
        </button>
      </div>
    </motion.header>
  );
};

export default TopBar;
