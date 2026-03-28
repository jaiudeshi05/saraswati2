import { Home, BarChart3, Cpu, Settings, Heart } from "lucide-react";

const navItems = [
  { icon: Home, label: "Home", index: 0 },
  { icon: BarChart3, label: "Insights", index: 1 },
  { icon: Cpu, label: "Stats", index: 2 },
  { icon: Settings, label: "Settings", index: 3 },
  { icon: Heart, label: "Mission", index: 4 },
];

interface BottomNavProps {
  activeIndex: number;
  onNavigate: (index: number) => void;
}

const BottomNav = ({ activeIndex, onNavigate }: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] flex items-end justify-between w-full pointer-events-auto">
      {navItems.map((item) => {
        const isActive = activeIndex === item.index;
        return (
          <button
            key={item.index}
            onClick={() => onNavigate(item.index)}
            className={`nav-box relative flex flex-col items-center justify-center transition-all duration-500 rounded-t-2xl border-t border-x border-border/50 backdrop-blur-md ${
              isActive
                ? "h-[72px] -translate-y-4 bg-[hsl(var(--muted)/0.95)] z-50 gap-1.5 border-t-orange-500 border-t-2 shadow-[0_-8px_20px_rgba(249,115,22,0.2)]"
                : "h-[56px] translate-y-0 bg-[hsl(var(--muted)/0.4)] z-10 gap-1"
              }`}
            style={{ width: "20vw" }}
          >
            {isActive && (
              <div className="absolute top-2 w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,1)]" />
            )}
            <item.icon
              size={isActive ? 22 : 18}
              className={`transition-all duration-500 ease-out ${
                isActive ? "text-orange-500 mt-2 filter drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" : "text-muted-foreground"
              }`}
            />
            <span
              className={`text-[11px] font-bold transition-colors duration-500 ${
                isActive ? "text-orange-500 drop-shadow-[0_0_6px_rgba(249,115,22,0.4)]" : "text-muted-foreground font-medium"
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
