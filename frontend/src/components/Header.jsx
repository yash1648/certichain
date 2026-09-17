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
  const { user, logout } = useAuth();
  const route = window.location.hash.replace(/^#/, '') || '/';

  const navLink = (href, label, Icon, active) => (
    <a
      key={href}
      href={href}
      className="site-nav-link"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13.5px',
        fontWeight: active ? 700 : 500,
        color: active ? 'var(--cyan-primary)' : 'var(--text-secondary)',
        padding: '6px 12px',
        borderRadius: 'var(--radius-sm)',
        textDecoration: 'none',
        background: active ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
        border: active ? '1px solid rgba(0, 240, 255, 0.3)' : '1px solid transparent',
        boxShadow: active ? '0 0 12px rgba(0, 240, 255, 0.18)' : 'none',
        transition: 'all 0.2s ease',
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
      borderBottom: '1px solid var(--border-subtle)',
      backgroundColor: 'rgba(2, 4, 10, 0.88)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
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
        <a href="#/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'radial-gradient(circle, #00f0ff 0%, #0369a1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#02040a',
            boxShadow: '0 0 16px rgba(0, 240, 255, 0.45)',
          }}>
            <ShieldCheck size={22} strokeWidth={2.5} />
          </div>

          <div>
            <div className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
              Certi<span style={{ color: 'var(--cyan-primary)', textShadow: '0 0 12px rgba(0, 240, 255, 0.4)' }}>Chain</span>
            </div>
            <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Verifiable Credentials
            </p>
          </div>
        </a>

        {/* Center Role-Aware Navigation */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
          {navLink('#/', 'Home', ShieldCheck, route === '/')}
          
          {/* Holder / Student Navigation */}
          {user && (isHolder || isAdmin) && (
            navLink('#/wallet', 'My Certificates', Award, route === '/wallet')
          )}

          {/* Issuer Navigation */}
          {user && (isIssuer || isAdmin) && (
            navLink('#/issuer', 'Credential Studio', Building2, route === '/issuer')
          )}

          {/* Admin Navigation */}
          {user && isAdmin && (
            navLink('#/admin', 'Admin Center', ShieldAlert, route === '/admin')
          )}

          {/* Public Verification */}
          {navLink('#/verify', 'Verify Certificate', FileCheck, route === '/verify')}

          {/* Account Profile */}
          {user && (
            navLink('#/account', 'My Account', User, route === '/account')
          )}
        </nav>

        {/* Right Side: Account or Sign In */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {user ? (
            <>
              <a
                href="#/account"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'rgba(0, 240, 255, 0.08)',
                  border: '1px solid var(--border-accent)',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'background 0.2s ease',
                  boxShadow: '0 0 12px rgba(0, 240, 255, 0.15)'
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {user.fullName}
                </span>
                <Badge status={user.role} />
              </a>

              <button
                type="button"
                onClick={logout}
                className="btn btn-sm btn-outline"
                title="Sign out of CertiChain"
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <a 
              className="btn btn-sm btn-primary" 
              href="#/login" 
              style={{ 
                textDecoration: 'none',
                letterSpacing: '0.04em',
                fontWeight: 700,
                padding: '7px 16px'
              }}
            >
              <LogIn size={14} />
              <span>SIGN IN •</span>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}