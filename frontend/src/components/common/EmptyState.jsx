import React from 'react';
import { FolderOpen } from 'lucide-react';
import { Button } from './Button';

export function EmptyState({
  icon: Icon = FolderOpen,
  title = 'Nothing here yet',
  description,
  actionLabel,
  onAction,
  actionIcon,
  actionVariant = 'secondary',
}) {
  return (
    <div className="state">
      <div className="state__icon">
        <Icon size={20} aria-hidden="true" />
      </div>
      <h2 className="state__title">{title}</h2>
      {description && <p className="state__text">{description}</p>}
      {actionLabel && onAction && (
        <Button variant={actionVariant} onClick={onAction} icon={actionIcon}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
