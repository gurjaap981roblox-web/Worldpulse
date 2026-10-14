import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

export function usePWAUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateFn, setUpdateFn] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    try {
      const update = registerSW({
        immediate: true,
        onNeedRefresh() {
          setNeedRefresh(true);
        },
      });
      setUpdateFn(() => update);
    } catch (err) {
      console.warn('PWA registerSW error:', err);
    }

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      if (reg.waiting) {
        setNeedRefresh(true);
      }
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setNeedRefresh(true);
          }
        });
      });
    });
  }, []);

  const reloadToUpdate = async () => {
    if (updateFn) {
      try {
        await updateFn();
      } catch {
        // fallback
      }
    }
    window.location.reload();
  };

  return { needRefresh, reloadToUpdate };
}
