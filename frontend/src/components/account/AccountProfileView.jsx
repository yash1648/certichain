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
    <div className="animate-fade-in" style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* -- Identity --------------------------------------------------- */}
      <section className="card card--flush" style={{ padding: '24px 28px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <span className="account-chip__avatar" style={{ width: '3.5rem', height: '3.5rem', fontSize: '1.25rem', fontWeight: 700, borderRadius: '50%', boxShadow: 'var(--shadow-sm)' }} aria-hidden="true">
            {initials}
          </span>

          <div style={{ minWidth: 0, flex: '1 1 14rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '2px' }}>
              <h2 className="section-title" style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700 }}>{user?.fullName}</h2>
              <Badge status={user?.role} />
            </div>
            <p className="section-note" style={{ margin: 0, fontSize: '13.5px' }}>{user?.email}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-5)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--line)' }}>
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
      </section>

      {/* -- Facts, not adjectives -------------------------------------- */}
      <section className="card card--flush" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div className="card__header" style={{ padding: '18px 24px' }}>
          <h3 className="section-title" style={{ margin: 0, fontSize: '1.1rem' }}>
            Account Profile & Session
          </h3>
        </div>

        <dl className="card__body kv" style={{ margin: 0, padding: '20px 24px' }}>
          <dt className="kv__key">Role</dt>
          <dd className="kv__value" style={{ fontWeight: 600 }}>{user?.role}</dd>

          <dt className="kv__key">Account ID</dt>
          <dd className="kv__value" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span className="font-mono tabular-nums" style={{ overflowWrap: 'anywhere' }}>{user?.id}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyId}
              aria-label={copied ? 'Account ID copied' : 'Copy account ID'}
              style={{ minHeight: '26px', padding: '2px 8px', flexShrink: 0 }}
            >
              {copied ? <Check size={13} style={{ color: 'var(--ok)' }} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
              <span style={{ fontSize: '11.5px', marginLeft: '4px' }}>{copied ? 'Copied' : 'Copy'}</span>
            </Button>
          </dd>

          <dt className="kv__key">Access session</dt>
          <dd className="kv__value font-mono tabular-nums" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              backgroundColor: secondsRemaining > 300 ? 'var(--ok-subtle)' : secondsRemaining > 0 ? 'var(--warn-subtle)' : 'var(--bad-subtle)',
              color: secondsRemaining > 300 ? 'var(--ok)' : secondsRemaining > 0 ? 'var(--warn)' : 'var(--bad)',
              border: `1px solid ${secondsRemaining > 300 ? 'var(--ok-line)' : secondsRemaining > 0 ? 'var(--warn-line)' : 'var(--bad-line)'}`
            }}>
              <Clock size={12} aria-hidden="true" />
              <span>{secondsRemaining > 0 ? `Expires in ${formatTime(secondsRemaining)}` : 'Expired'}</span>
            </span>
          </dd>
        </dl>

        <div className="card__footer" style={{ padding: '16px 24px', backgroundColor: 'var(--surface-sunken)' }}>
          <Button variant="danger" onClick={logout} icon={LogOut}>
            Sign out
          </Button>
        </div>
      </section>

      {/* -- Token detail ------------------------------------------------ */}
      <section style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--surface)' }}>
        <button
          type="button"
          className="btn btn-ghost"
          aria-expanded={showToken}
          aria-controls={detailId}
          onClick={() => setShowToken((v) => !v)}
          style={{ width: '100%', justifyContent: 'space-between', borderRadius: 'var(--radius-lg)', padding: '14px 20px' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Code2 size={16} aria-hidden="true" />
            <span style={{ fontWeight: 600 }}>Cryptographic Token Details</span>
          </span>
          {showToken ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
        </button>

        {showToken && (
          <div className="card__body" id={detailId} style={{ borderTop: '1px solid var(--line)', padding: '20px', display: 'grid', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Clock size={15} style={{ color: 'var(--ink-secondary)' }} aria-hidden="true" />
                <span className="font-mono tabular-nums" style={{ fontWeight: 600 }}>
                  {formatTime(secondsRemaining)} remaining
                </span>
              </span>

              <Button variant="outline" size="sm" onClick={handleRotate} loading={refreshing} icon={RefreshCw}>
                Rotate session now
              </Button>
            </div>

            <p className="section-note" style={{ margin: 0, fontSize: '13px' }}>
              <Lock size={12} style={{ display: 'inline', marginRight: '4px' }} aria-hidden="true" />
              The access token is sent as a cryptographically signed bearer token. The refresh token is an HTTP-only secure cookie and is never readable from client JavaScript.
            </p>

            {decodedToken ? (
              <pre className="font-mono" style={{ margin: 0, padding: 'var(--space-3)', background: 'var(--surface-sunken)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', fontSize: 'var(--text-xs)', overflowX: 'auto', lineHeight: 1.5 }}>
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
