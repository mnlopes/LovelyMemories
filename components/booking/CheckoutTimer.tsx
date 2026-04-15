'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from "next-intl";
import { useRouter } from '@/i18n/routing';

interface CheckoutTimerProps {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  slug: string;
}

export default function CheckoutTimer({ propertyId, checkIn, checkOut, sessionId, slug }: CheckoutTimerProps) {
  const t = useTranslations("Checkout.timer");
  const router = useRouter();
  const INITIAL_SECONDS = 15 * 60; // 15 minutes
  const [timeLeft, setTimeLeft] = useState(INITIAL_SECONDS);
  const [hasExtended, setHasExtended] = useState(false);
  const [isExpiring, setIsExpiring] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showExtension, setShowExtension] = useState(false);
  const [isDead, setIsDead] = useState(false);

  // Formatting minutes and seconds
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Extension handler
  const handleExtend = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch('/api/bookings/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          checkIn,
          checkOut,
          sessionId,
          extend: true
        })
      });

      if (res.ok) {
        setTimeLeft(INITIAL_SECONDS);
        setHasExtended(true);
        setShowExtension(false);
        toast.success(t('extendSuccess'));
      } else if (res.status === 403) {
        setHasExtended(true);
        setShowExtension(false);
        toast.error(t('alreadyExtended'));
      } else if (res.status === 409) {
        toast.error(useTranslations("Checkout")('errorTemporarilyLocked'));
      } else {
        toast.error(t('extendError'));
      }
    } catch (err) {
      toast.error(t('connError'));
    } finally {
      setIsUpdating(false);
    }
  };

  // Countdown logic
  useEffect(() => {
    if (isDead) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsDead(true);
          return 0;
        }

        // Show extension button at 3 minutes remaining, but only if not already extended (181s to trigger slightly before 3:00)
        if (prev <= 181 && !hasExtended) {
          setShowExtension(true);
        }

        // Visual warning at 3 minutes (180s)
        if (prev <= 180) {
          setIsExpiring(true);
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isDead, hasExtended]);

  // Handle expiration (wait 5s then reload)
  useEffect(() => {
    if (isDead) {
      const timeout = setTimeout(() => {
        router.push(`/properties/${slug}`);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [isDead]);

  return (
    <div className="mb-4">
      <AnimatePresence mode="wait">
        {!isDead ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`
              relative overflow-hidden
              flex flex-col items-center justify-between gap-3
              p-3 px-4 rounded-2xl border transition-colors duration-300
              ${isExpiring 
                ? 'bg-rose-50/50 border-rose-200 text-rose-700 shadow-sm shadow-rose-100' 
                : 'bg-stone-50/80 border-stone-200 text-stone-600'}
            `}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${isExpiring ? 'bg-rose-100' : 'bg-stone-200/50'}`}>
                  <Clock className={`w-4 h-4 ${isExpiring ? 'animate-pulse' : ''}`} />
                </div>
                <span className="text-xs font-medium uppercase tracking-wider">
                  {t('reserved')}
                </span>
              </div>
              
              <div className="font-mono text-lg font-bold tabular-nums">
                {formatTime(timeLeft)}
              </div>
            </div>

            {showExtension && !isUpdating && (
              <motion.button
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                onClick={handleExtend}
                className="
                  flex items-center justify-center gap-2
                  w-full py-2 px-4 rounded-xl
                  bg-stone-900 text-white text-sm font-medium
                  hover:bg-stone-800 transition-all active:scale-[0.98]
                "
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t('needMoreTime')}
              </motion.button>
            )}

            {isUpdating && (
              <div className="text-[10px] text-stone-400 animate-pulse uppercase tracking-widest pt-1">
                {t('updating')}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center p-6 bg-stone-900 text-white rounded-2xl border border-stone-800 shadow-xl"
          >
            <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
            <h3 className="font-bold text-lg">{t('expiredTitle')}</h3>
            <p className="text-stone-400 text-sm text-center mt-1 whitespace-pre-line">
              {t('expiredText')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
