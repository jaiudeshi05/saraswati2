import { motion } from "framer-motion";
import DashboardCard from "@/components/DashboardCard";
import { LineChart, Line, ResponsiveContainer } from "recharts";

const stats = [
  { label: "WPM", value: "72", desc: "Words per minute", trend: [{ val: 40 }, { val: 55 }, { val: 60 }, { val: 72 }, { val: 68 }, { val: 72 }] },
  { label: "Backspace Rate", value: "12%", desc: "Error correction frequency", trend: [{ val: 18 }, { val: 15 }, { val: 14 }, { val: 12 }, { val: 13 }, { val: 12 }] },
  { label: "Mouse Velocity", value: "340 px/s", desc: "Average cursor speed", trend: [{ val: 280 }, { val: 310 }, { val: 330 }, { val: 340 }, { val: 335 }, { val: 340 }] },
  { label: "Dir. Reversals", value: "8.2/min", desc: "Direction changes", trend: [{ val: 12 }, { val: 10 }, { val: 9 }, { val: 8 }, { val: 8.5 }, { val: 8.2 }] },
  { label: "Click Rate", value: "24/min", desc: "Clicks per minute", trend: [{ val: 30 }, { val: 28 }, { val: 26 }, { val: 24 }, { val: 25 }, { val: 24 }] },
  { label: "Scroll Speed", value: "520 px/s", desc: "Scroll velocity avg", trend: [{ val: 400 }, { val: 450 }, { val: 480 }, { val: 520 }, { val: 510 }, { val: 520 }] },
  { label: "Scroll Reversals", value: "3.1/min", desc: "Scroll dir changes", trend: [{ val: 5 }, { val: 4.5 }, { val: 4 }, { val: 3.5 }, { val: 3.2 }, { val: 3.1 }] },
  { label: "Idle Ratio", value: "0.18", desc: "Fraction of idle time", trend: [{ val: 0.3 }, { val: 0.25 }, { val: 0.22 }, { val: 0.2 }, { val: 0.19 }, { val: 0.18 }] },
  { label: "Undo/Redo Rate", value: "2.4/min", desc: "Undo & redo freq", trend: [{ val: 4 }, { val: 3.5 }, { val: 3 }, { val: 2.8 }, { val: 2.5 }, { val: 2.4 }] },
  { label: "Session Duration", value: "47 min", desc: "Current session length", trend: [{ val: 10 }, { val: 20 }, { val: 30 }, { val: 35 }, { val: 42 }, { val: 47 }] },
  { label: "Hour Sin", value: "0.87", desc: "Circadian position encode", trend: [{ val: 0.5 }, { val: 0.65 }, { val: 0.75 }, { val: 0.82 }, { val: 0.85 }, { val: 0.87 }] },
  { label: "Tab Switch Rate", value: "5.3/min", desc: "Tab switches per min", trend: [{ val: 8 }, { val: 7 }, { val: 6.5 }, { val: 6 }, { val: 5.5 }, { val: 5.3 }] },
];

const MicroGraph = ({ data }: { data: { val: number }[] }) => {
  return (
    <div className="w-full h-8 opacity-80 pointer-events-none">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="val"
            stroke="var(--accent-orange)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const StatsPage = () => {
  return (
    <div className="w-full h-full flex-shrink-0 flex items-center justify-center px-6 pt-[88px] pb-[104px] overflow-hidden">
      <div className="w-full max-w-6xl h-full py-2 flex flex-col">
        <p className="text-sm font-semibold text-muted-foreground tracking-wide uppercase mb-4 flex-shrink-0">Stats for Nerds</p>
        <div className="grid grid-cols-4 grid-rows-3 gap-4 flex-1 min-h-0 pb-4">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.04, y: -4 }}
              transition={{ delay: 0.1 + i * 0.03, type: "spring", stiffness: 300, damping: 20 }}
              className="cursor-pointer h-full"
            >
              <DashboardCard glass className="h-full flex flex-col justify-between group hover:border-accent/50 p-4 relative overflow-hidden">
                <div className="z-10">
                  <p className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1 group-hover:text-orange-500 transition-colors duration-300">{stat.value}</p>
                  <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-1">{stat.desc}</p>
                </div>
                <div className="mt-4 z-10 w-full relative">
                  <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background/20 to-transparent -z-10 blur-xl"></div>
                  <MicroGraph data={stat.trend} />
                </div>
              </DashboardCard>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsPage;

