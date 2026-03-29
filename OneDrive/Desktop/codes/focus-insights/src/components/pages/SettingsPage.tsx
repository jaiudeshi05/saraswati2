import { motion } from "framer-motion";
import DashboardCard from "@/components/DashboardCard";
import { Camera, Eye, Shield, RefreshCw, Bell, User } from "lucide-react";
import { useState } from "react";

const Toggle = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
  <button
    onClick={onToggle}
    className={`w-10 h-5 rounded-full transition-colors duration-200 relative ${
      enabled ? "bg-accent" : "bg-muted"
    }`}
  >
    <div
      className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform duration-200 ${
        enabled ? "translate-x-5" : "translate-x-0.5"
      }`}
    />
  </button>
);

const SettingsPage = () => {
  const [webcam, setWebcam] = useState(true);
  const [tracking, setTracking] = useState(true);
  const [dataSync, setDataSync] = useState(false);
  const [analytics, setAnalytics] = useState(true);

  return (
    <div className="w-screen h-full flex-shrink-0 flex items-center justify-center px-6 pt-14 pb-16 overflow-y-auto">
      <div className="w-full max-w-5xl h-full py-4 flex flex-col gap-4 min-h-min pb-[100px]">
        <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Settings</p>

        <div className="grid grid-cols-3 gap-5 flex-1 w-full mt-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <DashboardCard glass className="h-full flex flex-col gap-5">
              <div className="flex items-center gap-2 mb-1">
                <Camera size={16} className="text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Capture</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-foreground">Webcam</p>
                  <p className="text-[10px] text-muted-foreground">Face tracking for mood</p>
                </div>
                <Toggle enabled={webcam} onToggle={() => setWebcam(!webcam)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-foreground">Activity Tracking</p>
                  <p className="text-[10px] text-muted-foreground">Mouse, keyboard, scroll</p>
                </div>
                <Toggle enabled={tracking} onToggle={() => setTracking(!tracking)} />
              </div>
            </DashboardCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <DashboardCard glass className="h-full flex flex-col gap-5">
              <div className="flex items-center gap-2 mb-1">
                <Shield size={16} className="text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Privacy</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-foreground">Local Processing</p>
                  <p className="text-[10px] text-muted-foreground">All data stays on device</p>
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Active</div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-foreground">Share Analytics</p>
                  <p className="text-[10px] text-muted-foreground">Anonymous usage data</p>
                </div>
                <Toggle enabled={analytics} onToggle={() => setAnalytics(!analytics)} />
              </div>
            </DashboardCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <DashboardCard glass className="h-full flex flex-col gap-5">
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw size={16} className="text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Data Sync</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-foreground">Cloud Backup</p>
                  <p className="text-[10px] text-muted-foreground">Sync across devices</p>
                </div>
                <Toggle enabled={dataSync} onToggle={() => setDataSync(!dataSync)} />
              </div>
              <div className="mt-auto">
                <p className="text-[10px] text-muted-foreground">Last sync: Never</p>
              </div>
            </DashboardCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <DashboardCard glass className="h-full flex flex-col gap-5">
              <div className="flex items-center gap-2 mb-1">
                <Eye size={16} className="text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Model Insights</p>
              </div>
              <div className="space-y-3 mt-1">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <span className="text-xs text-muted-foreground">CV Model</span>
                  <span className="text-xs text-foreground font-medium">v2.1.4</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <span className="text-xs text-muted-foreground">UX Model</span>
                  <span className="text-xs text-foreground font-medium">v1.8.0</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <span className="text-xs text-muted-foreground">GPU Acceleration</span>
                  <span className="text-[10px] text-emerald-500 font-medium">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Latency</span>
                  <span className="text-xs accent-text font-medium">12ms</span>
                </div>
              </div>
            </DashboardCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <DashboardCard glass className="h-full flex flex-col gap-5">
              <div className="flex items-center gap-2 mb-1">
                <Bell size={16} className="text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Notifications</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-foreground">Usage Alerts</p>
                  <p className="text-[10px] text-muted-foreground">When focus drops low</p>
                </div>
                <Toggle enabled={true} onToggle={() => {}} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-foreground">Daily Summaries</p>
                  <p className="text-[10px] text-muted-foreground">End of day insights</p>
                </div>
                <Toggle enabled={false} onToggle={() => {}} />
              </div>
            </DashboardCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <DashboardCard glass className="h-full flex flex-col gap-5">
              <div className="flex items-center gap-2 mb-1">
                <User size={16} className="text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Account</p>
              </div>
              <div className="space-y-3 mt-1">
                <div className="flex flex-col gap-1 border-b border-border/40 pb-2">
                  <span className="text-xs text-foreground">Plan</span>
                  <span className="text-xs accent-text font-medium">Pro Developer</span>
                </div>
                <div className="flex flex-col gap-1 border-b border-border/40 pb-2">
                  <span className="text-xs text-foreground">License Key</span>
                  <span className="text-[10px] text-muted-foreground font-mono">XXXX-XXXX-XXXX-9821</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors mt-2">Manage Subscription &rarr;</span>
                </div>
              </div>
            </DashboardCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
