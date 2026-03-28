import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, TrendingUp, Eye, AlertTriangle, Zap, CheckCircle } from "lucide-react";
import DashboardCard from "@/components/DashboardCard";
import Avatar3D from "@/components/Avatar3D";

const getInsights = () => [
  { icon: CheckCircle, text: "Excellent coding streak maintained for 45 minutes", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  { icon: Eye, text: "Average focus time is 12% higher than yesterday", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  { icon: Zap, text: "Scroll fatigue observed during code review", color: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/20" },
  { icon: AlertTriangle, text: "Frequent tab switching detected (Google/StackOverflow)", color: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20" },
];

interface HomePageProps {
  avatarType?: "fatigued" | "distracted" | "rage" | "focused" | "confused";
}

const HomePage = ({ avatarType = "fatigued" }: HomePageProps) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("Listening for voice notes...");
  const [waveData, setWaveData] = useState<number[]>(new Array(24).fill(3));
  const recognitionRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const stopListening = useCallback(() => {
    setIsListening(false);
    recognitionRef.current?.stop();
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setWaveData(new Array(24).fill(3));
    if (transcript === "") setTranscript("Microphone off. Click to start.");
  }, [transcript]);

  const startListening = useCallback(async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTranscript("Speech recognition not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const updateWave = () => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const bars = Array.from(data.slice(0, 24)).map((v) => Math.max(3, (v / 255) * 28));
        setWaveData(bars);
        animFrameRef.current = requestAnimationFrame(updateWave);
      };
      updateWave();
    } catch {
      // Mic access denied
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        finalTranscript += event.results[i][0].transcript;
      }
      setTranscript(finalTranscript || "Listening...");
    };

    recognition.onerror = () => stopListening();
    recognition.onend = () => stopListening();

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setTranscript("Listening...");
  }, [stopListening]);

  useEffect(() => {
    return () => stopListening();
  }, [stopListening]);

  return (
    <div className="w-screen h-[80vh] flex-shrink-0 flex flex-col items-center justify-center px-6 pt-20 pb-16 box-border relative overflow-hidden">
      {/* max-h clamps the entire panel so it physically cannot reach the navbars */}
      <div className="w-full max-w-6xl flex-1 max-h-[700px] grid grid-cols-3 gap-6 py-2 min-h-0">
        {/* Column 1 — 3D Avatar Image */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col h-full bg-transparent border-none shadow-none outline-none items-center justify-center"
        >
          <div className="text-center w-full mb-4 z-10">
            <h2 className="text-3xl font-extrabold text-foreground capitalize tracking-widest">{avatarType}</h2>
            <p className="text-sm font-medium text-muted-foreground uppercase mt-1 tracking-widest">Current Emotion</p>
          </div>
          <div className="w-full flex-1 relative flex items-center justify-center">
             <Suspense fallback={<div className="text-muted-foreground animate-pulse">Loading model...</div>}>
                <Avatar3D type={avatarType} />
             </Suspense>
          </div>
        </motion.div>

        {/* Column 2 — Satisfaction Score (Expanded) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col gap-4 h-full"
        >
          <DashboardCard glass className="flex-1 flex flex-col items-center justify-center relative">
            <p className="absolute top-6 left-6 text-sm font-semibold text-muted-foreground tracking-wide uppercase">Satisfaction Score</p>
            <div className="relative w-56 h-56 mt-4">
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
            <div className="flex items-center gap-2 mt-8 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              <TrendingUp size={16} className="text-emerald-500" />
              <span className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">+9.2% Focus Shift</span>
            </div>
          </DashboardCard>
        </motion.div>

        {/* Column 3 — Voice + Insights */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col gap-4 h-full"
        >
          <DashboardCard glass className="flex-none flex flex-col h-[180px]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  isListening ? "bg-red-500/20 text-red-500" : "bg-blue-500/10 text-blue-500"
                }`}>
                  <Mic size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground leading-tight">Voice Context</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-muted-foreground'}`}></span>
                    {isListening ? "Recording..." : "Standby"}
                  </p>
                </div>
              </div>
              <button
                onClick={isListening ? stopListening : startListening}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isListening
                    ? "bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                    : "bg-blue-500/10 hover:bg-blue-500/20 text-blue-500"
                }`}
              >
                {isListening ? <MicOff size={14} /> : <Mic size={14} />}
              </button>
            </div>
            
            <div className="flex-1 flex flex-col justify-end">
              <div className="flex items-end justify-center gap-[4px] h-6 mb-1.5 px-2 flex-shrink-0">
                {waveData.map((h, i) => (
                  <motion.div
                    key={i}
                    className={`w-1 rounded-t-sm transition-colors ${isListening ? 'bg-blue-500' : 'bg-muted/50'}`}
                    animate={{ height: isListening ? h/2 : 2 }}
                    transition={{ duration: 0.08 }}
                  />
                ))}
              </div>
              <div className="w-full rounded-lg bg-background/50 border border-border/50 p-2.5 flex-1 overflow-y-auto">
                <p className={`text-[11px] italic leading-snug ${isListening ? 'text-foreground' : 'text-muted-foreground'}`}>
                  "{transcript}"
                </p>
              </div>
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
