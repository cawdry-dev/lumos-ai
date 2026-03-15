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
          className="font-semibold text-xl md:text-2xl"
          exit={{ opacity: 0, y: 10 }}
          initial={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.5 }}
        >
          Welcome to Lumos ✦
        </motion.div>
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="text-xl text-zinc-500 md:text-2xl"
          exit={{ opacity: 0, y: 10 }}
          initial={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.6 }}
        >
          How can I help you today?
        </motion.div>
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-zinc-400 italic"
          exit={{ opacity: 0, y: 10 }}
          initial={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.7 }}
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
