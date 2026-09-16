import React from 'react';
import { ShieldCheck, Server, ExternalLink, LogOut, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Header({ activeView, onNavigate }) {
  const { user, backendOnline, logout, checkBackendStatus } = useAuth();

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'badge-amber';
      case 'ISSUER':
        return 'badge-purple';
      case 'VERIFIER':
        return 'badge-cyan';
      case 'HOLDER':
      default:
        return 'badge-emerald';
    }
  };

  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      backgroundColor: 'rgba(7, 10, 18, 0.8)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '14px 24px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.2), rgba(16, 185, 129, 0.2))',
            border: '1px solid var(--border-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--cyan-primary)',
            boxShadow: '0 0 15px rgba(0, 229, 255, 0.2)'
          }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Certi<span style={{ color: 'var(--cyan-primary)' }}>Chain</span>
              </span>
              <span style={{
                fontSize: '0.68rem',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                color: 'var(--text-secondary)',
                fontWeight: 600
              }}>
                SSD-CVE v1.0
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Self-Sovereign Digital Credential Verification Engine
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Backend Health Status */}
          <button
            onClick={checkBackendStatus}
            title="Click to re-ping Spring Boot Backend at port 6969"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
              transition: 'all 0.2s'
            }}
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: backendOnline === true ? 'var(--emerald-primary)' : backendOnline === false ? 'var(--rose-primary)' : 'var(--amber-primary)',
              boxShadow: backendOnline === true ? '0 0 8px var(--emerald-primary)' : 'none'
            }} />
            <span>
              {backendOnline === true
                ? 'Backend Online (:6969)'
                : backendOnline === false
                ? 'Backend Offline (:6969)'
                : 'Checking Backend...'}
            </span>
          </button>

          {/* Verify Credential Button (Accessible to all) */}
          <button
            onClick={() => onNavigate && onNavigate(activeView === 'verifier' ? 'default' : 'verifier')}
            className="btn btn-outline"
            style={{
              padding: '6px 12px',
              fontSize: '0.8rem',
              backgroundColor: activeView === 'verifier' ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              borderColor: activeView === 'verifier' ? 'var(--border-accent)' : 'var(--border-subtle)',
              color: activeView === 'verifier' ? 'var(--cyan-primary)' : 'var(--text-secondary)',
            }}
            title="Public Verifier Portal (POST /api/verifier/verify)"
          >
            <ShieldCheck size={14} color={activeView === 'verifier' ? 'var(--cyan-primary)' : 'var(--emerald-primary)'} />
            <span>{activeView === 'verifier' ? 'Back to App' : 'Verify Credential'}</span>
          </button>

          {/* Swagger UI Shortcut */}
          <a
            href="/swagger-ui/index.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              textDecoration: 'none'
            }}
          >
            <span>Swagger API</span>
            <ExternalLink size={13} />
          </a>

          {/* User Status / Logout */}
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 12px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(0, 229, 255, 0.06)',
                border: '1px solid var(--border-accent)'
              }}>
                <span style={{ fontSize: '0.825rem', fontWeight: 600 }}>{user.fullName}</span>
                <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                  {user.role}
                </span>
              </div>

              <button
                onClick={logout}
                className="btn btn-danger"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                title="Sign out (calls /api/auth/logout)"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
