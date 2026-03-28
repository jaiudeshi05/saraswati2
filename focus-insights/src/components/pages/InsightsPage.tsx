import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardCard from "@/components/DashboardCard";
import { Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

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
  const barData = tabData[activeTab];

  return (
    <div className="w-full h-full flex-shrink-0 flex items-center justify-center px-6 pt-[88px] pb-[104px] overflow-hidden">
      <div className="w-full max-w-6xl h-full grid grid-cols-[1fr_280px] gap-4 py-2 min-h-0">
        {/* Main Charts */}
        <div className="flex flex-col gap-4">
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
                      <Bar dataKey="value" fill="var(--accent-orange)" radius={[4, 4, 0, 0]} animationDuration={1000} />
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
        </div>

        {/* Sidebar Stats */}
        <div className="flex flex-col gap-4">
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
              { time: "9:00", mood: "😊 Engaged" },
              { time: "10:30", mood: "😐 Neutral" },
              { time: "11:45", mood: "😤 Frustrated" },
              { time: "13:00", mood: "😊 Recovered" },
              { time: "14:15", mood: "🧘 Focused" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex items-center gap-2"
              >
                <span className="text-[10px] text-muted-foreground w-10">{item.time}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span className="text-xs text-foreground">{item.mood}</span>
              </motion.div>
            ))}
          </DashboardCard>
        </div>
      </div>
    </div>
  );
};

export default InsightsPage;
