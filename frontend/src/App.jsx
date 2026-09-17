import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { StatusAlert } from './components/StatusAlert';
import { AuthCard } from './components/AuthCard';
import { AccountProfileView } from './components/account/AccountProfileView';
import { IssuerStudio } from './components/issuer/IssuerStudio';
import { HolderWalletView } from './components/holder/HolderWalletView';
import { PublicVerifierView } from './components/verifier/PublicVerifierView';
import { AdminConsoleView } from './components/admin/AdminConsoleView';
import { Landing } from './components/Landing';
import {
  WifiOff,
  Lock,
  ShieldCheck,
  LogIn,
  ArrowRight
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

function LoginGate({ children, requiredRole = null }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  
  if (!user) {
    return (
      <main className="main-content">
        <div className="glass-panel" style={{ maxWidth: '460px', margin: '48px auto', padding: '36px 32px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            backgroundColor: 'rgba(0, 240, 255, 0.1)',
            border: '1px solid var(--border-accent)',
            color: 'var(--cyan-primary)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            boxShadow: '0 0 20px rgba(0, 240, 255, 0.25)'
          }}>
            <Lock size={28} />
          </div>
          <h2 className="font-display" style={{ fontSize: '1.45rem', fontWeight: 700, marginBottom: '8px' }}>
            Authentication Required
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
            Please sign in to access your secure credential workspace.
          </p>
          <a className="btn btn-primary" href="#/login" style={{ textDecoration: 'none', padding: '12px 24px' }}>
            <LogIn size={16} />
            <span>Sign In to CertiChain</span>
          </a>
        </div>
      </main>
    );
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'ADMIN') {
    return (
      <main className="main-content">
        <div className="glass-panel" style={{ maxWidth: '480px', margin: '48px auto', padding: '36px 32px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
          <h2 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--rose-primary)', marginBottom: '8px' }}>
            Access Restricted
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            This portal is designated for {requiredRole} accounts only.
          </p>
          <a className="btn btn-outline" href="#/" style={{ textDecoration: 'none' }}>
            <span>Return to Home</span>
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

function LoginPage() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  
  if (user) {
    const target = user.role === 'ADMIN' ? '#/admin' : user.role === 'ISSUER' ? '#/issuer' : '#/wallet';
    return (
      <main className="main-content" style={{ textAlign: 'center', paddingTop: '64px' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '15px' }}>
          You are signed in as <strong>{user.fullName}</strong> ({user.role}).
        </p>
        <a className="btn btn-primary" href={target} style={{ textDecoration: 'none', padding: '12px 24px' }}>
          <ShieldCheck size={18} />
          <span>Continue to Workspace</span>
          <ArrowRight size={16} />
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
      padding: '24px',
      backgroundColor: 'rgba(2, 4, 10, 0.95)',
      fontSize: '13px',
      color: 'var(--text-muted)',
      marginTop: 'auto'
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
          <ShieldCheck size={18} color="var(--cyan-primary)" />
          <span style={{ fontWeight: 600, color: '#ffffff' }}>CertiChain</span>
          <span>&copy; 2026 · Verifiable Digital Credentials</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Lock size={14} color="var(--cyan-primary)" />
            <span>Ed25519 Cryptography</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} color="var(--emerald-primary)" />
            <span>Ethereum Blockchain Ledger</span>
          </span>
          <a href="#/verify" style={{ color: 'var(--cyan-primary)', textDecoration: 'none' }}>
            Verify Document
          </a>
        </div>
      </div>
    </footer>
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

function AppShell({ route, navigate }) {
  const { backendOnline, user } = useAuth();

  // Legacy route redirect for #/console
  useEffect(() => {
    if (route === '/console' && user) {
      const dest = user.role === 'ADMIN' ? '#/admin' : user.role === 'ISSUER' ? '#/issuer' : '#/wallet';
      navigate(dest.replace('#', ''));
    }
  }, [route, user, navigate]);

  return (
    <div className="app-container">
      {/* Offline banner when health poll detects backend unreachable */}
      {backendOnline === false && (
        <div className="offline-banner" role="alert">
          <WifiOff size={15} />
          <span>Backend service unreachable — checking connection...</span>
        </div>
      )}

      <Header />

      {/* Public Home Landing */}
      {route === '/' && <Landing />}

      {/* Public Verification */}
      {route === '/verify' && (
        <main className="main-content">
          <StatusAlert />
          <PublicVerifierView />
        </main>
      )}

      {/* Auth Login / Register */}
      {route === '/login' && <LoginPage />}

      {/* Student / Holder Certificates Wallet */}
      {route === '/wallet' && (
        <LoginGate>
          <main className="main-content">
            <StatusAlert />
            <HolderWalletView />
          </main>
        </LoginGate>
      )}

      {/* Issuer Credential Studio */}
      {route === '/issuer' && (
        <LoginGate requiredRole="ISSUER">
          <main className="main-content">
            <StatusAlert />
            <IssuerStudio />
          </main>
        </LoginGate>
      )}

      {/* Admin Center */}
      {route === '/admin' && (
        <LoginGate requiredRole="ADMIN">
          <main className="main-content">
            <StatusAlert />
            <AdminConsoleView />
          </main>
        </LoginGate>
      )}

      {/* User Account Profile & Security */}
      {route === '/account' && (
        <LoginGate>
          <main className="main-content">
            <StatusAlert />
            <AccountProfileView />
          </main>
        </LoginGate>
      )}

      <Footer />
    </div>
  );
}