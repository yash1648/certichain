import React from 'react';

export function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'danger' | 'emerald' | 'purple'
  size = 'md',        // 'md' | 'sm'
  loading = false,
  disabled = false,
  icon: Icon,
  className = '',
  style = {},
  type = 'button',
  onClick,
  ...props
}) {
  const getVariantClass = () => {
    switch (variant) {
      case 'secondary':
      case 'outline':
        return 'btn-outline';
      case 'danger':
        return 'btn-danger';
      case 'emerald':
        return 'btn-emerald';
      case 'purple':
        return 'btn-purple';
      case 'primary':
      default:
        return 'btn-primary';
    }
  };

  const sizeClass = size === 'sm' ? 'btn-sm' : '';

  return (
    <button
      type={type}
      className={`btn ${getVariantClass()} ${sizeClass} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      style={style}
      {...props}
    >
      {loading ? (
        <span className="spinner" aria-hidden="true" />
      ) : (
        Icon && <Icon size={size === 'sm' ? 14 : 16} aria-hidden="true" />
      )}
      <span>{children}</span>
    </button>
  );
}
