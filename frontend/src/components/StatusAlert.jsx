import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function StatusAlert() {
  const { lastActionStatus, clearStatus } = useAuth();

  useEffect(() => {
    if (!lastActionStatus) return;
    const timer = setTimeout(() => {
      clearStatus();
    }, 5000);
    return () => clearTimeout(timer);
  }, [lastActionStatus, clearStatus]);

  if (!lastActionStatus) return null;

  const isSuccess = lastActionStatus.type === 'success';
  const isError = lastActionStatus.type === 'error';

  const bgColor = isSuccess
    ? 'rgba(16, 185, 129, 0.12)'
    : isError
    ? 'rgba(244, 63, 94, 0.12)'
    : 'rgba(0, 229, 255, 0.1)';

  const borderColor = isSuccess
    ? 'var(--emerald-primary)'
    : isError
    ? 'var(--rose-primary)'
    : 'var(--cyan-primary)';

  const textColor = isSuccess
    ? 'var(--emerald-primary)'
    : isError
    ? 'var(--rose-primary)'
    : 'var(--cyan-primary)';

  const Icon = isSuccess ? CheckCircle2 : isError ? AlertCircle : Info;

  return (
    <div
      className="animate-fade-in"
      style={{
        margin: '0 auto 20px',
        maxWidth: '850px',
        padding: '12px 18px',
        borderRadius: 'var(--radius-md)',
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: `0 4px 20px -5px ${bgColor}`,
      }}
      role="alert"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Icon size={18} color={textColor} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: 500 }}>
          {lastActionStatus.message}
        </span>
      </div>
      <button
        onClick={clearStatus}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
          transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
        aria-label="Dismiss alert"
      >
        <X size={16} />
      </button>
    </div>
  );
}
