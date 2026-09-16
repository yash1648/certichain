import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';

export function StatusRow({
  status = 'success', // 'success' | 'error' | 'warning' | 'info'
  label,
  detail,
  monoDetail,
  extra,
}) {
  const getStatusConfig = () => {
    switch (status) {
      case 'error':
        return {
          icon: <XCircle size={18} color="var(--rose-primary)" />,
          color: 'var(--rose-primary)',
          bg: 'rgba(244, 63, 94, 0.08)',
          border: 'rgba(244, 63, 94, 0.25)',
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={18} color="var(--amber-primary)" />,
          color: 'var(--amber-primary)',
          bg: 'rgba(245, 158, 11, 0.08)',
          border: 'rgba(245, 158, 11, 0.25)',
        };
      case 'info':
        return {
          icon: <Info size={18} color="var(--cyan-primary)" />,
          color: 'var(--cyan-primary)',
          bg: 'rgba(0, 229, 255, 0.08)',
          border: 'rgba(0, 229, 255, 0.25)',
        };
      case 'success':
      default:
        return {
          icon: <CheckCircle2 size={18} color="var(--emerald-primary)" />,
          color: 'var(--emerald-primary)',
          bg: 'rgba(16, 185, 129, 0.08)',
          border: 'rgba(16, 185, 129, 0.25)',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '12px 14px',
      borderRadius: 'var(--radius-sm)',
      backgroundColor: config.bg,
      border: `1px solid ${config.border}`,
      marginBottom: '8px',
    }}>
      <div style={{ marginTop: '2px', flexShrink: 0 }}>
        {config.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {label}
          </span>
          {extra && <div>{extra}</div>}
        </div>

        {detail && (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
            {detail}
          </p>
        )}

        {monoDetail && (
          <div className="font-mono" style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            marginTop: '4px',
            padding: '4px 8px',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            userSelect: 'all',
          }}>
            {monoDetail}
          </div>
        )}
      </div>
    </div>
  );
}
