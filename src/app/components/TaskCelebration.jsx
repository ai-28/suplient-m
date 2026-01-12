import React from 'react';
import { CheckCircle } from 'lucide-react';

export function TaskCelebration({ isVisible, onComplete }) {
  React.useEffect(() => {
    if (isVisible) {
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
      
      // Auto-hide after animation
      const timer = setTimeout(() => {
        onComplete();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="animate-scale-in">
        <div className="flex flex-col items-center space-y-2 bg-background/90 backdrop-blur-sm rounded-lg p-6 shadow-lg border">
          <CheckCircle className="w-16 h-16 text-green-500 animate-bounce" />
          <p className="text-lg font-semibold text-foreground">Task Completed!</p>
          <p className="text-sm text-muted-foreground">+10 XP</p>
        </div>
      </div>
    </div>
  );
}