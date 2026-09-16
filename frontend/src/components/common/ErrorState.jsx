import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '40px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--radius-md)',
      backgroundColor: 'rgba(244, 63, 94, 0.05)',
      border: '1px solid rgba(244, 63, 94, 0.25)',
      margin: '16px 0',
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        backgroundColor: 'rgba(244, 63, 94, 0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--rose-primary)',
        marginBottom: '14px',
      }}>
        <AlertCircle size={26} />
      </div>

      <h4 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
        {title}
      </h4>

      <p style={{ fontSize: '13px', color: '#fb7185', maxWidth: '460px', lineHeight: 1.5, marginBottom: onRetry ? '18px' : '0' }}>
        {message || 'An unexpected error occurred while communicating with the server.'}
      </p>

      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} icon={RefreshCw}>
          Try Again
        </Button>
      )}
    </div>
  );
}
