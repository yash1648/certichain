import React from 'react';
import { 
  ShieldCheck, 
  LogOut, 
  FileCheck, 
  Award, 
  Building2, 
  ShieldAlert, 
  User, 
  LogIn
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Badge } from './common/Badge';

export function Header() {
  const { user, logout, backendOnline } = useAuth();
  const route = window.location.hash.replace(/^#/, '') || '/';

  const navLink = (href, label, Icon, active) => (
    <a
      key={href}
      href={href}
      className="site-nav-link"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        fontSize: '13.5px',
        fontWeight: active ? 600 : 500,
        color: active ? '#1d4ed8' : '#475569',
        padding: '7px 13px',
        borderRadius: 'var(--radius-sm)',
        textDecoration: 'none',
        background: active ? '#eff6ff' : 'transparent',
        border: active ? '1px solid #bfdbfe' : '1px solid transparent',
        transition: 'all 0.15s ease',
      }}
    >
      <Icon size={16} />
      <span>{label}</span>
    </a>
  );

  const isHolder = user?.role === 'HOLDER';
  const isIssuer = user?.role === 'ISSUER';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <header style={{
      borderBottom: '1px solid #e2e8f0',
      backgroundColor: '#ffffff',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '12px 24px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
    }}>
      <div style={{
        maxWidth: '1240px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        {/* Brand */}
        <a href="#/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: '#1d4ed8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 1px 3px rgba(29, 78, 216, 0.3)',
          }}>
            <ShieldCheck size={22} strokeWidth={2.4} />
          </div>

          <div>
            <div className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
              Certi<span style={{ color: '#1d4ed8' }}>Chain</span>
            </div>
            <p style={{ fontSize: '10.5px', color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>
              Verifiable Credential Registry
            </p>
          </div>
        </a>

        {/* Center Navigation */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
          {navLink('#/', 'Overview', ShieldCheck, route === '/')}
          
          {/* Holder / Student Navigation */}
          {user && (isHolder || isAdmin) && (
            navLink('#/wallet', 'Credential Wallet', Award, route === '/wallet')
          )}

          {/* Issuer Navigation */}
          {user && (isIssuer || isAdmin) && (
            navLink('#/issuer', 'Issuer Studio', Building2, route === '/issuer')
          )}

          {/* Admin Navigation */}
          {user && isAdmin && (
            navLink('#/admin', 'Admin Center', ShieldAlert, route === '/admin')
          )}

          {/* Public Verification */}
          {navLink('#/verify', 'Verify Credential', FileCheck, route === '/verify')}

          {/* Account Profile */}
          {user && (
            navLink('#/account', 'Settings', User, route === '/account')
          )}
        </nav>

        {/* Right Side: Status & Account or Sign In */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <a
                href="#/account"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'background 0.15s ease',
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#1d4ed8',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                  {user.fullName}
                </span>
                <Badge status={user.role} />
              </a>

              <button
                type="button"
                onClick={logout}
                className="btn btn-sm btn-outline"
                title="Sign out of CertiChain"
                style={{ padding: '6px 10px' }}
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <a 
              className="btn btn-sm btn-primary" 
              href="#/login" 
              style={{ textDecoration: 'none', padding: '7px 16px' }}
            >
              <LogIn size={15} />
              <span>Sign In</span>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}