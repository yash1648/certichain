import React from 'react';
import { ShieldCheck, LogOut, FileCheck, Wallet, LayoutGrid, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Badge } from './common/Badge';

export function Header() {
  const { user, logout } = useAuth();

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
        fontWeight: active ? 600 : 500,
        color: active ? 'var(--cyan-primary)' : 'var(--text-secondary)',
        padding: '6px 10px',
        borderRadius: 'var(--radius-sm)',
        textDecoration: 'none',
        background: active ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
      }}
    >
      <Icon size={15} />
      <span>{label}</span>
    </a>
  );

  const route = window.location.hash.replace(/^#/, '') || '/';

  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
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
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
          }}>
            <ShieldCheck size={22} />
          </div>

          <div>
            <div className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              Certi<span style={{ color: 'var(--cyan-primary)' }}>Chain</span>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Verifiable Digital Credentials
            </p>
          </div>
        </a>

        {/* Center nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
          {navLink('#/', 'Home', ShieldCheck, route === '/')}
          {navLink('#/verify', 'Verify', FileCheck, route === '/verify')}
          {navLink('#/wallet', 'Wallet', Wallet, route === '/wallet')}
          {navLink('#/console', 'Console', LayoutGrid, route === '/console')}
        </nav>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {user ? (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 12px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'rgba(37, 99, 235, 0.06)',
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
                className="btn btn-sm btn-outline"
                title="Sign out"
              >
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <a className="btn btn-sm btn-primary" href="#/login" style={{ textDecoration: 'none' }}>
              <LogIn size={14} />
              <span>Sign In</span>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}