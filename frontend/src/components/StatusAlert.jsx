import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function StatusAlert() {
  const { lastActionStatus, clearStatus } = useAuth();

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
    ? '#34d399'
    : isError
    ? '#fb7185'
    : 'var(--cyan-primary)';

  const Icon = isSuccess ? CheckCircle2 : isError ? AlertCircle : Info;

  return (
    <div
      className="animate-fade-in"
      style={{
        margin: '16px auto',
        maxWidth: '850px',
        padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: `0 4px 20px -5px ${bgColor}`
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Icon size={18} color={textColor} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.875rem', color: '#f8fafc', fontWeight: 500 }}>
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
          borderRadius: '4px'
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
