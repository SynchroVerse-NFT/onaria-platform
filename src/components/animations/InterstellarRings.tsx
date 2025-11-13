import { motion } from 'framer-motion';
import { memo } from 'react';

const InterstellarRings = memo(function InterstellarRings() {
  // Temporarily disable animations
  const shouldAnimate = false;

  if (!shouldAnimate) {
    return null;
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
      {/* Main orbital rings - inspired by the wormhole and Endurance spacecraft */}
      {[1, 2, 3, 4].map((ring) => (
        <motion.div
          key={ring}
          className="absolute rounded-full border border-white/5"
          style={{
            width: 200 + ring * 150,
            height: 200 + ring * 150,
            transformStyle: 'preserve-3d',
            willChange: 'transform',
          }}
          animate={{
            rotateX: [0, 360],
            rotateY: [0, 180],
            rotateZ: [0, 360],
          }}
          transition={{
            duration: 30 + ring * 10,
            repeat: Infinity,
            ease: 'linear',
            repeatType: 'loop',
          }}
          initial={{ rotateX: 0, rotateY: 0, rotateZ: 0 }}
        >
          {/* Dots on the rings */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-blue-400/40"
              style={{
                left: '50%',
                top: '50%',
                transformOrigin: '0 0',
              }}
              animate={{
                rotate: (360 / 12) * i,
                x: (100 + ring * 75),
              }}
            >
              <motion.div
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.1,
                  repeatType: 'loop',
                }}
                initial={{ scale: 1, opacity: 0.4 }}
                className="w-full h-full bg-blue-400 rounded-full"
                style={{ willChange: 'transform, opacity' }}
              />
            </motion.div>
          ))}
        </motion.div>
      ))}

      {/* Tesseract-inspired 3D cube */}
      <motion.div
        className="absolute"
        style={{
          transformStyle: 'preserve-3d',
          perspective: '1000px',
          willChange: 'transform',
        }}
        animate={{
          rotateX: [0, 360],
          rotateY: [0, 360],
          rotateZ: [0, 360],
        }}
        transition={{
          duration: 60,
          repeat: Infinity,
          ease: 'linear',
          repeatType: 'loop',
        }}
        initial={{ rotateX: 0, rotateY: 0, rotateZ: 0 }}
      >
        {/* Outer cube */}
        {['front', 'back', 'left', 'right', 'top', 'bottom'].map((face) => {
          const transforms = {
            front: 'translateZ(100px)',
            back: 'translateZ(-100px) rotateY(180deg)',
            left: 'translateX(-100px) rotateY(-90deg)',
            right: 'translateX(100px) rotateY(90deg)',
            top: 'translateY(-100px) rotateX(90deg)',
            bottom: 'translateY(100px) rotateX(-90deg)',
          };

          return (
            <motion.div
              key={face}
              className="absolute w-[200px] h-[200px] border border-purple-500/10"
              style={{
                transform: transforms[face as keyof typeof transforms],
                transformStyle: 'preserve-3d',
              }}
              animate={{
                borderColor: [
                  'rgba(168, 85, 247, 0.1)',
                  'rgba(100, 181, 246, 0.3)',
                  'rgba(168, 85, 247, 0.1)',
                ],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
                repeatType: 'loop',
              }}
              initial={{ borderColor: 'rgba(168, 85, 247, 0.1)' }}
            />
          );
        })}

        {/* Inner cube (tesseract effect) */}
        {['front', 'back', 'left', 'right', 'top', 'bottom'].map((face) => {
          const transforms = {
            front: 'translateZ(50px)',
            back: 'translateZ(-50px) rotateY(180deg)',
            left: 'translateX(-50px) rotateY(-90deg)',
            right: 'translateX(50px) rotateY(90deg)',
            top: 'translateY(-50px) rotateX(90deg)',
            bottom: 'translateY(50px) rotateX(-90deg)',
          };

          return (
            <motion.div
              key={`inner-${face}`}
              className="absolute w-[100px] h-[100px] border border-blue-400/20"
              style={{
                transform: transforms[face as keyof typeof transforms],
                transformStyle: 'preserve-3d',
                left: '50px',
                top: '50px',
              }}
              animate={{
                borderColor: [
                  'rgba(100, 181, 246, 0.2)',
                  'rgba(168, 85, 247, 0.4)',
                  'rgba(100, 181, 246, 0.2)',
                ],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 2,
                repeatType: 'loop',
              }}
              initial={{ borderColor: 'rgba(100, 181, 246, 0.2)' }}
            />
          );
        })}
      </motion.div>

      {/* Event horizon effect */}
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle, transparent 30%, rgba(100, 181, 246, 0.05) 50%, transparent 70%)',
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
        animate={{
          scale: [1, 1.2, 1],
          rotateZ: [0, 360],
        }}
        transition={{
          scale: {
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
            repeatType: 'loop',
          },
          rotateZ: {
            duration: 40,
            repeat: Infinity,
            ease: 'linear',
            repeatType: 'loop',
          },
        }}
        initial={{ scale: 1, rotateZ: 0 }}
      />
    </div>
  );
});

export default InterstellarRings;
