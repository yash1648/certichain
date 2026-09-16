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
import { 
  ShieldCheck, 
  Cpu, 
  HardDrive, 
  Lock, 
  Award, 
  Key, 
  Wallet, 
  FileCheck, 
  History,
  ShieldAlert,
  WifiOff,
  Link2
} from 'lucide-react';
import './App.css';

function MainContent({ activeView }) {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState(null);

  // Set default tab based on role whenever user logs in or role changes
  useEffect(() => {
    if (user) {
      if (user.role === 'ADMIN') setCurrentTab('admin');
      else if (user.role === 'ISSUER') setCurrentTab('issuer');
      else if (user.role === 'HOLDER') setCurrentTab('wallet');
      else setCurrentTab('verify');
    }
  }, [user?.role]);

  if (loading) {
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
          Hydrating cryptographic session...
        </span>
      </div>
    );
  }

  // 1. If public verifier view is active
  if (activeView === 'verifier') {
    return (
      <main className="main-content">
        <StatusAlert />
        <PublicVerifierView />
      </main>
    );
  }

  // 2. If authenticated, render workspace navigation & active tab
  if (user) {
    const isAdmin = user.role === 'ADMIN';
    const isIssuer = user.role === 'ISSUER' || isAdmin;
    const isHolder = user.role === 'HOLDER' || isAdmin;

    return (
      <main className="main-content">
        <StatusAlert />

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
              <Award size={15} color="#a78bfa" />
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

  // 3. Guest View: Hero + AuthCard
  return (
    <main className="main-content">
      <StatusAlert />

      <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 36px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: 'var(--radius-pill)',
          background: 'rgba(0, 229, 255, 0.08)',
          border: '1px solid var(--border-accent)',
          color: 'var(--cyan-primary)',
          fontSize: '13px',
          fontWeight: 600,
          marginBottom: '16px',
          boxShadow: '0 0 15px rgba(0, 229, 255, 0.15)',
        }}>
          <ShieldCheck size={16} />
          <span>Verifiable Credential Verification Engine</span>
        </div>

        <h1 className="font-display" style={{
          fontSize: 'clamp(2rem, 4vw, 2.75rem)',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          lineHeight: 1.15,
          marginBottom: '14px',
        }}>
          Decentralized Identity & <span style={{
            background: 'linear-gradient(135deg, #00e5ff 0%, #10b981 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>Cryptographic Proof</span>
        </h1>

        <p style={{
          fontSize: '15px',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
        }}>
          Authenticate to issue, hold, and verify digital credentials backed by Ed25519 signatures, IPFS decentralized storage, and Ethereum blockchain anchoring.
        </p>
      </div>

      <AuthCard />
    </main>
  );
}

function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border-subtle)',
      padding: '20px 24px',
      backgroundColor: 'rgba(5, 8, 16, 0.95)',
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
          <span>CertiChain (SSD-CVE) Platform &copy; 2026</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Cpu size={14} color="var(--cyan-primary)" />
            <span>Ed25519 & JJWT 0.12</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HardDrive size={14} color="var(--emerald-primary)" />
            <span>IPFS Kubo v0.36</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Link2 size={14} color="var(--purple-primary)" />
            <span>Ethereum Anvil Anchoring</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Lock size={14} color="var(--amber-primary)" />
            <span>PostgreSQL 16</span>
          </span>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  const [globalView, setGlobalView] = useState('default'); // 'default' | 'verifier'

  return (
    <AuthProvider>
      <AppShell globalView={globalView} setGlobalView={setGlobalView} />
    </AuthProvider>
  );
}

function AppShell({ globalView, setGlobalView }) {
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

      <Header activeView={globalView} onNavigate={setGlobalView} />
      <div style={{ flex: 1 }}>
        <MainContent activeView={globalView} onNavigate={setGlobalView} />
      </div>
      <Footer />
    </div>
  );
}
