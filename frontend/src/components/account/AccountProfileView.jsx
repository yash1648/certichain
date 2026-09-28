import React, { useState, useEffect } from 'react';
import { LogOut, RefreshCw, Lock, Check, Copy, ChevronDown, ChevronUp, Code2, Clock, ArrowRight, Award, Building2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

const formatTime = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
};

const ROLE_DESTINATION = {
  HOLDER: { href: '#/wallet', label: 'Open credential wallet', Icon: Award },
  ISSUER: { href: '#/issuer', label: 'Open issuer studio', Icon: Building2 },
  ADMIN: { href: '#/admin', label: 'Open administration', Icon: ShieldCheck },
};

export function AccountProfileView() {
  const { user, decodedToken, expiresAt, refreshSession, logout } = useAuth();
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;
    const update = () => setSecondsRemaining(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const handleCopyId = async () => {
    if (!user?.id) return;
    try {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context or denied permission). The ID is
      // visible on screen either way, so there is nothing to recover from.
    }
  };

  const handleRotate = async () => {
    setRefreshing(true);
    try {
      await refreshSession(false);
    } catch {
      // The context surfaces the failure.
    } finally {
      setRefreshing(false);
    }
  };

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const destination = ROLE_DESTINATION[user?.role];
  const DestinationIcon = destination?.Icon;
  const detailId = 'account-token-detail';

  return (
    <div className="animate-fade-in">
      {/* -- Identity --------------------------------------------------- */}
      <section className="card">
        <div className="card__body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <span className="account-chip__avatar" style={{ width: '3rem', height: '3rem', fontSize: '1.125rem' }} aria-hidden="true">
              {initials}
            </span>

            <div style={{ minWidth: 0, flex: '1 1 14rem' }}>
              <h2 className="section-title" style={{ margin: 0 }}>{user?.fullName}</h2>
              <p className="section-note">{user?.email}</p>
            </div>

            <Badge status={user?.role} />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-5)' }}>
            {destination && (
              <a className="btn btn-primary" href={destination.href}>
                <DestinationIcon size={15} aria-hidden="true" />
                <span>{destination.label}</span>
              </a>
            )}
            <a className="btn btn-outline" href="#/verify">
              <span>Verify a credential</span>
              <ArrowRight size={15} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {/* -- Facts, not adjectives -------------------------------------- */}
      <section className="card" style={{ marginTop: 'var(--space-4)' }}>
        <div className="card__header">
          <h3 className="section-title" style={{ margin: 0 }}>
            Account
          </h3>
        </div>

        <dl className="card__body kv" style={{ margin: 0 }}>
          <dt className="kv__key">Role</dt>
          <dd className="kv__value">{user?.role}</dd>

          <dt className="kv__key">Account ID</dt>
          <dd className="kv__value" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span className="font-mono" style={{ overflowWrap: 'anywhere' }}>{user?.id}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyId}
              aria-label={copied ? 'Account ID copied' : 'Copy account ID'}
              style={{ minHeight: '24px', minWidth: '24px', flexShrink: 0 }}
            >
              {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
            </Button>
          </dd>

          <dt className="kv__key">Access token</dt>
          <dd className="kv__value font-mono">
            {secondsRemaining > 0 ? `expires in ${formatTime(secondsRemaining)}` : 'expired'}
          </dd>
        </dl>

        <div className="card__footer">
          <Button variant="danger" onClick={logout} icon={LogOut}>
            Sign out
          </Button>
        </div>
      </section>

      {/* -- Token detail ------------------------------------------------ */}
      <section style={{ marginTop: 'var(--space-4)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)' }}>
        <button
          type="button"
          className="btn btn-ghost"
          aria-expanded={showToken}
          aria-controls={detailId}
          onClick={() => setShowToken((v) => !v)}
          style={{ width: '100%', justifyContent: 'space-between', borderRadius: 'var(--radius-lg)' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Code2 size={15} aria-hidden="true" />
            Token detail
          </span>
          {showToken ? <ChevronUp size={15} aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />}
        </button>

        {showToken && (
          <div className="card__body" id={detailId} style={{ borderTop: '1px solid var(--line)', display: 'grid', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Clock size={15} aria-hidden="true" />
                <span className="font-mono" style={{ fontWeight: 600 }}>
                  {formatTime(secondsRemaining)}
                </span>
              </span>

              <Button variant="outline" size="sm" onClick={handleRotate} loading={refreshing} icon={RefreshCw}>
                Rotate now
              </Button>
            </div>

            <p className="section-note">
              <Lock size={12} aria-hidden="true" /> The access token is sent as a bearer
              token. The refresh token is an HTTP-only cookie and is never readable from
              this page.
            </p>

            {decodedToken ? (
              <pre className="font-mono" style={{ margin: 0, padding: 'var(--space-3)', background: 'var(--surface-sunken)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', fontSize: 'var(--text-xs)', overflowX: 'auto' }}>
                {JSON.stringify(decodedToken, null, 2)}
              </pre>
            ) : (
              <p className="section-note">No token loaded.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
