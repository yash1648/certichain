import React, { useRef } from 'react';

/**
 * Tabs provides an accessible, responsive tab control with
 * smooth horizontal scrolling, count indicators, and keyboard navigation.
 */
export function Tabs({
  items = [],
  activeId,
  onChange,
  variant = 'segmented',
  ariaLabel = 'Navigation tabs',
  className = '',
}) {
  const tabListRef = useRef(null);

  const handleKeyDown = (e, index) => {
    const enabledItems = items.filter((item) => !item.disabled);
    const currentIndex = enabledItems.findIndex((item) => item.id === items[index].id);

    let nextIndex = null;
    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % enabledItems.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + enabledItems.length) % enabledItems.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = enabledItems.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const target = enabledItems[nextIndex];
      onChange(target.id);
      const buttons = tabListRef.current?.querySelectorAll('[role="tab"]:not([disabled])');
      buttons?.[nextIndex]?.focus();
    }
  };

  return (
    <div
      ref={tabListRef}
      className={`${variant} ${className}`.trim()}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item, index) => {
        const isActive = item.id === activeId;
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${item.id}`}
            id={`tab-${item.id}`}
            disabled={item.disabled}
            tabIndex={isActive ? 0 : -1}
            className={`${variant}__btn ${isActive ? 'is-active' : ''}`}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            {Icon && <Icon size={15} aria-hidden="true" />}
            <span>{item.label}</span>
            {item.count !== undefined && item.count !== null && (
              <span className="count-badge" aria-label={`${item.count} items`}>
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
