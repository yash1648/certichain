import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  LogOut,
  FileCheck,
  History,
  Award,
  Building2,
  ShieldAlert,
  User,
  LogIn,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Badge } from './common/Badge';

/**
 * Primary navigation.
 *
 * The workspace link is the one the signed-in user actually needs, so
 * only their own workspace appears. History and settings sit in the
 * account cluster rather than the top bar, which takes the bar from
 * seven items to three and is what makes the mobile layout viable.
 */
function useNavItems(user) {
  const role = user?.role;

  return [
    { href: '#/', label: 'Overview', Icon: ShieldCheck, route: '/' },
    { href: '#/verify', label: 'Verify', Icon: FileCheck, route: '/verify' },
    role === 'HOLDER' || role === 'ADMIN'
      ? { href: '#/wallet', label: 'Wallet', Icon: Award, route: '/wallet' }
      : null,
    role === 'ISSUER' || role === 'ADMIN'
      ? { href: '#/issuer', label: 'Issuer Studio', Icon: Building2, route: '/issuer' }
      : null,
    role === 'ADMIN'
      ? { href: '#/admin', label: 'Admin', Icon: ShieldAlert, route: '/admin' }
      : null,
  ].filter(Boolean);
}

export function Header({ route }) {
  const { user, logout } = useAuth();
  const [navOpen, setNavOpen] = useState(false);

  const navItems = useNavItems(user);

  // Escape closes the mobile panel and returns focus to the toggle.
  useEffect(() => {
    if (!navOpen) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setNavOpen(false);
        document.querySelector('.nav-toggle')?.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [navOpen]);

  const isActive = (item) => route === item.route;

  // Navigating from the mobile panel closes it. Done in the handler
  // rather than an effect on `route`, which would also fire for
  // navigations that did not come from the panel.
  const closeNav = () => {
    if (navOpen) setNavOpen(false);
  };

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="site-header">
        <div className="site-header__bar">
          <a href="#/" className="brand" aria-label="CertiChain home">
            <span className="brand__mark">
              <ShieldCheck size={17} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <span>
              <span className="brand__name">CertiChain</span>
              <br />
              <span className="brand__tag">Credential Registry</span>
            </span>
          </a>

          <nav
            id="site-nav"
            className={`site-nav${navOpen ? ' is-open' : ''}`}
            aria-label="Primary"
          >
            {navItems.map(({ href, label, Icon, route: itemRoute }) => (
              <a
                key={href}
                href={href}
                className="site-nav-link"
                onClick={closeNav}
                aria-current={isActive({ route: itemRoute }) ? 'page' : undefined}
              >
                <Icon size={15} aria-hidden="true" />
                <span>{label}</span>
              </a>
            ))}

            {user && (
              <>
                <a
                  href="#/history"
                  className="site-nav-link site-nav-link--secondary"
                  onClick={closeNav}
                  aria-current={route === '/history' ? 'page' : undefined}
                >
                  <History size={15} aria-hidden="true" />
                  <span>History</span>
                </a>
                <a
                  href="#/account"
                  className="site-nav-link site-nav-link--secondary"
                  onClick={closeNav}
                  aria-current={route === '/account' ? 'page' : undefined}
                >
                  <User size={15} aria-hidden="true" />
                  <span>Settings</span>
                </a>
              </>
            )}

            {user ? (
              <div className="mobile-user-section">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <a href="#/account" className="account-chip" onClick={closeNav} style={{ flex: 1, minHeight: '38px' }}>
                    <span className="account-chip__avatar" aria-hidden="true">
                      {(user.fullName || '?').charAt(0).toUpperCase()}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--ink)' }}>{user.fullName}</span>
                    <Badge status={user.role} />
                  </a>
                  <button
                    type="button"
                    onClick={() => { closeNav(); logout(); }}
                    className="btn btn-ghost btn-sm"
                    aria-label="Sign out"
                    title="Sign out"
                    style={{ minHeight: '38px', minWidth: '38px' }}
                  >
                    <LogOut size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="mobile-user-section">
                <a className="btn btn-primary" href="#/login" onClick={closeNav} style={{ minHeight: '44px', width: '100%' }}>
                  <LogIn size={16} aria-hidden="true" />
                  <span>Sign in</span>
                </a>
              </div>
            )}
          </nav>

          <div className="header-account">
            {user ? (
              <>
                <a href="#/account" className="account-chip">
                  <span className="account-chip__avatar" aria-hidden="true">
                    {(user.fullName || '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="account-chip__name">{user.fullName}</span>
                  <Badge status={user.role} />
                </a>

                <button
                  type="button"
                  onClick={logout}
                  className="btn btn-ghost btn-sm"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut size={15} aria-hidden="true" />
                </button>
              </>
            ) : (
              <a className="btn btn-primary btn-sm" href="#/login">
                <LogIn size={15} aria-hidden="true" />
                <span>Sign in</span>
              </a>
            )}

            <button
              type="button"
              className="nav-toggle"
              aria-expanded={navOpen}
              aria-controls="site-nav"
              aria-label={navOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setNavOpen((open) => !open)}
            >
              {navOpen ? (
                <X size={18} aria-hidden="true" />
              ) : (
                <Menu size={18} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
