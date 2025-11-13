import { motion, useMotionValue, useSpring } from 'framer-motion';
import { memo, useCallback, useEffect, useMemo } from 'react';

const CursorAurora = memo(function CursorAurora() {
  // Temporarily disable animations
  const shouldAnimate = false;
  const cursorX = useMotionValue(typeof window !== 'undefined' ? window.innerWidth / 2 : 0);
  const cursorY = useMotionValue(typeof window !== 'undefined' ? window.innerHeight / 2 : 0);

  const springConfig = useMemo(() => ({ damping: 30, stiffness: 200, mass: 0.5 }), []);
  const x = useSpring(cursorX, springConfig);
  const y = useSpring(cursorY, springConfig);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    cursorX.set(e.clientX);
    cursorY.set(e.clientY);
  }, [cursorX, cursorY]);

  useEffect(() => {
    if (!shouldAnimate) return;

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseMove, shouldAnimate]);

  if (!shouldAnimate) {
    return null;
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Main aurora spotlight */}
      <motion.div
        className="absolute w-[600px] h-[600px] -ml-[300px] -mt-[300px] rounded-full"
        style={{
          left: x,
          top: y,
          background: 'radial-gradient(circle, rgba(100, 181, 246, 0.15) 0%, rgba(168, 85, 247, 0.1) 30%, transparent 70%)',
          filter: 'blur(60px)',
          willChange: 'transform',
        }}
      />

      {/* Secondary softer glow */}
      <motion.div
        className="absolute w-[800px] h-[800px] -ml-[400px] -mt-[400px] rounded-full"
        style={{
          left: x,
          top: y,
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, rgba(59, 130, 246, 0.05) 40%, transparent 70%)',
          filter: 'blur(80px)',
          willChange: 'transform',
        }}
      />

      {/* Subtle highlight core */}
      <motion.div
        className="absolute w-[300px] h-[300px] -ml-[150px] -mt-[150px] rounded-full"
        style={{
          left: x,
          top: y,
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.03) 0%, transparent 60%)',
          filter: 'blur(40px)',
          willChange: 'transform',
        }}
      />
    </div>
  );
});

export default CursorAurora;
