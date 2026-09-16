import React from 'react';
import { ShieldCheck, LogOut, ExternalLink, RefreshCw, FileCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Badge } from './common/Badge';

export function Header({ activeView, onNavigate }) {
  const { user, backendOnline, logout, checkBackendStatus } = useAuth();

  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      backgroundColor: 'rgba(7, 10, 18, 0.85)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '12px 24px',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
      }}>
        {/* Brand */}
        <div
          onClick={() => onNavigate && onNavigate('default')}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        >
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.25), rgba(16, 185, 129, 0.25))',
            border: '1px solid var(--border-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--cyan-primary)',
            boxShadow: '0 0 15px rgba(0, 229, 255, 0.2)',
          }}>
            <ShieldCheck size={22} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                Certi<span style={{ color: 'var(--cyan-primary)' }}>Chain</span>
              </span>
              <span style={{
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                color: 'var(--text-secondary)',
                fontWeight: 600,
              }}>
                SSD-CVE v1.0
              </span>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Self-Sovereign Digital Credential Verification Engine
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          
          {/* Backend Health Status Pill */}
          <button
            type="button"
            onClick={checkBackendStatus}
            title="Pings /v3/api-docs to check Spring Boot backend health"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-pill)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: '12.5px',
              transition: 'all 0.2s',
            }}
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: backendOnline === true ? 'var(--emerald-primary)' : backendOnline === false ? 'var(--rose-primary)' : 'var(--amber-primary)',
              boxShadow: backendOnline === true ? '0 0 8px var(--emerald-primary)' : 'none',
            }} />
            <span>
              {backendOnline === true
                ? 'Backend Online (:6969)'
                : backendOnline === false
                ? 'Backend Offline'
                : 'Checking Health...'}
            </span>
          </button>

          {/* Verify Credential Hero Button (Always accessible to all) */}
          <button
            type="button"
            onClick={() => onNavigate && onNavigate(activeView === 'verifier' ? 'default' : 'verifier')}
            className={`btn btn-sm ${activeView === 'verifier' ? 'btn-primary' : 'btn-outline'}`}
            style={{
              borderColor: activeView === 'verifier' ? 'transparent' : 'var(--border-accent)',
              color: activeView === 'verifier' ? '#030712' : 'var(--cyan-primary)',
            }}
            title="Public Verifier Portal"
          >
            <FileCheck size={14} />
            <span>{activeView === 'verifier' ? 'Back to App' : 'Verify Credential'}</span>
          </button>

          {/* Swagger UI link */}
          <a
            href="/swagger-ui/index.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              color: 'var(--text-secondary)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              textDecoration: 'none',
            }}
          >
            <span>Swagger</span>
            <ExternalLink size={12} />
          </a>

          {/* Authenticated User Status */}
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 12px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'rgba(0, 229, 255, 0.06)',
                border: '1px solid var(--border-accent)',
              }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {user.fullName}
                </span>
                <Badge status={user.role} />
              </div>

              <button
                type="button"
                onClick={logout}
                className="btn btn-sm btn-danger"
                title="Sign out (POST /api/auth/logout)"
              >
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
