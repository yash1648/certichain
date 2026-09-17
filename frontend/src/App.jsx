import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { StatusAlert } from './components/StatusAlert';
import { AuthCard } from './components/AuthCard';
import { UserSessionDashboard } from './components/UserSessionDashboard';
import { IssuerStudio } from './components/issuer/IssuerStudio';
import { HolderWalletView } from './components/holder/HolderWalletView';
import { PublicVerifierView } from './components/verifier/PublicVerifierView';
import { VerificationHistoryView } from './components/verifier/VerificationHistoryView';
import { AdminConsoleView } from './components/admin/AdminConsoleView';
import { Landing } from './components/Landing';
import {
  ShieldAlert,
  Award,
  Wallet,
  FileCheck,
  History,
  Key,
  WifiOff,
  Lock,
  ShieldCheck,
  ArrowRight,
  LogIn
} from 'lucide-react';
import './App.css';

function useHashRoute() {
  const [route, setRoute] = useState(() => window.location.hash.replace(/^#/, '') || '/');
  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash.replace(/^#/, '') || '/');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const navigate = (path) => { window.location.hash = path; };
  return [route, navigate];
}

function LoginGate({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) {
    return (
      <main className="main-content">
        <div className="glass-panel" style={{ maxWidth: '460px', margin: '48px auto', padding: '32px', textAlign: 'center' }}>
          <Lock size={28} color="var(--cyan-primary)" style={{ marginBottom: '12px' }} />
          <h2 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>
            Sign in required
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            This area is available to authenticated users only.
          </p>
          <a className="btn btn-primary" href="#/login" style={{ textDecoration: 'none' }}>
            <LogIn size={16} />
            <span>Go to Sign In</span>
          </a>
        </div>
      </main>
    );
  }
  return children;
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
    }}>
      <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px', borderTopColor: 'var(--cyan-primary)' }} />
      <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
        Loading CertiChain...
      </span>
    </div>
  );
}

function ConsoleWorkspace() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState(null);

  useEffect(() => {
    if (user) {
      if (user.role === 'ADMIN') setCurrentTab('admin');
      else if (user.role === 'ISSUER') setCurrentTab('issuer');
      else if (user.role === 'HOLDER') setCurrentTab('wallet');
      else setCurrentTab('verify');
    }
  }, [user?.role]);

  if (!user) return null;

  const isAdmin = user.role === 'ADMIN';
  const isIssuer = user.role === 'ISSUER' || isAdmin;
  const isHolder = user.role === 'HOLDER' || isAdmin;

  return (
    <main className="main-content">
      <StatusAlert />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            Workspace Console
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
            Administrative tools for issuers, holders, and network admins.
          </p>
        </div>
        <a className="btn btn-outline btn-sm" href="#/" style={{ textDecoration: 'none' }}>
          <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} />
          <span>Back to Site</span>
        </a>
      </div>

      {/* Role-Gated Workspace Tab Switcher */}
      <nav className="workspace-nav-bar" aria-label="Workspace tabs">
        {isAdmin && (
          <button
            type="button"
            onClick={() => setCurrentTab('admin')}
            className={`tab-btn ${currentTab === 'admin' ? 'active-amber' : ''}`}
          >
            <ShieldAlert size={15} color="var(--amber-primary)" />
            <span>Admin Console</span>
          </button>
        )}

        {isIssuer && (
          <button
            type="button"
            onClick={() => setCurrentTab('issuer')}
            className={`tab-btn ${currentTab === 'issuer' ? 'active-purple' : ''}`}
          >
            <Award size={15} color="var(--purple-primary)" />
            <span>Issuer Studio</span>
          </button>
        )}

        {isHolder && (
          <button
            type="button"
            onClick={() => setCurrentTab('wallet')}
            className={`tab-btn ${currentTab === 'wallet' ? 'active-emerald' : ''}`}
          >
            <Wallet size={15} color="var(--emerald-primary)" />
            <span>My Wallet</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setCurrentTab('verify')}
          className={`tab-btn ${currentTab === 'verify' ? 'active-cyan' : ''}`}
        >
          <FileCheck size={15} color="var(--cyan-primary)" />
          <span>Verify File</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('history')}
          className={`tab-btn ${currentTab === 'history' ? 'active-amber' : ''}`}
        >
          <History size={15} color="var(--amber-primary)" />
          <span>Audit History</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('session')}
          className={`tab-btn ${currentTab === 'session' ? 'active-cyan' : ''}`}
        >
          <Key size={15} color="var(--cyan-primary)" />
          <span>Session & Tokens</span>
        </button>
      </nav>

      {/* Tab View Content */}
      {currentTab === 'admin' && <AdminConsoleView />}
      {currentTab === 'issuer' && <IssuerStudio />}
      {currentTab === 'wallet' && <HolderWalletView />}
      {currentTab === 'verify' && <PublicVerifierView />}
      {currentTab === 'history' && <VerificationHistoryView />}
      {currentTab === 'session' && <UserSessionDashboard />}
    </main>
  );
}

function LoginPage() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) {
    // Already signed in — send to the right place
    const target = user.role === 'ADMIN' || user.role === 'ISSUER' ? '#/console' : '#/wallet';
    return (
      <main className="main-content" style={{ textAlign: 'center', paddingTop: '64px' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
          You are already signed in as <strong>{user.fullName}</strong>.
        </p>
        <a className="btn btn-primary" href={target} style={{ textDecoration: 'none' }}>
          <ShieldCheck size={16} />
          <span>Continue to your workspace</span>
        </a>
      </main>
    );
  }
  return (
    <main className="main-content">
      <StatusAlert />
      <AuthCard />
    </main>
  );
}

function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border-subtle)',
      padding: '20px 24px',
      backgroundColor: '#ffffff',
      fontSize: '12.5px',
      color: 'var(--text-muted)',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={16} color="var(--cyan-primary)" />
          <span>CertiChain &copy; 2026</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Lock size={14} color="var(--cyan-primary)" />
            <span>Ed25519 Signatures</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} color="var(--emerald-primary)" />
            <span>Blockchain Anchored</span>
          </span>
          <a href="#/console" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            Console
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  const [route] = useHashRoute();

  return (
    <AuthProvider>
      <AppShell route={route} />
    </AuthProvider>
  );
}

function AppShell({ route }) {
  const { backendOnline } = useAuth();

  return (
    <div className="app-container">
      {/* Offline banner when health poll detects backend unreachable */}
      {backendOnline === false && (
        <div className="offline-banner" role="alert">
          <WifiOff size={15} />
          <span>Backend unreachable — showing cached data</span>
        </div>
      )}

      <Header />

      {route === '/verify' && (
        <main className="main-content">
          <StatusAlert />
          <PublicVerifierView />
        </main>
      )}

      {route === '/login' && <LoginPage />}

      {route === '/wallet' && (
        <LoginGate>
          <main className="main-content">
            <StatusAlert />
            <HolderWalletView />
          </main>
        </LoginGate>
      )}

      {route === '/console' && (
        <LoginGate>
          <ConsoleWorkspace />
        </LoginGate>
      )}

      {route === '/' && <Landing />}

      <Footer />
    </div>
  );
}