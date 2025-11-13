import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

export type AnimationIntensity = 'off' | 'low' | 'medium' | 'high';

interface AnimationSettings {
  enabled: boolean;
  intensity: AnimationIntensity;
  respectReducedMotion: boolean;
}

interface AnimationContextValue extends AnimationSettings {
  setEnabled: (enabled: boolean) => void;
  setIntensity: (intensity: AnimationIntensity) => void;
  setRespectReducedMotion: (respect: boolean) => void;
  shouldAnimate: boolean;
}

const AnimationContext = createContext<AnimationContextValue | undefined>(undefined);

export function useAnimations() {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimations must be used within AnimationWrapper');
  }
  return context;
}

interface AnimationWrapperProps {
  children: ReactNode;
  defaultEnabled?: boolean;
  defaultIntensity?: AnimationIntensity;
  respectReducedMotion?: boolean;
}

export default function AnimationWrapper({
  children,
  defaultEnabled = true,
  defaultIntensity = 'medium',
  respectReducedMotion = true,
}: AnimationWrapperProps) {
  const [enabled, setEnabled] = useState(defaultEnabled);
  const [intensity, setIntensity] = useState<AnimationIntensity>(defaultIntensity);
  const [respectReducedMotionPref, setRespectReducedMotion] = useState(respectReducedMotion);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const shouldAnimate = enabled && intensity !== 'off' && !(respectReducedMotionPref && prefersReducedMotion);

  const contextValue: AnimationContextValue = {
    enabled,
    intensity,
    respectReducedMotion: respectReducedMotionPref,
    setEnabled,
    setIntensity,
    setRespectReducedMotion,
    shouldAnimate,
  };

  return (
    <AnimationContext.Provider value={contextValue}>
      {children}
    </AnimationContext.Provider>
  );
}

export function getIntensityMultiplier(intensity: AnimationIntensity): number {
  switch (intensity) {
    case 'off':
      return 0;
    case 'low':
      return 0.5;
    case 'medium':
      return 1;
    case 'high':
      return 1.5;
    default:
      return 1;
  }
}

export function getParticleCount(baseCount: number, intensity: AnimationIntensity): number {
  const multiplier = getIntensityMultiplier(intensity);
  return Math.round(baseCount * multiplier);
}
