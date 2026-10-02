import React from 'react';

/**
 * StatCard displays high-level metrics with precision styling,
 * optional status indicator bar, and subtle cryptographic badge.
 */
export function StatCard({
  label,
  value,
  sub,
  tone = 'neutral',
  icon: Icon,
  monoValue = false,
  className = '',
  action,
}) {
  return (
    <div className={`stat-card stat-card--${tone} ${className}`.trim()}>
      <div className="stat-card__top">
        <span className="stat-card__label">{label}</span>
        {Icon && <Icon size={16} className="stat-card__icon" aria-hidden="true" />}
      </div>
      <div className={`stat-card__value ${monoValue ? 'font-mono' : ''}`}>
        {value}
      </div>
      {sub && <div className="stat-card__sub">{sub}</div>}
      {action && <div className="stat-card__action">{action}</div>}
    </div>
  );
}
