import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}) {
  return (
    <div className="state state--error">
      <div className="state__icon">
        <AlertTriangle size={20} aria-hidden="true" />
      </div>
      <h2 className="state__title">{title}</h2>
      {message && <p className="state__text">{message}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} icon={RefreshCw}>
          Try again
        </Button>
      )}
    </div>
  );
}
