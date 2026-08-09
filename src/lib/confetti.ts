import confetti from 'canvas-confetti';

function isCanvasSupported(): boolean {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') return false;
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext && canvas.getContext('2d'));
  } catch {
    return false;
  }
}

export function triggerSuccessConfetti() {
  if (!isCanvasSupported()) return;
  try {
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B'],
    });
  } catch (err) {
    console.warn('Confetti error:', err);
  }
}

export function triggerGoalConfetti() {
  if (!isCanvasSupported()) return;
  try {
    const end = Date.now() + 1.2 * 1000;
    const colors = ['#10B981', '#6366F1', '#EC4899', '#F59E0B'];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  } catch (err) {
    console.warn('Goal confetti error:', err);
  }
}
