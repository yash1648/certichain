import React, { useState } from 'react';
import {
  ShieldCheck,
  FileCheck,
  Link2,
  Wallet,
  Building,
  ArrowRight,
  CheckCircle2,
  Lock,
  Cpu,
  Globe2,
  Award,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const institutions = [
  { name: 'Massachusetts Institute of Technology', short: 'MIT' },
  { name: 'Stanford University', short: 'STANFORD' },
  { name: 'University of Oxford', short: 'OXFORD' },
  { name: 'University of Cambridge', short: 'CAMBRIDGE' },
  { name: 'National University of Singapore', short: 'NUS' },
  { name: 'Ethereum Foundation Ledger', short: 'ETHEREUM' }
];

const architectureSteps = [
  {
    step: '01',
    title: 'Cryptographic Issuance',
    desc: 'Accredited universities generate digital diplomas using Ed25519 public-key signatures and SHA-256 canonical hashing.',
    icon: Lock,
    badge: 'Ed25519 Signature'
  },
  {
    step: '02',
    title: 'Blockchain Anchoring',
    desc: 'Batch Merkle tree state roots are permanently written to smart contract ledgers on Ethereum for immutable auditability.',
    icon: Link2,
    badge: 'Ethereum Mainnet'
  },
  {
    step: '03',
    title: 'Instant Verification',
    desc: 'Employers and authorities verify credential authenticity in under 50 milliseconds without contacting the issuing university.',
    icon: ShieldCheck,
    badge: 'Open Standard'
  }
];

const platformFeatures = [
  {
    icon: FileCheck,
    title: 'Instant Document Verification',
    description: 'Inspect canonical document hashes, verify issuer public keys, and validate revocation lists in real-time.',
    accent: '#1d4ed8'
  },
  {
    icon: Wallet,
    title: 'Self-Sovereign Wallet',
    description: 'Graduates hold their credentials in tamper-proof digital vaults, sharing proof links without paper delays.',
    accent: '#15803d'
  },
  {
    icon: Building,
    title: 'Institutional Studio',
    description: 'Registrars batch-issue certificates with Ed25519 cryptographic signing and automated university workflows.',
    accent: '#7c3aed'
  },
  {
    icon: Globe2,
    title: 'W3C Open Standards',
    description: 'Built on W3C Verifiable Credentials and decentralized identity protocols for worldwide cross-border acceptance.',
    accent: '#b45309'
  }
];

export function Landing() {
  const { user } = useAuth();
  
  // Interactive Verification Simulator State
  const [simState, setSimState] = useState('idle'); // 'idle' | 'verifying' | 'verified'

  const runSimulation = () => {
    setSimState('verifying');
    setTimeout(() => {
      setSimState('verified');
    }, 1000);
  };

  const resetSimulation = () => {
    setSimState('idle');
  };

  return (
    <main className="main-content" style={{ paddingTop: '24px' }}>
      {/* Hero Section */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '48px',
        alignItems: 'center',
        padding: '36px 0 56px 0',
      }}>
        {/* Left Hero Content */}
        <div>
          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 12px',
            borderRadius: 'var(--radius-pill)',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1d4ed8',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '20px'
          }}>
            <ShieldCheck size={15} />
            <span>Verifiable Credential Infrastructure</span>
          </div>

          <h1 className="font-display" style={{
            fontSize: 'clamp(2.4rem, 4.5vw, 3.6rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            color: '#0f172a',
            marginBottom: '18px',
          }}>
            Digital Credentials. <br />
            <span style={{ color: '#1d4ed8' }}>
              Backed by Cryptographic Proof.
            </span>
          </h1>

          <p style={{
            fontSize: '16.5px',
            color: '#475569',
            lineHeight: 1.6,
            marginBottom: '32px',
            maxWidth: '540px',
          }}>
            CertiChain empowers universities, credential boards, and enterprises to issue tamper-proof digital certificates, instantly verifiable on the blockchain without third-party gatekeepers.
          </p>

          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
            <a 
              className="btn btn-primary" 
              href="#/verify" 
              style={{ textDecoration: 'none', padding: '11px 22px', fontSize: '15px' }}
            >
              <FileCheck size={18} />
              <span>Verify a Credential</span>
              <ArrowRight size={16} />
            </a>

            {user ? (
              <a 
                className="btn btn-outline" 
                href={user.role === 'ADMIN' ? '#/admin' : user.role === 'ISSUER' ? '#/issuer' : '#/wallet'} 
                style={{ textDecoration: 'none', padding: '11px 20px', fontSize: '15px' }}
              >
                <Wallet size={18} />
                <span>Open Workspace</span>
              </a>
            ) : (
              <a 
                className="btn btn-outline" 
                href="#/login" 
                style={{ textDecoration: 'none', padding: '11px 20px', fontSize: '15px' }}
              >
                <span>Sign In / Demo Personas</span>
              </a>
            )}
          </div>
        </div>

        {/* Right Hero: Clean Verification Simulator Card */}
        <div style={{
          padding: '28px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid #cbd5e1',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
          background: '#ffffff'
        }}>
          {/* Simulator Top Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '16px',
            borderBottom: '1px solid #e2e8f0',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '9px',
                height: '9px',
                borderRadius: '50%',
                backgroundColor: '#16a34a'
              }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Verification Sandbox
              </span>
            </div>

            <span style={{
              fontSize: '11.5px',
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
              background: '#f1f5f9',
              color: '#475569',
              fontWeight: 600
            }}>
              W3C Standard
            </span>
          </div>

          {/* Sample Credential Document Preview */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-md)',
            padding: '18px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '11.5px', color: '#1d4ed8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Massachusetts Institute of Technology
                </span>
                <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                  Master of Science in Computer Science
                </h4>
              </div>
              <Award size={24} color="#1d4ed8" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12.5px', color: '#334155' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>RECIPIENT</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>Alex Mercer</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>ISSUE DATE</span>
                <span>June 15, 2025</span>
              </div>
            </div>

            <div style={{
              marginTop: '12px',
              paddingTop: '10px',
              borderTop: '1px dashed #cbd5e1',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>DID: did:certchain:0x892a...f41e</span>
              <span style={{ color: '#15803d', fontWeight: 600 }}>Anchored</span>
            </div>
          </div>

          {/* Simulation Action & Results */}
          {simState === 'idle' && (
            <button
              type="button"
              onClick={runSimulation}
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px', justifyContent: 'center' }}
            >
              <Cpu size={16} />
              <span>Simulate Cryptographic Verification</span>
            </button>
          )}

          {simState === 'verifying' && (
            <div style={{
              padding: '16px',
              textAlign: 'center',
              background: '#eff6ff',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #bfdbfe'
            }}>
              <div className="spinner" style={{ margin: '0 auto 10px auto' }} />
              <p style={{ fontSize: '13px', color: '#1d4ed8', fontWeight: 600 }}>
                Validating Ed25519 signature & blockchain proof...
              </p>
            </div>
          )}

          {simState === 'verified' && (
            <div className="animate-fade-in" style={{
              padding: '16px',
              background: '#f0fdf4',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #bbf7d0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', fontWeight: 700, fontSize: '14px' }}>
                  <CheckCircle2 size={18} />
                  <span>Verified Authentic & Tamper-Proof</span>
                </div>
                <button
                  type="button"
                  onClick={resetSimulation}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px'
                  }}
                >
                  <RefreshCw size={12} />
                  <span>Reset</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', color: '#334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>SHA-256 Hash Integrity</span>
                  <span style={{ color: '#15803d', fontWeight: 600 }}>Match (100%)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Ed25519 Signature</span>
                  <span style={{ color: '#15803d', fontWeight: 600 }}>Valid (MIT Authority)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Blockchain Anchor</span>
                  <span style={{ color: '#15803d', fontWeight: 600 }}>Block #19842104</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Institutional Trust Strip */}
      <section style={{
        padding: '24px 0',
        borderTop: '1px solid #e2e8f0',
        borderBottom: '1px solid #e2e8f0',
        marginBottom: '64px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <span style={{
            fontSize: '11.5px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: '#64748b',
            textTransform: 'uppercase'
          }}>
            TRUSTED ARCHITECTURE DESIGNED FOR UNIVERSITIES & REGISTRIES
          </span>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '36px',
          flexWrap: 'wrap'
        }}>
          {institutions.map((inst, idx) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#475569',
              letterSpacing: '0.03em'
            }}>
              <Building size={16} color="#1d4ed8" />
              <span>{inst.short}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 3-Step Architecture Section */}
      <section style={{ marginBottom: '64px' }}>
        <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 40px auto' }}>
          <h2 className="font-display" style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
            How CertiChain Works
          </h2>
          <p style={{ fontSize: '15px', color: '#475569', lineHeight: 1.6 }}>
            Our architecture replaces fragile paper certificates with immutable, cryptographic verification.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px'
        }}>
          {architectureSteps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="step-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span className="step-number">STEP {item.step}</span>
                  <span style={{
                    fontSize: '11.5px',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-pill)',
                    background: '#f1f5f9',
                    color: '#1d4ed8',
                    fontWeight: 600
                  }}>
                    {item.badge}
                  </span>
                </div>

                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1d4ed8',
                  marginBottom: '16px'
                }}>
                  <Icon size={20} />
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                  {item.title}
                </h3>

                <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.55 }}>
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Metrics Counter Bar */}
      <section style={{ marginBottom: '64px' }}>
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-value" style={{ color: '#1d4ed8' }}>100%</span>
            <span className="stat-label">Cryptographic Tamper-Proof Assurance</span>
          </div>
          <div className="stat-item">
            <span className="stat-value" style={{ color: '#15803d' }}>&lt; 50ms</span>
            <span className="stat-label">Instant Browser Verification Speed</span>
          </div>
          <div className="stat-item">
            <span className="stat-value" style={{ color: '#0f172a' }}>0</span>
            <span className="stat-label">Middlemen, Fees or Proprietary Gateways</span>
          </div>
          <div className="stat-item">
            <span className="stat-value" style={{ color: '#b45309' }}>W3C</span>
            <span className="stat-label">Open Verifiable Credential Standard</span>
          </div>
        </div>
      </section>

      {/* Platform Features Grid */}
      <section style={{ marginBottom: '80px' }}>
        <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 40px auto' }}>
          <h2 className="font-display" style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
            Enterprise Trust Infrastructure
          </h2>
          <p style={{ fontSize: '15px', color: '#475569' }}>
            Comprehensive tools for academic registrars, students, and employers.
          </p>
        </div>

        <div className="feature-grid">
          {platformFeatures.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div key={idx} className="feature-card">
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: feat.accent,
                  marginBottom: '16px'
                }}>
                  <Icon size={20} />
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                  {feat.title}
                </h3>

                <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.55 }}>
                  {feat.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section style={{
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: 'var(--radius-lg)',
        padding: '44px 32px',
        textAlign: 'center',
        marginBottom: '40px'
      }}>
        <h2 className="font-display" style={{ fontSize: '1.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
          Ready to verify or issue credentials?
        </h2>
        <p style={{ fontSize: '15px', color: '#475569', maxWidth: '580px', margin: '0 auto 24px auto', lineHeight: 1.6 }}>
          Try the public verifier or sign in to experience the institutional credential studio and student wallet.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a className="btn btn-primary" href="#/verify" style={{ textDecoration: 'none', padding: '10px 22px' }}>
            <FileCheck size={17} />
            <span>Launch Public Verifier</span>
          </a>
          <a className="btn btn-outline" href="#/login" style={{ textDecoration: 'none', padding: '10px 20px' }}>
            <span>Sign In to CertiChain</span>
            <ChevronRight size={16} />
          </a>
        </div>
      </section>
    </main>
  );
}