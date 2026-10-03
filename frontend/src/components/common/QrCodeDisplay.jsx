import React, { useState, useEffect } from 'react';
import { Download, Copy, Check, QrCode as QrIcon } from 'lucide-react';
import { generateQrDataUrl } from '../../utils/qrUtils';
import { Button } from './Button';

export function QrCodeDisplay({
  value,
  size = 220,
  title,
  subtitle,
  showActions = true,
  downloadFilename = 'certichain-credential-qr.png',
  className = '',
}) {
  const [dataUrl, setDataUrl] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!value) {
      setDataUrl(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    generateQrDataUrl(value, {
      width: size * 2, // High DPI render
      margin: 2,
    })
      .then((url) => {
        if (isMounted) {
          setDataUrl(url);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('Failed to generate QR code.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [value, size]);

  const handleCopyPayload = async () => {
    if (!value) return;
    try {
      const text = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = downloadFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className={`qr-display-container ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: 'var(--space-3)',
      }}
    >
      {title && (
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <h4 style={{ margin: 0, fontSize: 'var(--text-base)', color: 'var(--ink)' }}>
            {title}
          </h4>
          {subtitle && (
            <p style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)', color: 'var(--ink-muted)' }}>
              {subtitle}
            </p>
          )}
        </div>
      )}

      <div
        className="qr-code-frame"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-md)',
          padding: '10px',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--line-strong)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <span className="spinner" />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)' }}>
              Generating QR...
            </span>
          </div>
        ) : error ? (
          <div style={{ color: 'var(--bad)', fontSize: 'var(--text-xs)', padding: '8px' }}>
            {error}
          </div>
        ) : dataUrl ? (
          <img
            src={dataUrl}
            alt={title || 'CertiChain Credential QR Code'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        ) : (
          <QrIcon size={32} style={{ color: 'var(--ink-muted)' }} />
        )}
      </div>

      {showActions && dataUrl && (
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-2)',
            marginTop: 'var(--space-3)',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={handleDownload}
            title="Download QR code image (PNG)"
          >
            Download QR
          </Button>

          <Button
            variant="ghost"
            size="sm"
            icon={copied ? Check : Copy}
            onClick={handleCopyPayload}
            title="Copy envelope JSON"
          >
            {copied ? 'Copied' : 'Copy Envelope'}
          </Button>
        </div>
      )}
    </div>
  );
}
