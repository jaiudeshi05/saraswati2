import { motion } from "framer-motion";

const blocks = [
  {
    title: "Decode Interaction",
    text: "We decode human-computer interaction patterns using computer vision and behavioral analytics.",
  },
  {
    title: "Measure Productivity",
    text: "Making productivity measurable through non-invasive tracking and intelligent scoring systems.",
  },
  {
    title: "Ethics First",
    text: "Ethical tracking, user-first insights. Your data never leaves your device without consent.",
  },
];

const MissionPage = () => {
  return (
    <div className="w-screen h-full flex-shrink-0 flex items-center justify-center px-6 pt-14 pb-16">
      <div className="w-full max-w-4xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-4"
        >
          Our Mission
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl md:text-5xl font-light text-foreground mb-12 leading-tight tracking-tight"
        >
          Understanding how you work,<br />
          <span className="accent-text font-medium">so you can work better.</span>
        </motion.h2>

        <div className="grid grid-cols-3 gap-4">
          {blocks.map((block, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ delay: 0.3 + i * 0.15 }}
              className="glass-card p-6 card-hover text-left"
            >
              <p className="text-sm font-semibold text-foreground mb-2">{block.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{block.text}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-10 flex items-center justify-center gap-6"
        >
          {["Privacy-first", "Open research", "No cloud required"].map((tag, i) => (
            <span key={i} className="text-[10px] text-muted-foreground tracking-wide uppercase glass-card px-4 py-1.5">
              {tag}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default MissionPage;
