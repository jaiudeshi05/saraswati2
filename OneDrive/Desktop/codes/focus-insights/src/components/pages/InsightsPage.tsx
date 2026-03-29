import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardCard from "@/components/DashboardCard";
import { Clock, Activity, Target } from "lucide-react";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const tabs = ["Coding", "Browsing", "Writing", "Meeting"];

const tabData: Record<string, { label: string; value: number }[]> = {
  Coding: [
    { label: "9:00", value: 85 }, { label: "9:30", value: 92 }, { label: "10:00", value: 88 },
    { label: "10:30", value: 45 }, { label: "11:00", value: 72 }, { label: "11:30", value: 95 },
    { label: "12:00", value: 30 }, { label: "12:30", value: 55 }, { label: "13:00", value: 78 },
    { label: "13:30", value: 90 }, { label: "14:00", value: 82 }, { label: "14:30", value: 70 },
  ],
  Browsing: [
    { label: "9:00", value: 40 }, { label: "9:30", value: 65 }, { label: "10:00", value: 55 },
    { label: "10:30", value: 78 }, { label: "11:00", value: 82 }, { label: "11:30", value: 50 },
    { label: "12:00", value: 90 }, { label: "12:30", value: 72 }, { label: "13:00", value: 45 },
    { label: "13:30", value: 60 }, { label: "14:00", value: 38 }, { label: "14:30", value: 55 },
  ],
  Writing: [
    { label: "9:00", value: 70 }, { label: "9:30", value: 75 }, { label: "10:00", value: 92 },
    { label: "10:30", value: 88 }, { label: "11:00", value: 60 }, { label: "11:30", value: 45 },
    { label: "12:00", value: 35 }, { label: "12:30", value: 80 }, { label: "13:00", value: 85 },
    { label: "13:30", value: 72 }, { label: "14:00", value: 68 }, { label: "14:30", value: 90 },
  ],
  Meeting: [
    { label: "9:00", value: 20 }, { label: "9:30", value: 25 }, { label: "10:00", value: 95 },
    { label: "10:30", value: 90 }, { label: "11:00", value: 30 }, { label: "11:30", value: 15 },
    { label: "12:00", value: 10 }, { label: "12:30", value: 20 }, { label: "13:00", value: 88 },
    { label: "13:30", value: 92 }, { label: "14:00", value: 85 }, { label: "14:30", value: 40 },
  ],
};

const sessionTimes: Record<string, string> = {
  Coding: "3h 42m", Browsing: "1h 15m", Writing: "2h 08m", Meeting: "1h 30m",
};

const heatmapData = Array.from({ length: 7 }, (_, row) =>
  Array.from({ length: 12 }, (_, col) => ({
    value: Math.floor(Math.random() * 100),
    time: `${9 + Math.floor(col / 2)}:${col % 2 === 0 ? "00" : "30"}`,
    mood: ["Focused", "Distracted", "Neutral", "Engaged"][Math.floor(Math.random() * 4)],
  }))
);

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const getHeatColor = (value: number) => {
  if (value > 75) return "bg-accent/70";
  if (value > 50) return "bg-accent/40";
  if (value > 25) return "bg-accent/20";
  return "bg-muted";
};

const InsightsPage = () => {
  const [activeTab, setActiveTab] = useState("Coding");
  const [scrubIndex, setScrubIndex] = useState(10); // default to 14:00
  const barData = tabData[activeTab];

  const times = [
    "9:00", "9:30", "10:00", "10:30", "11:00", "11:30", 
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30"
  ];

  const getSnapshotData = (idx: number) => {
    if (idx <= 2) return { activity: "Coding", score: 82, mood: "😄 Engaged", time: times[idx] };
    if (idx <= 4) return { activity: "Coding", score: 74, mood: "😐 Neutral", time: times[idx] };
    if (idx <= 7) return { activity: "Browsing", score: 45, mood: "😤 Frustrated", time: times[idx] };
    if (idx <= 9) return { activity: "Writing", score: 78, mood: "😊 Recovered", time: times[idx] };
    return { activity: "Coding", score: 88, mood: "🧘 Focused", time: times[idx] };
  };

  const snapshot = getSnapshotData(scrubIndex);

  return (
    <div className="w-full h-full flex-shrink-0 flex items-center justify-center px-6 pt-[88px] pb-[104px] overflow-hidden">
      <div className="w-full max-w-6xl h-full grid grid-cols-[1fr_280px] gap-4 py-2 min-h-0">
        {/* Main Charts */}
        <motion.div 
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ delay: 0.1 }}
           className="flex flex-col gap-4"
        >
          {/* Tab Bar + Bar Chart */}
          <DashboardCard glass className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${activeTab === tab
                        ? "bg-accent/15 accent-text"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Session: {sessionTimes[activeTab]}</span>
              </div>
            </div>

            {/* Timeline Scrubber */}
            <div className="w-full flex flex-col gap-1 px-2 mt-2 mb-6 pointer-events-auto">
              {/* Snapshot Card (floating style) */}
              <AnimatePresence mode="popLayout">
                <motion.div 
                  key={snapshot.time}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between bg-card border border-border/50 shadow-md p-2.5 rounded-lg mb-2 relative mx-auto w-3/4"
                >
                  <div className="text-xs font-bold w-12 text-center text-foreground">{snapshot.time}</div>
                  <div className="w-px h-6 bg-border/50 mx-2"></div>
                  <div className="flex flex-1 items-center justify-around gap-2 text-xs">
                    <div className="flex items-center gap-1.5"><Activity size={12} className="text-blue-500" /><span className="text-muted-foreground">Act:</span> {snapshot.activity}</div>
                    <div className="flex items-center gap-1.5"><Target size={12} className="text-orange-500" /><span className="text-muted-foreground">Focus:</span> <span className="text-foreground font-semibold">{snapshot.score}</span></div>
                    <div className="flex items-center gap-1"><span className="text-muted-foreground">Mood:</span> {snapshot.mood}</div>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="relative w-full h-8 flex items-center justify-center">
                <input 
                  type="range" 
                  min="0" max="11" step="1" 
                  value={scrubIndex} 
                  onChange={(e) => setScrubIndex(parseInt(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-muted outline-none relative z-10" 
                  style={{ 
                     background: `linear-gradient(to right, var(--accent-orange) ${(scrubIndex / 11) * 100}%, hsl(var(--muted)) ${(scrubIndex / 11) * 100}%)`,
                  }}
                />
                {/* Custom thumb style overrides needed in standard CSS but tailwind handles most, we rely on accent-color in index.css or simple styling */}
              </div>
              <div className="flex justify-between w-full mt-1 text-[9px] text-muted-foreground">
                {times.map((t, i) => (
                  <span key={i} className={`text-center w-6 transition-colors ${i === scrubIndex ? "text-orange-500 font-bold" : ""}`}>
                    {t.replace(":00", "").replace(":30", ".5")}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 pt-4"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--muted)/0.4)" }}
                        contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} animationDuration={500}>
                        {barData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill="var(--accent-orange)" 
                            fillOpacity={index === scrubIndex ? 1 : 0.4}
                            stroke={index === scrubIndex ? "#ffedd5" : "none"}
                            strokeWidth={index === scrubIndex ? 2 : 0}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              </AnimatePresence>
            </div>
          </DashboardCard>

          {/* Heatmap */}
          <DashboardCard glass className="h-52 flex flex-col">
            <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase mb-3">Activity Heatmap</p>
            <div className="flex-1 flex flex-col gap-1">
              {heatmapData.map((row, ri) => (
                <div key={ri} className="flex items-center gap-1 flex-1">
                  <span className="text-[9px] text-muted-foreground w-6">{days[ri]}</span>
                  {row.map((cell, ci) => (
                    <div
                      key={ci}
                      className={`flex-1 h-full rounded-sm ${getHeatColor(cell.value)} cursor-pointer transition-all hover:ring-1 hover:ring-accent relative group`}
                    >
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-foreground text-background text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {cell.time} · {cell.mood}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </DashboardCard>
        </motion.div>

        {/* Sidebar Stats */}
        <motion.div 
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ delay: 0.2 }}
           className="flex flex-col gap-4"
        >
          <DashboardCard glass className="flex flex-col gap-3">
            <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Session Summary</p>
            {[
              { label: "Focus Time", value: "3h 42m" },
              { label: "Distracted", value: "1h 11m" },
              { label: "Idle", value: "30m" },
              { label: "Peak Focus", value: "10:15 AM" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="text-sm font-medium text-foreground">{item.value}</span>
              </div>
            ))}
          </DashboardCard>

          <DashboardCard glass className="flex-1 flex flex-col gap-3">
            <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Mood Timeline</p>
            {[
              { time: "9:00", mood: "😄 Engaged", idxRange: [0, 2] },
              { time: "10:30", mood: "😐 Neutral", idxRange: [3, 4] },
              { time: "11:45", mood: "😤 Frustrated", idxRange: [5, 7] },
              { time: "13:00", mood: "😊 Recovered", idxRange: [8, 9] },
              { time: "14:15", mood: "🧘 Focused", idxRange: [10, 11] },
            ].map((item, i) => {
              const isActive = scrubIndex >= item.idxRange[0] && scrubIndex <= item.idxRange[1];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className={`flex items-center gap-2 p-1.5 rounded-lg transition-colors ${isActive ? 'bg-muted/50' : ''}`}
                >
                  <span className={`text-[10px] w-10 transition-colors ${isActive ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>{item.time}</span>
                  <div className={`w-1.5 h-1.5 rounded-full transition-all ${isActive ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)] scale-125' : 'bg-muted-foreground pointer-events-none'}`} />
                  <span className={`text-xs transition-colors ${isActive ? 'text-orange-500 font-semibold' : 'text-foreground'}`}>{item.mood}</span>
                </motion.div>
              );
            })}
          </DashboardCard>
        </motion.div>
      </div>
    </div>
  );
};

export default InsightsPage;
