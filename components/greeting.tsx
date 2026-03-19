import { motion } from "framer-motion";
import {
  CopilotSelector,
  type CopilotOption,
} from "@/components/copilot-selector";

interface GreetingProps {
  copilots?: CopilotOption[];
  selectedCopilotId?: string | null;
  onSelectCopilot?: (copilotId: string | null) => void;
}

export const Greeting = ({
  copilots,
  selectedCopilotId,
  onSelectCopilot,
}: GreetingProps) => {
  return (
    <div
      className="mx-auto mt-4 flex size-full max-w-3xl flex-col justify-center gap-6 px-4 md:mt-16 md:px-8"
      key="overview"
    >
      <div>
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="font-bold text-2xl md:text-4xl"
          exit={{ opacity: 0, y: 10 }}
          initial={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
          style={{
            background: "linear-gradient(135deg, rgb(var(--org-primary-rgb)), rgb(var(--org-secondary-rgb)))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Welcome to Lumos AI ✦
        </motion.div>
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mt-1 text-lg text-muted-foreground md:text-2xl"
          exit={{ opacity: 0, y: 10 }}
          initial={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.6, type: "spring", stiffness: 100 }}
        >
          How can I help you today?
        </motion.div>
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 inline-block glass-pill rounded-full px-3 py-1 text-xs text-muted-foreground italic"
          exit={{ opacity: 0, y: 10 }}
          initial={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.7, type: "spring", stiffness: 100 }}
        >
          Guiding Conversations, Illuminating Insights
        </motion.div>
      </div>

      {copilots && copilots.length > 0 && onSelectCopilot && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.8 }}
        >
          <CopilotSelector
            copilots={copilots}
            selectedCopilotId={selectedCopilotId ?? null}
            onSelect={onSelectCopilot}
          />
        </motion.div>
      )}
    </div>
  );
};
