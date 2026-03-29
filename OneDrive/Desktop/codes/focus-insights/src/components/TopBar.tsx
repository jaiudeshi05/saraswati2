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
      className="fixed top-[5px] left-0 right-0 z-50 h-[68px] flex items-center justify-between px-8 bg-background/20 backdrop-blur-xl border-b border-border/10 transition-colors duration-500"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tracking-tight text-foreground">Focus Insights</span>
        <span className="text-xs text-muted-foreground">/ Dashboard</span>
      </div>
      <div className="flex items-center gap-4">
        <select 
          value={avatarType} 
          onChange={(e) => setAvatarType(e.target.value as AvatarType)}
          className="bg-popover text-popover-foreground text-sm border border-muted rounded-md px-3 py-2 outline-none cursor-pointer shadow-sm hover:border-accent transition-colors"
        >
          <option value="fatigued" className="bg-popover text-popover-foreground">Fatigued</option>
          <option value="distracted" className="bg-popover text-popover-foreground">Distracted</option>
          <option value="rage" className="bg-popover text-popover-foreground">Rage</option>
          <option value="focused" className="bg-popover text-popover-foreground">Focused</option>
          <option value="confused" className="bg-popover text-popover-foreground">Confused</option>
        </select>
        <div className="flex items-center gap-2 border-l border-border/50 pl-4">
          <button
            onClick={onToggleTheme}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-muted/50 transition-all text-muted-foreground hover:text-foreground"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-muted/50 transition-all text-muted-foreground hover:text-foreground">
            <Settings size={18} />
          </button>
          <button
            onClick={onProfileClick}
            className="w-16 h-16 ml-2 rounded-full flex items-center justify-center border-2 border-transparent hover:border-accent transition-all cursor-pointer overflow-hidden shadow-md"
          >
            <img 
              src={`/${avatarType}.png`} 
              alt={avatarType} 
              className="w-full h-full object-cover bg-muted" 
              onError={(e) => { 
                e.currentTarget.style.display = 'none'; 
                e.currentTarget.nextElementSibling?.classList.remove('hidden'); 
              }} 
            />
            <User size={20} className="text-muted-foreground hidden absolute" />
          </button>
        </div>
      </div>
    </motion.header>
  );
};

export default TopBar;
