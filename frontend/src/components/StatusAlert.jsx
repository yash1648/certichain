import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const TONE = {
  success: { Icon: CheckCircle2, tone: 'ok' },
  error: { Icon: AlertCircle, tone: 'bad' },
  info: { Icon: Info, tone: 'info' },
};

export function StatusAlert() {
  const { lastActionStatus, clearStatus } = useAuth();

  useEffect(() => {
    if (!lastActionStatus) return undefined;
    const timer = setTimeout(clearStatus, 6000);
    return () => clearTimeout(timer);
  }, [lastActionStatus, clearStatus]);

  if (!lastActionStatus) return null;

  const { Icon, tone } = TONE[lastActionStatus.type] ?? TONE.info;

  return (
    <div className={`alert alert--${tone} status-flush`} role="status">
      <Icon size={17} className="alert__icon" aria-hidden="true" />
      <div className="alert__body">{lastActionStatus.message}</div>
      <button
        type="button"
        onClick={clearStatus}
        className="alert__dismiss"
        aria-label="Dismiss notification"
      >
        <X size={15} aria-hidden="true" />
      </button>
    </div>
  );
}
