'use client';

import { useEffect, useState } from 'react';

/**
 * Toast notification component for success/error messages
 * Usage: <Toast message="..." type="success|error|info" onClose={() => {}} />
 */
export function Toast({ message, type = 'success', onClose, duration = 3500 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const showTimer = window.setTimeout(() => setVisible(true), 10);

    // Auto-dismiss
    const hideTimer = window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(onClose, 350);
    }, duration);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [duration, onClose]);

  const icons = {
    success: '✅',
    error: '❌',
    info: '💡',
    cart: '🛒',
  };

  return (
    <div
      className={`toast toast-${type} ${visible ? 'toast-visible' : ''}`}
      role="alert"
      aria-live="polite"
    >
      <span className="toast-icon">{icons[type] ?? icons.info}</span>
      <span className="toast-message">{message}</span>
      <button
        className="toast-close"
        type="button"
        onClick={() => {
          setVisible(false);
          window.setTimeout(onClose, 350);
        }}
        aria-label="Đóng thông báo"
      >
        ×
      </button>
    </div>
  );
}

/**
 * Toast container – renders a list of active toasts
 */
export function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="toast-container" aria-label="Thông báo">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
}
