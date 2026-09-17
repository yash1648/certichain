import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  LogOut, 
  RefreshCw, 
  Lock, 
  Award, 
  Building2, 
  Check, 
  Copy, 
  ChevronDown, 
  ChevronUp, 
  Code2, 
  Clock,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

export function AccountProfileView() {
  const { user, decodedToken, expiresAt, refreshSession, logout } = useAuth();
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [showDeveloperTools, setShowDeveloperTools] = useState(false);

  // Live timer for JWT expiration
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setSecondsRemaining(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleCopyId = () => {
    if (!user?.id) return;
    navigator.clipboard.writeText(user.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshSession(false);
    } catch {
      // Handled in context toast
    } finally {
      setRefreshing(false);
    }
  };

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  const isHolder = user?.role === 'HOLDER';
  const isIssuer = user?.role === 'ISSUER';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="animate-fade-in" style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Profile Overview Card */}
      <div className="glass-panel" style={{ padding: '32px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Avatar */}
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '1.6rem',
              fontWeight: 700,
              boxShadow: '0 8px 24px rgba(37, 99, 235, 0.25)'
            }}>
              {initials}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <h1 className="font-display" style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {user?.fullName}
                </h1>
                <Badge status={user?.role} />
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px', marginBottom: '8px' }}>
                {user?.email}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Account ID:</span>
                <code className="font-mono" style={{ fontSize: '12px', color: 'var(--cyan-primary)', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                  {user?.id}
                </code>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '2px 6px', fontSize: '11.5px', color: 'var(--text-muted)' }}
                  title="Copy account ID to clipboard"
                >
                  {copied ? <Check size={13} color="var(--emerald-primary)" /> : <Copy size={13} />}
                </button>
              </div>
            </div>
          </div>

          {/* Sign Out Button */}
          <Button
            variant="danger"
            size="sm"
            icon={LogOut}
            onClick={logout}
          >
            Sign Out
          </Button>
        </div>

        {/* Quick Links to Role Workspaces */}
        <div style={{
          marginTop: '28px',
          paddingTop: '20px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          {isHolder && (
            <a className="btn btn-primary" href="#/wallet" style={{ textDecoration: 'none' }}>
              <Award size={16} />
              <span>Go to My Certificates</span>
            </a>
          )}

          {isIssuer && (
            <a className="btn btn-primary" href="#/issuer" style={{ textDecoration: 'none' }}>
              <Building2 size={16} />
              <span>Go to Credential Studio</span>
            </a>
          )}

          {isAdmin && (
            <a className="btn btn-primary" href="#/admin" style={{ textDecoration: 'none' }}>
              <ShieldCheck size={16} />
              <span>Go to Admin Center</span>
            </a>
          )}

          <a className="btn btn-outline" href="#/verify" style={{ textDecoration: 'none' }}>
            <span>Verify a Certificate</span>
            <ArrowRight size={15} />
          </a>
        </div>
      </div>

      {/* Security & Account Protection Summary */}
      <div className="glass-panel" style={{ padding: '24px 28px', borderRadius: 'var(--radius-lg)' }}>
        <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Account Security & Privacy
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '16px', borderRadius: 'var(--radius-sm)', backgroundColor: '#f8fafc', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--emerald-primary)', fontWeight: 600, fontSize: '13.5px', marginBottom: '4px' }}>
              <ShieldCheck size={16} />
              <span>Session Secure</span>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Protected with encrypted HTTP-only session rotation and cryptographic token verification.
            </p>
          </div>

          <div style={{ padding: '16px', borderRadius: 'var(--radius-sm)', backgroundColor: '#f8fafc', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cyan-primary)', fontWeight: 600, fontSize: '13.5px', marginBottom: '4px' }}>
              <Lock size={16} />
              <span>Self-Sovereign Identity</span>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Your credentials are cryptographically anchored and can be verified anywhere without central lock-in.
            </p>
          </div>
        </div>
      </div>

      {/* Collapsible Developer & Diagnostics Tools */}
      <div style={{
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        backgroundColor: '#ffffff'
      }}>
        <button
          type="button"
          onClick={() => setShowDeveloperTools(!showDeveloperTools)}
          style={{
            width: '100%',
            padding: '16px 24px',
            background: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            fontSize: '13.5px',
            fontWeight: 600,
            color: 'var(--text-secondary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Code2 size={16} color="var(--cyan-primary)" />
            <span>Developer & Diagnostics Tools</span>
          </div>
          {showDeveloperTools ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showDeveloperTools && (
          <div className="animate-fade-in" style={{
            padding: '20px 24px 24px',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} color="var(--cyan-primary)" />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Access Token TTL Remaining:</span>
                <span className="font-mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--cyan-primary)' }}>
                  {formatTime(secondsRemaining)}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                loading={refreshing}
                icon={RefreshCw}
              >
                Rotate Token
              </Button>
            </div>

            {/* Decoded Claims */}
            {decodedToken && (
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Decoded Token Claims
                </span>
                <pre className="font-mono" style={{
                  marginTop: '4px',
                  padding: '12px',
                  borderRadius: '4px',
                  backgroundColor: '#0f172a',
                  color: '#38bdf8',
                  fontSize: '12px',
                  overflowX: 'auto'
                }}>
                  {JSON.stringify(decodedToken, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
