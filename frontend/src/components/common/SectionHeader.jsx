import React from 'react';

/**
 * SectionHeader provides consistent typographic hierarchy,
 * optional eyebrow, description, and action button alignment.
 */
export function SectionHeader({
  title,
  eyebrow,
  description,
  badge,
  actions,
  className = '',
}) {
  return (
    <div className={`section-header ${className}`.trim()}>
      <div className="section-header__content">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <div className="section-header__title-row">
          <h2 className="section-title">{title}</h2>
          {badge}
        </div>
        {description && <p className="section-header__sub">{description}</p>}
      </div>
      {actions && <div className="section-header__actions">{actions}</div>}
    </div>
  );
}
