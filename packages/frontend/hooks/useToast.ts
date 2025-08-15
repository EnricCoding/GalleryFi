import { useState } from 'react';

export type Toast = {
  id: number;
  kind: 'info' | 'success' | 'error';
  msg: string;
  sticky?: boolean;
};

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = (t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const toast = { ...t, id };
    setToasts((p) => [...p, toast]);
    if (!t.sticky) {
      setTimeout(
        () => setToasts((p) => p.filter((x) => x.id !== id)),
        t.kind === 'error' ? 6000 : 3500,
      );
    }
  };

  const removeToast = (id: number) => setToasts((p) => p.filter((t) => t.id !== id));

  return { toasts, pushToast, removeToast };
}
    