import { motion } from 'framer-motion';
import { memo } from 'react';

interface WormholeEffectProps {
  isFocused: boolean;
}

const WormholeEffect = memo(function WormholeEffect({ isFocused }: WormholeEffectProps) {
  // Temporarily disable animations
  const shouldAnimate = false;

  if (!shouldAnimate) {
    return null;
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
      {/* Concentric rings creating the wormhole tunnel effect */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 100 + i * 80,
            height: 100 + i * 80,
            border: `1px solid rgba(100, 181, 246, ${0.1 - i * 0.004})`,
            transformStyle: 'preserve-3d',
            willChange: 'transform, opacity',
          }}
          animate={{
            scale: isFocused ? [1, 0.5, 1] : 1,
            rotateX: [0, 360],
            opacity: isFocused ? [0.1 - i * 0.004, 0.3, 0.1 - i * 0.004] : 0.1 - i * 0.004,
            z: i * -50,
          }}
          transition={{
            scale: {
              duration: 3,
              repeat: Infinity,
              delay: i * 0.05,
              ease: 'easeInOut',
              repeatType: 'loop',
            },
            rotateX: {
              duration: 20 + i * 2,
              repeat: Infinity,
              ease: 'linear',
              repeatType: 'loop',
            },
            opacity: {
              duration: 3,
              repeat: Infinity,
              delay: i * 0.05,
              repeatType: 'loop',
            },
          }}
          initial={{ scale: 1, rotateX: 0, opacity: 0.1 - i * 0.004 }}
        />
      ))}

      {/* Spiral arms like in the wormhole */}
      {[0, 1, 2, 3].map((arm) => (
        <motion.div
          key={`arm-${arm}`}
          className="absolute w-[800px] h-[800px]"
          style={{
            transformOrigin: 'center center',
            willChange: 'transform',
          }}
          animate={{
            rotate: [arm * 90, arm * 90 + 360],
            scale: isFocused ? [1, 1.3, 1] : 1,
          }}
          transition={{
            rotate: {
              duration: 15,
              repeat: Infinity,
              ease: 'linear',
              repeatType: 'loop',
            },
            scale: {
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
              repeatType: 'loop',
            },
          }}
          initial={{ rotate: arm * 90, scale: 1 }}
        >
          <div
            className="absolute left-1/2 top-0 w-[2px] h-full -ml-[1px]"
            style={{
              background: `linear-gradient(to bottom, transparent, rgba(100, 181, 246, 0.3), transparent)`,
            }}
          />
        </motion.div>
      ))}

      {/* Time dilation grid - warping effect */}
      <motion.div
        className="absolute w-[2400px] h-[2400px] left-1/2 top-1/2"
        style={{
          marginLeft: '-1200px',
          marginTop: '-1200px',
          backgroundImage: `
            radial-gradient(circle at center, transparent 0%, rgba(100, 181, 246, 0.02) 50%, transparent 100%),
            repeating-conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(168, 85, 247, 0.05) 2deg, transparent 4deg)
          `,
          willChange: 'transform',
        }}
        animate={{
          rotate: [0, 360],
          scale: isFocused ? [1, 1.2, 1] : 1,
        }}
        transition={{
          rotate: {
            duration: 60,
            repeat: Infinity,
            ease: 'linear',
            repeatType: 'loop',
          },
          scale: {
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
            repeatType: 'loop',
          },
        }}
        initial={{ rotate: 0, scale: 1 }}
      />

      {/* Accretion disk particles */}
      {[...Array(30)].map((_, i) => {
        const angle = (i / 30) * Math.PI * 2;
        const radius = 250 + (i % 5) * 50;
        
        return (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: `radial-gradient(circle, rgba(100, 181, 246, 0.8), rgba(168, 85, 247, 0.4))`,
              filter: 'blur(1px)',
              willChange: 'transform, opacity',
            }}
            animate={{
              x: [
                Math.cos(angle) * radius,
                Math.cos(angle + Math.PI * 2) * radius,
              ],
              y: [
                Math.sin(angle) * radius * 0.3,
                Math.sin(angle + Math.PI * 2) * radius * 0.3,
              ],
              scale: [0.5, 1, 0.5],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 8 + (i % 3) * 2,
              repeat: Infinity,
              ease: 'linear',
              delay: i * 0.1,
              repeatType: 'loop',
            }}
            initial={{
              x: Math.cos(angle) * radius,
              y: Math.sin(angle) * radius * 0.3,
              scale: 0.5,
              opacity: 0.3,
            }}
          />
        );
      })}

      {/* Gravitational lensing effect */}
      <motion.div
        className="absolute w-[1200px] h-[1200px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(100, 181, 246, 0.1) 0%, transparent 40%, rgba(168, 85, 247, 0.1) 70%, transparent 100%)',
          filter: 'blur(60px)',
          willChange: 'transform',
        }}
        animate={{
          scale: isFocused ? [1, 1.2, 1] : [1, 1.1, 1],
        }}
        transition={{
          scale: {
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
            repeatType: 'loop',
          },
        }}
        initial={{ scale: 1 }}
      />
    </div>
  );
});

export default WormholeEffect;
