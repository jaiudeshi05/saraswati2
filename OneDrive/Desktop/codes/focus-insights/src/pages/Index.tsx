import { useState, useRef, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import HomePage from "@/components/pages/HomePage";
import DotGrid from "@/components/Backgrounds/DotGrid";
import InsightsPage from "@/components/pages/InsightsPage";
import StatsPage from "@/components/pages/StatsPage";
import SettingsPage from "@/components/pages/SettingsPage";
import MissionPage from "@/components/pages/MissionPage";
import ProfilePage from "@/components/pages/ProfilePage";

const pages = [HomePage, InsightsPage, StatsPage, SettingsPage, MissionPage];

type AvatarType = "fatigued" | "distracted" | "rage" | "focused" | "confused";

const Index = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDark, setIsDark] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [avatarType, setAvatarType] = useState<AvatarType>("fatigued");
  const containerRef = useRef<HTMLDivElement>(null);

  const navigateTo = useCallback((index: number) => {
    if (index < 0 || index >= pages.length) return;
    setActiveIndex(index);
    containerRef.current?.scrollTo({ left: index * window.innerWidth, behavior: "smooth" });
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let timeout: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const idx = Math.round(container.scrollLeft / window.innerWidth);
        setActiveIndex(idx);
      }, 100);
    };
    container.addEventListener("scroll", onScroll);
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  // Ensure dark mode class is applied on mount
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  return (
    <div className="h-screen w-screen bg-surface-gradient relative overflow-hidden">
      {/* Interactive Dot Grid Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="w-full h-full pointer-events-auto">
          <DotGrid
            baseColor={isDark ? "#334155" : "#94a3b8"}
            activeColor={isDark ? "#3b82f6" : "#2563eb"}
            gap={32}
            dotSize={4}
            proximity={120}
          />
        </div>
      </div>

      <TopBar
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onProfileClick={() => setShowProfile(true)}
        avatarType={avatarType}
        setAvatarType={setAvatarType}
      />

      {activeIndex > 0 && (
        <button
          onClick={() => navigateTo(activeIndex - 1)}
          className="fixed left-3 top-1/2 -translate-y-1/2 z-40 w-8 h-8 rounded-full glass-card flex items-center justify-center hover:bg-muted/50 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
      )}

      {activeIndex < pages.length - 1 && (
        <button
          onClick={() => navigateTo(activeIndex + 1)}
          className="fixed right-3 top-1/2 -translate-y-1/2 z-40 w-8 h-8 rounded-full glass-card flex items-center justify-center hover:bg-muted/50 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* Scroll container: owns overflow hidden, fixed navbars float above it */}
      <div
        ref={containerRef}
        className="absolute inset-0 flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {pages.map((Page, i) => (
          <div key={i} className="snap-start flex-shrink-0 w-screen h-full" style={{ scrollSnapAlign: "start" }}>
            <Page {...(i === 0 ? { avatarType } : {})} />
          </div>
        ))}
      </div>

      <BottomNav activeIndex={activeIndex} onNavigate={navigateTo} />

      <AnimatePresence>
        {showProfile && <ProfilePage onClose={() => setShowProfile(false)} />}
      </AnimatePresence>
    </div>
  );
};

export default Index;
