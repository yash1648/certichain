import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { StatusAlert } from './components/StatusAlert';
import { AuthCard } from './components/AuthCard';
import { AccountProfileView } from './components/account/AccountProfileView';
import { IssuerStudio } from './components/issuer/IssuerStudio';
import { HolderWalletView } from './components/holder/HolderWalletView';
import { PublicVerifierView } from './components/verifier/PublicVerifierView';
import { VerificationHistoryView } from './components/verifier/VerificationHistoryView';
import { AdminConsoleView } from './components/admin/AdminConsoleView';
import { Landing } from './components/Landing';
import { NotFound } from './components/NotFound';
import { LogIn, ShieldAlert, ArrowRight } from 'lucide-react';
import './App.css';

/* Hash routing. Normalised so a trailing slash or a stray query does not
   silently fall through to the not-found view. */
function useHashRoute() {
  const read = () => {
    const raw = window.location.hash.replace(/^#/, '');
    const [path] = raw.split('?');
    return path.replace(/\/+$/, '') || '/';
  };

  const [route, setRoute] = useState(read);

  useEffect(() => {
    const onHashChange = () => setRoute(read());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (path) => {
    window.location.hash = path;
  };

  return [route, navigate];
}

function workspaceFor(user) {
  if (!user) return '#/login';
  if (user.role === 'ADMIN') return '#/admin';
  if (user.role === 'ISSUER') return '#/issuer';
  return '#/wallet';
}

function LoadingScreen({ label = 'Loading' }) {
  return (
    <div className="loading-row" role="status" aria-live="polite">
      <span className="spinner spinner--lg" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

/**
 * Gate for authenticated routes.
 *
 * The role check matches SecurityConfig: an ADMIN may open the holder or
 * issuer workspace, everything else is restricted to its own role.
 */
function LoginGate({ children, requiredRole = null }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen label="Checking your session" />;

  if (!user) {
    return (
      <div className="card">
        <div className="state">
          <div className="state__icon">
            <LogIn size={20} aria-hidden="true" />
          </div>
          <h2 className="state__title">Sign in required</h2>
          <p className="state__text">
            This workspace is only available to signed-in accounts.
          </p>
          <a className="btn btn-primary" href="#/login">
            <LogIn size={16} aria-hidden="true" />
            <span>Sign in</span>
          </a>
        </div>
      </div>
    );
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="card">
        <div className="state">
          <div className="state__icon">
            <ShieldAlert size={20} aria-hidden="true" />
          </div>
          <h2 className="state__title">Not available for your role</h2>
          <p className="state__text">
            This workspace is for {requiredRole.toLowerCase()} accounts. You
            are signed in as {user.role.toLowerCase()}.
          </p>
          <a className="btn btn-secondary" href={workspaceFor(user)}>
            <span>Back to my workspace</span>
          </a>
        </div>
      </div>
    );
  }

  return children;
}

function LoginPage() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen label="Checking your session" />;

  if (user) {
    return (
      <div className="card">
        <div className="state">
          <div className="state__icon">
            <ArrowRight size={20} aria-hidden="true" />
          </div>
          <h2 className="state__title">
            Signed in as {user.fullName}
          </h2>
          <p className="state__text">
            You have {user.role.toLowerCase()} access on this registry.
          </p>
          <a className="btn btn-primary" href={workspaceFor(user)}>
            <span>Continue to workspace</span>
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <StatusAlert />
      <AuthCard />
    </>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--ok)',
                boxShadow: '0 0 0 2px rgba(5, 150, 105, 0.2)',
              }}
              aria-hidden="true"
            />
            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Anvil / Ethereum Chain ID 31337</span>
          </div>
          <span style={{ color: 'var(--line-strong)' }}>&bull;</span>
          <span>W3C Verifiable Credentials 2.0</span>
          <span style={{ color: 'var(--line-strong)' }}>&bull;</span>
          <span>Ed25519 &bull; SHA-256</span>
        </div>

        <div className="site-footer__group">
          <a href="#/">Overview</a>
          <a href="#/verify">Verify</a>
          <a href="#/login">Workspaces</a>
          <a href="#/history">Audit Trail</a>
        </div>
      </div>
    </footer>
  );
}

/* Route table. Adding a page means adding a row, not another branch in a
   conditional ladder. */
const ROUTES = {
  '/': { render: () => <Landing />, bare: true },
  '/verify': { render: () => <PublicVerifierView />, title: 'Verify a credential' },
  '/login': { render: () => <LoginPage />, narrow: true, bare: true },
  '/wallet': {
    render: () => <HolderWalletView />,
    title: 'Credential wallet',
    subtitle:
      'Credentials you have claimed. Download an official copy or check its current standing.',
    gate: true,
    role: 'HOLDER',
  },
  '/issuer': {
    render: () => <IssuerStudio />,
    title: 'Issuer studio',
    subtitle: 'Issue, manage, and anchor verifiable credentials for your organization.',
    gate: true,
    role: 'ISSUER',
  },
  '/admin': {
    render: () => <AdminConsoleView />,
    title: 'Administration',
    gate: true,
    role: 'ADMIN',
  },
  '/account': {
    render: () => <AccountProfileView />,
    title: 'Account and security',
    gate: true,
  },
  '/history': {
    render: () => <VerificationHistoryView />,
    title: 'Verification history',
    subtitle: 'Credential checks you have run, newest first.',
    gate: true,
  },
};

function AppShell({ route, navigate }) {
  const { user } = useAuth();
  const config = ROUTES[route];

  // Legacy deep link from the pre-rename console.
  useEffect(() => {
    if (route === '/console' && user) {
      navigate(workspaceFor(user).replace('#', ''));
    }
  }, [route, user, navigate]);

  return (
    <div className="app-container">
      <Header route={route} />

      <main
        id="main-content"
        className={[
          'main-content',
          config?.narrow ? 'main-content--narrow' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        tabIndex={-1}
      >
        {!config && <NotFound route={route} />}

        {config && (
          <>
            {config.title && !config.fullBleed && (
              <div className="page-header">
                <h1 className="page-header__title">{config.title}</h1>
                {config.subtitle && (
                  <p className="page-header__sub">{config.subtitle}</p>
                )}
              </div>
            )}

            {!config.bare && <StatusAlert />}

            {config.gate ? (
              <LoginGate requiredRole={config.role ?? null}>
                {config.render()}
              </LoginGate>
            ) : (
              config.render()
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function App() {
  const [route, navigate] = useHashRoute();

  return (
    <AuthProvider>
      <AppShell route={route} navigate={navigate} />
    </AuthProvider>
  );
}
