import { motion } from 'framer-motion';

export default function FloatingParticles() {
  // Generate cosmic dust particles - useMemo to prevent regeneration on re-render
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 15 + 25,
    delay: Math.random() * 5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Cosmic dust particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            background: `radial-gradient(circle, rgba(100, 181, 246, 0.6), rgba(168, 85, 247, 0.3))`,
            filter: 'blur(1px)',
            boxShadow: '0 0 4px rgba(100, 181, 246, 0.5)',
            willChange: 'transform, opacity',
          }}
          animate={{
            y: [0, -150, 0],
            x: [0, Math.sin(particle.id) * 60, 0],
            opacity: [0, 0.8, 0],
            scale: [0, 1.2, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: 'easeInOut',
            repeatType: 'loop',
          }}
          initial={{ y: 0, x: 0, opacity: 0, scale: 0 }}
        />
      ))}

      {/* Orbital debris - larger floating elements */}
      {[1, 2, 3, 4].map((i) => (
        <motion.div
          key={`orbit-${i}`}
          className="absolute rounded-full border border-blue-400/10"
          style={{
            width: 120 + i * 60,
            height: 120 + i * 60,
            left: `${i * 25}%`,
            top: `${i * 22}%`,
            transformStyle: 'preserve-3d',
            willChange: 'transform, border-color',
          }}
          animate={{
            rotate: i % 2 === 0 ? [0, 360] : [0, -360],
            scale: [1, 1.15, 1],
            borderColor: [
              'rgba(100, 181, 246, 0.1)',
              'rgba(168, 85, 247, 0.2)',
              'rgba(100, 181, 246, 0.1)',
            ],
          }}
          transition={{
            rotate: {
              duration: 35 + i * 15,
              repeat: Infinity,
              ease: 'linear',
              repeatType: 'loop',
            },
            scale: {
              duration: 18 + i * 6,
              repeat: Infinity,
              ease: 'easeInOut',
              repeatType: 'loop',
            },
            borderColor: {
              duration: 10,
              repeat: Infinity,
              ease: 'easeInOut',
              repeatType: 'loop',
            },
          }}
          initial={{
            rotate: 0,
            scale: 1,
            borderColor: 'rgba(100, 181, 246, 0.1)'
          }}
        />
      ))}

      {/* Meteor streaks */}
      {[...Array(5)].map((_, i) => {
        const width = 100 + Math.random() * 100;
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        const rotation = -45 + Math.random() * 20;

        return (
          <motion.div
            key={`meteor-${i}`}
            className="absolute h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent"
            style={{
              width,
              left: `${left}%`,
              top: `${top}%`,
              rotate: `${rotation}deg`,
              willChange: 'transform, opacity',
            }}
            animate={{
              x: [0, 300],
              y: [0, 200],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 2,
              delay: i * 8,
              repeat: Infinity,
              ease: 'easeOut',
              repeatType: 'loop',
            }}
            initial={{ x: 0, y: 0, opacity: 0 }}
          />
        );
      })}
    </div>
  );
}
