import React from 'react';
import { FolderOpen } from 'lucide-react';
import { Button } from './Button';

export function EmptyState({
  icon: Icon = FolderOpen,
  title = 'No items found',
  description = 'Get started by creating or adding a new record.',
  actionLabel,
  onAction,
  actionIcon,
  actionVariant = 'primary',
}) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '48px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '16px',
        backgroundColor: '#f8fafc',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        marginBottom: '16px',
      }}>
        <Icon size={28} />
      </div>

      <h4 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
        {title}
      </h4>

      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '420px', lineHeight: 1.5, marginBottom: actionLabel ? '20px' : '0' }}>
        {description}
      </p>

      {actionLabel && onAction && (
        <Button variant={actionVariant} onClick={onAction} icon={actionIcon}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
