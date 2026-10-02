import React from 'react';

/**
 * Card provides a cohesive surface container with crisp borders,
 * optional structured header/footer, and elevation variants.
 */
export function Card({
  children,
  header,
  title,
  subtitle,
  actions,
  footer,
  flush = false,
  interactive = false,
  variant = 'default',
  className = '',
  onClick,
  ...props
}) {
  const classes = [
    'card',
    flush ? 'card--flush' : '',
    interactive ? 'card--interactive' : '',
    variant !== 'default' ? `card--${variant}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const hasHeader = header || title || subtitle || actions;

  return (
    <div
      className={classes}
      onClick={onClick}
      role={interactive && onClick ? 'button' : undefined}
      tabIndex={interactive && onClick ? 0 : undefined}
      onKeyDown={
        interactive && onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      {...props}
    >
      {hasHeader && (
        <div className="card__header">
          {header ? (
            header
          ) : (
            <>
              <div>
                {title && <h3 className="section-title" style={{ margin: 0 }}>{title}</h3>}
                {subtitle && <p className="section-note" style={{ margin: '4px 0 0' }}>{subtitle}</p>}
              </div>
              {actions && <div className="card__header-actions">{actions}</div>}
            </>
          )}
        </div>
      )}

      <div className={flush ? '' : 'card__body'}>{children}</div>

      {footer && <div className="card__footer">{footer}</div>}
    </div>
  );
}
