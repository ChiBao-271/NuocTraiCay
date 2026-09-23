'use client';

import { useCallback, useState } from 'react';

let nextId = 1;

/**
 * Hook to manage toast notifications.
 * Returns { toasts, addToast, removeToast }
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(
    ({ message, type = 'success', duration = 3500 }) => {
      const id = nextId;
      nextId += 1;
      setToasts((current) => [...current, { id, message, type, duration }]);
      return id;
    },
    [],
  );

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}
