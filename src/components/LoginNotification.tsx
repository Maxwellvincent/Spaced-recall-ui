import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useLoginStreak } from '@/hooks/useLoginStreak';

export function LoginNotification() {
  const { user } = useAuth();
  const { streak } = useLoginStreak();
  const [showNotification, setShowNotification] = useState(false);
  
  useEffect(() => {
    if (!user || streak <= 0) return;
    
    // Show notification after a short delay
    const showTimer = setTimeout(() => {
      setShowNotification(true);
      console.log("LoginNotification: Showing notification for streak:", streak);
    }, 1000);
    
    // Auto-hide notification after 5 seconds
    const hideTimer = setTimeout(() => {
      setShowNotification(false);
      console.log("LoginNotification: Hiding notification");
    }, 6000);
    
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [user, streak]);
  
  return (
    <AnimatePresence>
      {showNotification && (
        <motion.div
          className="fixed bottom-4 right-4 bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-4 max-w-sm"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          <button 
            className="absolute top-2 right-2 text-slate-400 hover:text-white"
            onClick={() => setShowNotification(false)}
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/20 p-2 rounded-full">
              <Flame className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium text-white">Welcome back!</h3>
              <p className="text-sm text-slate-300">
                {streak === 1 ? (
                  "You've started a login streak!"
                ) : (
                  `You're on a ${streak} day login streak!`
                )}
              </p>
            </div>
          </div>
          
          {streak >= 3 && (
            <div className="mt-2 pt-2 border-t border-slate-700 text-xs text-slate-400">
              Keep logging in daily to earn XP and token rewards!
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
} 