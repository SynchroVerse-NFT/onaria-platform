import { lazy, Suspense } from 'react';

const FloatingParticles = lazy(() => import('./FloatingParticles'));
const CursorAurora = lazy(() => import('./CursorAurora'));
const InterstellarRings = lazy(() => import('./InterstellarRings'));
const WormholeEffect = lazy(() => import('./WormholeEffect'));
const AnimatedBackground = lazy(() => import('./AnimatedBackground'));

interface AnimationFallbackProps {
  className?: string;
}

function AnimationFallback({ className }: AnimationFallbackProps) {
  return <div className={className} aria-hidden="true" />;
}

export function LazyFloatingParticles() {
  return (
    <Suspense fallback={<AnimationFallback className="absolute inset-0 overflow-hidden pointer-events-none" />}>
      <FloatingParticles />
    </Suspense>
  );
}

export function LazyCursorAurora() {
  return (
    <Suspense fallback={<AnimationFallback className="absolute inset-0 overflow-hidden pointer-events-none" />}>
      <CursorAurora />
    </Suspense>
  );
}

export function LazyInterstellarRings() {
  return (
    <Suspense fallback={<AnimationFallback className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center" />}>
      <InterstellarRings />
    </Suspense>
  );
}

interface LazyWormholeEffectProps {
  isFocused: boolean;
}

export function LazyWormholeEffect({ isFocused }: LazyWormholeEffectProps) {
  return (
    <Suspense fallback={<AnimationFallback className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center" />}>
      <WormholeEffect isFocused={isFocused} />
    </Suspense>
  );
}

interface LazyAnimatedBackgroundProps {
  isDark: boolean;
}

export function LazyAnimatedBackground({ isDark }: LazyAnimatedBackgroundProps) {
  return (
    <Suspense fallback={<AnimationFallback className="absolute inset-0 overflow-hidden" />}>
      <AnimatedBackground isDark={isDark} />
    </Suspense>
  );
}
