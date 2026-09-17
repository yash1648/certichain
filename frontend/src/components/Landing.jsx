import React from 'react';
import {
  ShieldCheck,
  FileCheck,
  Link2,
  Wallet,
  Building,
  ArrowRight,
  CheckCircle2,
  Fingerprint,
  Database
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const features = [
  {
    icon: FileCheck,
    title: 'Instant Credential Verification',
    description: 'Upload a signed credential file and verify its cryptographic integrity, Ed25519 signature, and issuer status in seconds.',
    color: 'var(--cyan-primary)',
    bg: 'rgba(37, 99, 235, 0.08)',
  },
  {
    icon: Link2,
    title: 'Blockchain Anchored Proof',
    description: 'Every credential hash is permanently anchored on-chain, giving you tamper-evident, publicly auditable proof of authenticity.',
    color: 'var(--purple-primary)',
    bg: 'rgba(124, 58, 237, 0.08)',
  },
  {
    icon: Wallet,
    title: 'Self-Sovereign Wallet',
    description: 'Hold your credentials in your own wallet. Download, share, and present them on your terms — no central authority required.',
    color: 'var(--emerald-primary)',
    bg: 'rgba(5, 150, 105, 0.08)',
  },
  {
    icon: Building,
    title: 'Trusted Issuer Registry',
    description: 'Credentials are only accepted from verified issuers, with a transparent network registry you can audit at any time.',
    color: 'var(--amber-primary)',
    bg: 'rgba(217, 119, 6, 0.08)',
  },
];

const steps = [
  {
    number: '01',
    title: 'Receive your credential',
    description: 'Your issuer sends you a signed digital credential file — a JSON envelope protected by Ed25519 cryptography.',
  },
  {
    number: '02',
    title: 'Verify its authenticity',
    description: 'Upload the file to CertiChain. We check the signature, issuer status, and on-chain anchor in one pass.',
  },
  {
    number: '03',
    title: 'Hold and present it',
    description: 'Store verified credentials in your wallet and present them anywhere, anytime — with proof that travels with you.',
  },
];

export function Landing() {
  const { user } = useAuth();

  return (
    <main className="main-content" style={{ paddingTop: '48px' }}>
      {/* Hero */}
      <section style={{ textAlign: 'center', maxWidth: '760px', margin: '0 auto 64px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: 'var(--radius-pill)',
          background: 'rgba(37, 99, 235, 0.08)',
          border: '1px solid var(--border-accent)',
          color: 'var(--cyan-primary)',
          fontSize: '13px',
          fontWeight: 600,
          marginBottom: '20px',
        }}>
          <ShieldCheck size={16} />
          <span>Verifiable Credential Platform</span>
        </div>

        <h1 className="font-display" style={{
          fontSize: 'clamp(2.25rem, 5vw, 3.25rem)',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
          marginBottom: '18px',
        }}>
          Digital credentials you can{' '}
          <span style={{
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            actually trust
          </span>
        </h1>

        <p style={{
          fontSize: '16.5px',
          color: 'var(--text-secondary)',
          lineHeight: 1.65,
          maxWidth: '600px',
          margin: '0 auto 32px',
        }}>
          CertiChain issues, holds, and verifies tamper-evident digital credentials — backed by
          Ed25519 signatures, decentralized storage, and blockchain anchoring.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a className="btn btn-primary" href="#/verify" style={{ textDecoration: 'none', padding: '12px 24px' }}>
            <FileCheck size={18} />
            <span>Verify a Credential</span>
          </a>
          {user ? (
            <a className="btn btn-outline" href={user.role === 'ADMIN' || user.role === 'ISSUER' ? '#/console' : '#/wallet'} style={{ textDecoration: 'none', padding: '12px 24px' }}>
              <Wallet size={18} />
              <span>Open My Wallet</span>
            </a>
          ) : (
            <a className="btn btn-outline" href="#/login" style={{ textDecoration: 'none', padding: '12px 24px' }}>
              <span>Sign In</span>
              <ArrowRight size={18} />
            </a>
          )}
        </div>

        {/* Trust stats */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '40px',
          flexWrap: 'wrap',
          marginTop: '48px',
        }}>
          {[
            ['Ed25519', 'Cryptographic signatures'],
            ['On-chain', 'Blockchain anchoring'],
            ['Self-sovereign', 'You control your data'],
          ].map(([stat, label]) => (
            <div key={stat} style={{ textAlign: 'center' }}>
              <div className="font-display" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {stat}
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ marginBottom: '64px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h2 className="font-display" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.1rem)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '10px' }}>
            Everything you need to trust a credential
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', maxWidth: '560px', margin: '0 auto' }}>
            A complete platform for issuing, holding, and verifying digital credentials.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
        }}>
          {features.map((f) => (
            <div key={f.title} className="glass-panel" style={{ padding: '28px 24px', borderRadius: 'var(--radius-lg)' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: f.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: f.color,
                marginBottom: '16px',
              }}>
                <f.icon size={22} />
              </div>
              <h3 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>
                {f.title}
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ marginBottom: '64px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h2 className="font-display" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.1rem)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '10px' }}>
            How it works
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
            Three simple steps from credential to verified proof.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
        }}>
          {steps.map((s) => (
            <div key={s.number} className="glass-panel" style={{ padding: '28px 24px', borderRadius: 'var(--radius-lg)', position: 'relative' }}>
              <div className="font-display" style={{
                fontSize: '2.25rem',
                fontWeight: 800,
                color: 'rgba(37, 99, 235, 0.15)',
                position: 'absolute',
                top: '16px',
                right: '20px',
                letterSpacing: '-0.03em',
              }}>
                {s.number}
              </div>
              <h3 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '8px' }}>
                {s.title}
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="glass-panel" style={{
        borderRadius: 'var(--radius-lg)',
        padding: '48px 32px',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
        border: 'none',
        boxShadow: '0 20px 50px rgba(37, 99, 235, 0.3)',
      }}>
        <h2 className="font-display" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
          Ready to verify a credential?
        </h2>
        <p style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.85)', maxWidth: '480px', margin: '0 auto 28px' }}>
          No account needed for verification. Upload a credential file and get an instant authenticity report.
        </p>
        <a className="btn" href="#/verify" style={{
          textDecoration: 'none',
          background: '#ffffff',
          color: '#1d4ed8',
          fontWeight: 600,
          padding: '12px 28px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)',
        }}>
          <FileCheck size={18} />
          <span>Start Verifying</span>
        </a>
      </section>

      {/* Trust footer strip */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '32px',
        flexWrap: 'wrap',
        marginTop: '48px',
        fontSize: '12.5px',
        color: 'var(--text-muted)',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Fingerprint size={14} color="var(--cyan-primary)" />
          Ed25519 signed
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Database size={14} color="var(--emerald-primary)" />
          Decentralized storage
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle2 size={14} color="var(--purple-primary)" />
          Publicly auditable
        </span>
      </div>
    </main>
  );
}