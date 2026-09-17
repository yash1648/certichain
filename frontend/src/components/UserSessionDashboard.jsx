import React, { useState, useEffect } from 'react';
import { 
  User, 
  ShieldCheck, 
  RefreshCw, 
  LogOut, 
  Key, 
  Clock, 
  Copy, 
  Check, 
  Code2, 
  Server,
  Layers,
  Database
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function UserSessionDashboard() {
  const { user, accessToken, decodedToken, expiresAt, refreshSession, logout } = useAuth();
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

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

  const handleCopyToken = () => {
    if (!accessToken) return;
    navigator.clipboard.writeText(accessToken);
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

  return (
    <div className="animate-fade-in" style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Banner: User Identity Overview */}
      <div className="glass-panel glass-panel-glow" style={{ padding: '28px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.25), rgba(16, 185, 129, 0.25))',
              border: '1px solid var(--border-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--cyan-primary)',
              boxShadow: '0 0 20px rgba(0, 229, 255, 0.25)'
            }}>
              <User size={28} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <h1 className="font-display" style={{ fontSize: '1.65rem', fontWeight: 700 }}>
                  {user?.fullName}
                </h1>
                <span className="badge badge-emerald">
                  <ShieldCheck size={12} />
                  {user?.role}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '6px' }}>
                {user?.email}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>UUID:</span>
                <code className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--cyan-primary)', background: 'rgba(0, 229, 255, 0.08)', padding: '2px 6px', borderRadius: '4px' }}>
                  {user?.id}
                </code>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="btn btn-outline"
              title="Rotate session credentials and renew token"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Rotating Token...' : 'Rotate Token (Refresh)'}</span>
            </button>

            <button
              onClick={logout}
              className="btn btn-danger"
              title="Sign out and terminate active session"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Token Countdown & Claims Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Token Expiry & Rotation Status */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="var(--cyan-primary)" />
              <h3 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                Access Token TTL
              </h3>
            </div>
            <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
              60 Min Lifespan
            </span>
          </div>

          <div style={{
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '18px',
            textAlign: 'center',
            marginBottom: '16px'
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Time until access token expires:
            </div>
            <div className="font-mono" style={{
              fontSize: '2.4rem',
              fontWeight: 700,
              color: secondsRemaining < 300 ? 'var(--amber-primary)' : 'var(--cyan-primary)',
              letterSpacing: '0.05em'
            }}>
              {formatTime(secondsRemaining)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Auto-rotates silently via background refresh token cookie
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            <p>
              🔒 <strong>Refresh Token Rotation:</strong> Whenever the session is refreshed, the active token is cryptographically renewed to prevent replay attacks and safeguard your credentials.
            </p>
          </div>
        </div>

        {/* Decoded JWT Claims Inspector */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Code2 size={18} color="var(--emerald-primary)" />
              <h3 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                Decoded JWT Claims
              </h3>
            </div>
            <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
              Stateless JWT
            </span>
          </div>

          {decodedToken ? (
            <div style={{
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              fontSize: '0.8rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Subject (sub):</span>
                <span className="font-mono" style={{ color: 'var(--cyan-primary)' }}>{decodedToken.sub}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Role Claim:</span>
                <span className="font-mono" style={{ color: 'var(--emerald-primary)', fontWeight: 600 }}>{decodedToken.role}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Issued At (iat):</span>
                <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {decodedToken.iat ? new Date(decodedToken.iat * 1000).toLocaleTimeString() : 'N/A'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Expires At (exp):</span>
                <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {decodedToken.exp ? new Date(decodedToken.exp * 1000).toLocaleTimeString() : 'N/A'}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No active token claims decoded.
            </div>
          )}

          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Signed using HMAC-SHA256 (JJWT)</span>
            <button
              onClick={handleCopyToken}
              className="btn btn-outline"
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            >
              {copied ? <Check size={12} color="var(--emerald-primary)" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy JWT'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* Raw JWT Token Expandable Display */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={18} color="var(--purple-primary)" />
            <h3 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 600 }}>
              Current Bearer Access Token
            </h3>
          </div>
          <button
            onClick={handleCopyToken}
            className="btn btn-outline"
            style={{ padding: '5px 12px', fontSize: '0.8rem' }}
          >
            {copied ? <Check size={14} color="var(--emerald-primary)" /> : <Copy size={14} />}
            <span>{copied ? 'Token Copied to Clipboard' : 'Copy Bearer Token'}</span>
          </button>
        </div>

        <div style={{
          background: 'rgba(5, 8, 16, 0.95)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '14px',
          maxHeight: '110px',
          overflowY: 'auto'
        }}>
          <code className="font-mono" style={{
            fontSize: '0.78rem',
            color: '#a78bfa',
            wordBreak: 'break-all',
            lineHeight: '1.6'
          }}>
            {accessToken}
          </code>
        </div>
      </div>
    </div>
  );
}
