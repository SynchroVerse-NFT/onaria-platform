import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useEffect, useMemo } from 'react';

interface AnimatedBackgroundProps {
  isDark: boolean;
}

export default function AnimatedBackground({ isDark }: AnimatedBackgroundProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring for parallax
  const parallaxX = useSpring(mouseX, { damping: 50, stiffness: 100 });
  const parallaxY = useSpring(mouseY, { damping: 50, stiffness: 100 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Map mouse position to -3px to +3px range
      const x = ((e.clientX / window.innerWidth) - 0.5) * 6;
      const y = ((e.clientY / window.innerHeight) - 0.5) * 6;
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [mouseX, mouseY]);

  // Generate stars once with useMemo to prevent regeneration
  const stars = useMemo(() => {
    return [...Array(100)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 2 + Math.random() * 3,
      delay: Math.random() * 2,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Nebula-like gradient orbs - inspired by space */}
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full"
        style={{
          background: isDark
            ? 'radial-gradient(circle, rgba(100, 181, 246, 0.15) 0%, rgba(168, 85, 247, 0.1) 50%, transparent 70%)'
            : 'radial-gradient(circle, rgba(100, 181, 246, 0.25) 0%, rgba(168, 85, 247, 0.15) 50%, transparent 70%)',
          filter: 'blur(80px)',
          willChange: 'transform',
        }}
        animate={{
          x: ['-30%', '30%', '-30%'],
          y: ['-30%', '20%', '-30%'],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
          repeatType: 'loop',
        }}
        initial={{ x: '-30%', y: '-30%', scale: 1 }}
      />

      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full right-0"
        style={{
          background: isDark
            ? 'radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, rgba(255, 87, 34, 0.08) 50%, transparent 70%)'
            : 'radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, rgba(255, 87, 34, 0.12) 50%, transparent 70%)',
          filter: 'blur(80px)',
          willChange: 'transform',
        }}
        animate={{
          x: ['30%', '-20%', '30%'],
          y: ['30%', '-20%', '30%'],
          scale: [1, 1.4, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: 'easeInOut',
          repeatType: 'loop',
        }}
        initial={{ x: '30%', y: '30%', scale: 1 }}
      />

      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full bottom-0 left-1/2"
        style={{
          background: isDark
            ? 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, rgba(100, 181, 246, 0.05) 50%, transparent 70%)'
            : 'radial-gradient(circle, rgba(59, 130, 246, 0.18) 0%, rgba(100, 181, 246, 0.1) 50%, transparent 70%)',
          filter: 'blur(70px)',
          willChange: 'transform',
        }}
        animate={{
          x: ['-50%', '-35%', '-50%'],
          y: ['50%', '35%', '50%'],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'easeInOut',
          repeatType: 'loop',
        }}
        initial={{ x: '-50%', y: '50%', scale: 1 }}
      />

      {/* Star field with twinkling and parallax */}
      <motion.div
        className="absolute inset-0"
        style={{
          x: parallaxX,
          y: parallaxY,
          willChange: 'transform',
        }}
      >
        {stars.map((star) => (
          <motion.div
            key={star.id}
            className={`absolute w-0.5 h-0.5 rounded-full ${isDark ? 'bg-white' : 'bg-blue-400'}`}
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              willChange: 'opacity, transform',
            }}
            animate={{
              opacity: [0.2, 1, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: star.duration,
              repeat: Infinity,
              delay: star.delay,
              ease: 'easeInOut',
              repeatType: 'loop',
            }}
            initial={{ opacity: 0.2, scale: 1 }}
          />
        ))}
      </motion.div>

      {/* Grid overlay with warping - space-time fabric */}
      <motion.div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(100, 181, 246, 0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(100, 181, 246, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          perspective: '1000px',
          willChange: 'background-position',
        }}
        animate={{
          backgroundPosition: ['0px 0px', '60px 60px', '0px 0px'],
        }}
        transition={{
          duration: 60,
          repeat: Infinity,
          ease: 'linear',
          repeatType: 'loop',
        }}
        initial={{ backgroundPosition: '0px 0px' }}
      />

      {/* Vignette effect */}
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? 'radial-gradient(circle at center, transparent 0%, rgba(10, 10, 15, 0.6) 100%)'
            : 'radial-gradient(circle at center, transparent 0%, rgba(200, 210, 255, 0.3) 100%)',
        }}
      />
    </div>
  );
}
