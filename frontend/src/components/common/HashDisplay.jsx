import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * HashDisplay displays a cryptographic hash, block number, transaction ID,
 * public key, or UUID with monospace formatting, truncation options,
 * and a 1-click copy button with visual feedback.
 */
export function HashDisplay({
  value,
  truncate = false,
  startLength = 10,
  endLength = 8,
  copyable = true,
  label = 'Copy identifier',
  className = '',
  monoClass = 'font-mono',
}) {
  const [copied, setCopied] = useState(false);

  if (!value) {
    return <span className="muted font-mono">N/A</span>;
  }

  const str = String(value);

  const displayValue =
    truncate && str.length > startLength + endLength + 3
      ? `${str.slice(0, startLength)}…${str.slice(-endLength)}`
      : str;

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(str);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is blocked
      const ta = document.createElement('textarea');
      ta.value = str;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <span className={`hash-display ${className}`.trim()} title={str}>
      <code className={`hash-display__code ${monoClass}`}>{displayValue}</code>
      {copyable && (
        <button
          type="button"
          onClick={handleCopy}
          className="hash-display__btn"
          aria-label={copied ? 'Copied to clipboard' : label}
          title={copied ? 'Copied!' : 'Copy to clipboard'}
        >
          {copied ? (
            <Check size={13} className="hash-display__check" aria-hidden="true" />
          ) : (
            <Copy size={13} aria-hidden="true" />
          )}
        </button>
      )}
    </span>
  );
}
