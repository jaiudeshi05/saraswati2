import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Eye, AlertTriangle, Zap, CheckCircle, Video, VideoOff, ScanFace, Activity } from "lucide-react";
import DashboardCard from "@/components/DashboardCard";
import Avatar3D from "@/components/Avatar3D";

const getInsights = () => [
  { icon: CheckCircle, text: "Excellent coding streak maintained for 45 minutes", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  { icon: Eye, text: "Average focus time is 12% higher than yesterday", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  { icon: Zap, text: "Scroll fatigue observed during code review", color: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/20" },
  { icon: AlertTriangle, text: "Frequent tab switching detected (Google/StackOverflow)", color: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20" },
];

interface HomePageProps {
  avatarType?: string;
}

const emotionColors: Record<string, string> = {
  fatigued: "#F59E0B",
  focused: "#10B981",
  frustrated: "#EF4444",
  engaged: "#3B82F6",
  confused: "#94A3B8"
};

const badges = [
  { icon: "🔥", title: "Deep Focus", sub: "3hr unbroken session", color: "border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]", locked: false },
  { icon: "🌅", title: "Early Bird", sub: "Started before 9 AM", color: "border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.3)]", locked: false },
];

const HomePage = ({ avatarType = "fatigued" }: HomePageProps) => {
  const [is3D, setIs3D] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
      setMediaStream(stream);
      setIsCapturing(true);
    } catch {
      // Camera access denied
    }
  }, []);

  const stopCapture = useCallback(() => {
    mediaStream?.getTracks().forEach((t) => t.stop());
    setMediaStream(null);
    setIsCapturing(false);
  }, [mediaStream]);

  // Bind stream to video element after it renders
  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream, isCapturing]);

  useEffect(() => {
    return () => {
      mediaStream?.getTracks().forEach((t) => t.stop());
    };
  }, [mediaStream]);

  return (
    <div className="w-screen h-screen flex-shrink-0 flex flex-col items-center justify-center px-6 pt-16 pb-12 box-border relative overflow-hidden">
      <div className="w-full max-w-6xl max-h-[75vh] flex-1 grid gap-6 py-2 mt-2" style={{ gridTemplateColumns: '2fr 2fr 3fr' }}>
        {/* Column 1 — 3D Avatar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col h-full bg-transparent border-none shadow-none outline-none items-center justify-center"
        >
          {/* Text: 1 part */}
          <div style={{ flex: 1 }} className="text-center flex flex-col items-center justify-center w-full z-10">
            <h2 className="text-3xl font-extrabold text-foreground capitalize tracking-widest">{avatarType}</h2>
            <p className="text-sm font-medium text-muted-foreground uppercase mt-1 tracking-widest">Current Emotion</p>
          </div>

          {/* Avatar: 3 parts */}
          <div style={{ flex: 3 }} className="w-full relative flex flex-col items-center justify-center">
            <div
              className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded-full animate-pulse-ring blur-xl"
              style={{
                width: "240px",
                height: "240px",
                zIndex: -1,
                backgroundColor: emotionColors[avatarType] ? emotionColors[avatarType] + "33" : emotionColors.fatigued + "33",
              }}
            ></div>
            <div className="w-full h-full relative z-10">
              <Suspense fallback={<div className="w-full h-full flex items-center justify-center opacity-50"><span className="loader"></span></div>}>
                {is3D ? (
                  <Avatar3D type={avatarType as any} />
                ) : (
                  <img src={`/${avatarType}.png`} alt={avatarType} className="w-full h-full object-contain scale-90" />
                )}
              </Suspense>
            </div>
            
            <button 
              onClick={() => setIs3D(!is3D)}
              className="absolute -bottom-2 px-3 py-1 bg-background/50 backdrop-blur-md rounded-full border border-border text-xs font-semibold text-muted-foreground hover:text-foreground z-20 transition-colors"
            >
              Toggle {is3D ? "2D" : "3D"}
            </button>
          </div>

          {/* Achievements: 1.5 parts */}
          <div style={{ flex: 1.5 }} className="w-full flex flex-col items-center justify-center gap-2 mt-4">
            <p className="text-[10px] font-medium text-muted-foreground tracking-widest uppercase text-center opacity-70">Today's Achievements</p>
            <div className="w-full flex overflow-x-auto gap-3 pb-2 scrollbar-hide justify-center select-none pointer-events-auto snap-x">
              {badges.map((badge, i) => (
                <div
                  key={i}
                  className={`flex-shrink-0 w-36 p-2 rounded-xl glass-card flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 snap-center group ${badge.locked ? "opacity-40 grayscale border-border/20" : `border-2 ${badge.color}`
                    }`}
                  title={badge.locked ? `Complete: ${badge.sub}` : ""}
                >
                  {badge.locked && <div className="absolute inset-0 bg-transparent" title={`Complete: ${badge.sub}`} />}
                  {!badge.locked && <div className="animate-shine-sweep mix-blend-overlay"></div>}
                  <span className="text-2xl mb-1">{badge.icon}</span>
                  <span className="text-xs font-bold whitespace-nowrap">{badge.title}</span>
                  <span className="text-[8px] text-muted-foreground text-center line-clamp-1">{badge.sub}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Column 2 — Satisfaction Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col gap-4 h-full"
        >
          <DashboardCard glass className="flex-1 flex flex-col items-center justify-center relative">
            <p className="absolute top-6 left-6 text-sm font-semibold text-muted-foreground tracking-wide uppercase">Satisfaction Score</p>
            <div className="relative w-44 h-44 mt-4">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 drop-shadow-lg">
                <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted)/0.3)" strokeWidth="12" />
                <motion.circle
                  cx="50" cy="50" r="40" fill="none"
                  stroke="var(--accent-orange)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={251.2}
                  initial={{ strokeDashoffset: 251.2 }}
                  animate={{ strokeDashoffset: 251.2 * (1 - 0.76) }}
                  transition={{ duration: 2, ease: "easeOut", delay: 0.5 }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold text-foreground">76<span className="text-2xl text-muted-foreground">%</span></span>
                <span className="text-xs text-muted-foreground mt-1">Excellent</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-6 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              <TrendingUp size={16} className="text-emerald-500" />
              <span className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">+9.2% Focus Shift</span>
            </div>
          </DashboardCard>
        </motion.div>

        {/* Column 3 — Focus Capture + Insights */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col gap-4 h-full"
        >
          {/* Focus Capture Section */}
          <DashboardCard glass className="flex-[1.2] flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isCapturing ? "bg-emerald-500/20 text-emerald-500" : "bg-blue-500/10 text-blue-500"
                  }`}>
                  <ScanFace size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground leading-tight">Focus Capture</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isCapturing ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`}></span>
                    {isCapturing ? "Analyzing expressions..." : "Enable camera to track focus"}
                  </p>
                </div>
              </div>
              <button
                onClick={isCapturing ? stopCapture : startCapture}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all duration-300 text-xs font-semibold ${isCapturing
                  ? "bg-red-500/15 hover:bg-red-500/25 text-red-500 border border-red-500/30"
                  : "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-500 border border-emerald-500/30"
                  }`}
              >
                {isCapturing ? <><VideoOff size={13} /> Stop</> : <><Video size={13} /> Start</>}
              </button>
            </div>

            <div className="flex-1 rounded-xl bg-background/30 border border-border/30 overflow-hidden relative">
              {isCapturing ? (
                <>
                  <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover rounded-xl" />
                  {/* Face tracking overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[20%] left-[30%] w-[40%] h-[50%] border-2 border-emerald-400/50 rounded-2xl">
                      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg"></div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg"></div>
                      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg"></div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br-lg"></div>
                    </div>
                  </div>
                  {/* Live metrics strip */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2 flex items-end justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Eye size={11} className="text-emerald-400" />
                        <span className="text-[10px] text-white/80 font-medium">Blink: 14/min</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Activity size={11} className="text-blue-400" />
                        <span className="text-[10px] text-white/80 font-medium">Focus: 87%</span>
                      </div>
                    </div>
                    <span className="text-[9px] text-emerald-400 font-semibold uppercase tracking-wider">Live</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <div className="w-16 h-16 rounded-2xl bg-muted/20 border border-border/30 flex items-center justify-center">
                    <ScanFace size={28} className="text-muted-foreground/30" />
                  </div>
                  <p className="text-xs text-muted-foreground/50 font-medium">Enable camera for emotion detection</p>
                  <p className="text-[10px] text-muted-foreground/30">Tracks blink rate, gaze, and micro-expressions</p>
                </div>
              )}
            </div>
          </DashboardCard>

          <DashboardCard glass className="flex-1 flex flex-col min-h-0">
            <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase mb-3 flex-shrink-0 opacity-80">Top AI Insights</p>
            <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto pr-2 scrollbar-none">
              {getInsights().map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${item.color}`}
                >
                  <item.icon size={16} className="mt-0.5 flex-shrink-0" />
                  <span className="text-[11.5px] font-semibold leading-snug">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </DashboardCard>
        </motion.div>
      </div>
    </div>
  );
};

export default HomePage;
