import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

const THINKING_PHRASES = [
  'Thinking',
  'Ideating',
  'Planning',
  'Designing',
  'Crafting',
  'Architecting',
  'Conceptualizing',
  'Envisioning',
  'Strategizing',
  'Formulating',
  'Contemplating',
  'Analyzing',
  'Brainstorming',
  'Sketching',
  'Exploring',
  'Imagining',
  'Structuring',
  'Orchestrating',
  'Composing',
  'Refining',
];

interface ThinkingIndicatorProps {
  visible: boolean;
}

export function ThinkingIndicator({ visible }: ThinkingIndicatorProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!visible) {
      setPhraseIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % THINKING_PHRASES.length);
    }, 2000); // Change phrase every 2 seconds

    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.95 }}
          transition={{
            duration: prefersReducedMotion ? 0.1 : 0.4,
            ease: [0.23, 1, 0.32, 1]
          }}
          className="flex items-center gap-2 mt-3"
        >
          <motion.div
            animate={prefersReducedMotion ? {} : {
              rotate: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{
              rotate: { duration: 3, repeat: prefersReducedMotion ? 0 : Infinity, ease: "linear" },
              scale: { duration: 2, repeat: prefersReducedMotion ? 0 : Infinity, ease: "easeInOut" }
            }}
          >
            <Sparkles className="size-3 text-cosmic-purple" />
          </motion.div>
          <AnimatePresence mode="wait">
            <motion.span
              key={phraseIndex}
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: 10 }}
              transition={{
                duration: prefersReducedMotion ? 0.1 : 0.3,
                ease: [0.23, 1, 0.32, 1]
              }}
              className="text-sm text-text-50/60 font-medium flex items-center gap-1"
            >
              {THINKING_PHRASES[phraseIndex]}...
              <motion.span
                animate={prefersReducedMotion ? {} : { opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: prefersReducedMotion ? 0 : Infinity }}
                className="inline-block"
              >
                ...
              </motion.span>
            </motion.span>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}