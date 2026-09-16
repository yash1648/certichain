import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { StatusAlert } from './components/StatusAlert';
import { AuthCard } from './components/AuthCard';
import { UserSessionDashboard } from './components/UserSessionDashboard';
import { IssuerStudio } from './components/issuer/IssuerStudio';
import { ShieldCheck, Cpu, HardDrive, Lock, Award, Key } from 'lucide-react';

function MainContent() {
  const { user, loading } = useAuth();
  const [adminView, setAdminView] = React.useState('issuer'); // 'issuer' | 'session'

  if (loading) {
    return (
      <div style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          border: '3px solid rgba(0, 229, 255, 0.15)',
          borderTopColor: 'var(--cyan-primary)',
          animation: 'spin 1s linear infinite'
        }} />
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Hydrating cryptographic session...
        </span>
      </div>
    );
  }

  // Render role-specific content
  const renderAuthenticatedContent = () => {
    if (user.role === 'ISSUER') {
      return (
        <div>
          {/* View switcher for Issuer to also see Token session if desired */}
          <div style={{
            maxWidth: '1080px',
            margin: '0 auto 20px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px'
          }}>
            <button
              onClick={() => setAdminView('issuer')}
              className="btn btn-outline"
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                backgroundColor: adminView === 'issuer' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                borderColor: adminView === 'issuer' ? 'rgba(139, 92, 246, 0.4)' : 'var(--border-subtle)'
              }}
            >
              <Award size={14} color="#a78bfa" />
              <span>Issuer Studio</span>
            </button>
            <button
              onClick={() => setAdminView('session')}
              className="btn btn-outline"
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                backgroundColor: adminView === 'session' ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
                borderColor: adminView === 'session' ? 'var(--border-accent)' : 'var(--border-subtle)'
              }}
            >
              <Key size={14} color="var(--cyan-primary)" />
              <span>Session & Token Inspector</span>
            </button>
          </div>

          {adminView === 'issuer' ? <IssuerStudio /> : <UserSessionDashboard />}
        </div>
      );
    }

    if (user.role === 'ADMIN') {
      return (
        <div>
          <div style={{
            maxWidth: '1080px',
            margin: '0 auto 20px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px'
          }}>
            <button
              onClick={() => setAdminView('issuer')}
              className="btn btn-outline"
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                backgroundColor: adminView === 'issuer' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                borderColor: adminView === 'issuer' ? 'rgba(139, 92, 246, 0.4)' : 'var(--border-subtle)'
              }}
            >
              <Award size={14} color="#a78bfa" />
              <span>Issuer Studio (Admin Mode)</span>
            </button>
            <button
              onClick={() => setAdminView('session')}
              className="btn btn-outline"
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                backgroundColor: adminView === 'session' ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
                borderColor: adminView === 'session' ? 'var(--border-accent)' : 'var(--border-subtle)'
              }}
            >
              <Key size={14} color="var(--cyan-primary)" />
              <span>Session & Token Inspector</span>
            </button>
          </div>

          {adminView === 'issuer' ? <IssuerStudio /> : <UserSessionDashboard />}
        </div>
      );
    }

    // Default: HOLDER role
    return <UserSessionDashboard />;
  };

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '36px 20px', minHeight: 'calc(100vh - 160px)' }}>
      <StatusAlert />

      {user ? (
        renderAuthenticatedContent()
      ) : (
        <div>
          {/* Hero Banner for Guest / Sign In */}
          <div style={{
            textAlign: 'center',
            maxWidth: '680px',
            margin: '0 auto 36px',
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(0, 229, 255, 0.08)',
              border: '1px solid var(--border-accent)',
              color: 'var(--cyan-primary)',
              fontSize: '0.8rem',
              fontWeight: 600,
              marginBottom: '16px',
              boxShadow: '0 0 15px rgba(0, 229, 255, 0.15)'
            }}>
              <ShieldCheck size={15} />
              <span>Verifiable Credential Verification Engine</span>
            </div>

            <h1 className="font-display" style={{
              fontSize: 'clamp(2rem, 4vw, 2.75rem)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              marginBottom: '14px'
            }}>
              Decentralized Identity & <span style={{
                background: 'linear-gradient(135deg, #00e5ff 0%, #10b981 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>Cryptographic Proof</span>
            </h1>

            <p style={{
              fontSize: '1rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6
            }}>
              Sign in or create an identity account to interact with CertiChain's Ed25519 signature engine, refresh token rotation, and verifiable credentials.
            </p>
          </div>

          <AuthCard />
        </div>
      )}
    </main>
  );
}

function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border-subtle)',
      padding: '24px 20px',
      backgroundColor: 'rgba(5, 8, 16, 0.95)',
      fontSize: '0.8rem',
      color: 'var(--text-muted)'
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={16} color="var(--cyan-primary)" />
          <span>CertiChain SSD-CVE Platform &copy; 2026</span>
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
            <Lock size={14} color="var(--purple-primary)" />
            <span>PostgreSQL 16</span>
          </span>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <div style={{ flex: 1 }}>
          <MainContent />
        </div>
        <Footer />
      </div>
    </AuthProvider>
  );
}
