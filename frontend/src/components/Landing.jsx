import React, { useState } from 'react';
import {
  ShieldCheck,
  FileCheck,
  Link2,
  Wallet,
  Building,
  ArrowRight,
  CheckCircle2,
  Fingerprint,
  Database,
  Globe2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const features = [
  {
    icon: FileCheck,
    title: 'Instant Credential Verification',
    description: 'Upload a signed credential file and verify its cryptographic integrity, Ed25519 signature, and issuer status in milliseconds.',
    color: 'var(--cyan-primary)',
    bg: 'rgba(0, 240, 255, 0.1)',
  },
  {
    icon: Link2,
    title: 'Blockchain Anchored Proof',
    description: 'Every credential hash is permanently anchored on Ethereum & testnets, giving you tamper-evident, publicly auditable proof.',
    color: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.1)',
  },
  {
    icon: Wallet,
    title: 'Self-Sovereign Wallet',
    description: 'Hold credentials in your personal digital vault. Download, share, and present them on your terms without middlemen.',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.1)',
  },
  {
    icon: Building,
    title: 'Trusted Issuer Registry',
    description: 'Credentials are cryptographically validated against registered institutions, with a transparent on-chain audit trail.',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.1)',
  },
];

const techStackItems = [
  {
    id: 'engine',
    title: 'Parallel Verification Engine',
    description: 'Deterministic concurrency with 100K TPS cryptographic throughput — 10x faster than standard EVMs, powered by zero-knowledge & Ed25519 batch execution.',
  },
  {
    id: 'registry',
    title: 'Decentralized Issuer Registry',
    description: 'Multi-signature verified authority ledger ensuring only accredited institutions can issue verifiable credentials.',
  },
  {
    id: 'anchors',
    title: 'Smart Contract Anchor Set',
    description: 'Immutable Merkle-tree state roots anchored directly into Ethereum blocks for permanent verifiable existence.',
  },
  {
    id: 'crypto',
    title: 'Embedded Cryptographic Engine',
    description: 'Hardware-grade Ed25519 and SHA-256 primitives running natively in browser and server runtimes.',
  },
  {
    id: 'sdk',
    title: 'Nation-Scale Identity SDK',
    description: 'W3C compliant verifiable credential schemas designed for seamless interoperability across universities and employers.',
  },
];

const globalRegions = [
  'North America & Canada',
  'European Union',
  'United Kingdom',
  'Singapore & Southeast Asia',
  'Japan & East Asia',
  'Latin America & Caribbean',
  'Global Decentralized P2P'
];

export function Landing() {
  const { user } = useAuth();
  const [activeTechIndex, setActiveTechIndex] = useState(0);
  const [activeRegion, setActiveRegion] = useState(null);

  return (
    <main className="main-content" style={{ paddingTop: '24px', overflow: 'hidden' }}>
      {/* Hero Section with Glowing Concentric Orbit Waves */}
      <section style={{ position: 'relative', minHeight: '520px', marginBottom: '80px', paddingTop: '32px' }}>
        {/* Futuristic Concentric Cyan Orbit Waves (Matching photo's top right visual) */}
        <div className="cyber-orbit-container" aria-hidden="true">
          {/* Ring 1 - Outermost */}
          <div className="cyber-orbit-ring" style={{ width: '560px', height: '560px', top: '20px', right: '-120px' }}>
            <div className="cyber-orbit-node" style={{ top: '60px', left: '110px' }}>£</div>
          </div>
          {/* Ring 2 - Intermediate */}
          <div className="cyber-orbit-ring" style={{ width: '420px', height: '420px', top: '90px', right: '-50px' }}>
            <div className="cyber-orbit-node" style={{ top: '30px', left: '160px' }}>€</div>
            <div className="cyber-orbit-node" style={{ bottom: '90px', right: '40px' }}>¥</div>
          </div>
          {/* Ring 3 - Active glowing arc */}
          <div className="cyber-orbit-ring active-arc" style={{ width: '280px', height: '280px', top: '160px', right: '20px' }}>
            <div className="cyber-orbit-node" style={{ top: '40px', left: '20px' }}>$</div>
            <div className="cyber-orbit-node" style={{ bottom: '30px', right: '60px' }}>✓</div>
          </div>
        </div>

        {/* Hero Content */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '640px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 14px',
            borderRadius: 'var(--radius-pill)',
            background: 'rgba(0, 240, 255, 0.08)',
            border: '1px solid var(--border-accent)',
            color: 'var(--cyan-primary)',
            fontSize: '12.5px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            marginBottom: '24px',
            boxShadow: '0 0 15px rgba(0, 240, 255, 0.2)'
          }}>
            <ShieldCheck size={15} />
            <span>DIGITAL CREDENTIAL PLATFORM</span>
          </div>

          <h1 className="font-display" style={{
            fontSize: 'clamp(2.5rem, 5.5vw, 4rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            color: '#ffffff',
            marginBottom: '20px',
          }}>
            Certi<span style={{ color: 'var(--cyan-primary)', textShadow: '0 0 25px rgba(0, 240, 255, 0.5)' }}>Chain</span>
          </h1>

          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: '#ffffff',
            marginBottom: '12px'
          }}>
            Digital Central Trust
          </h2>

          <p style={{
            fontSize: '15.5px',
            color: 'var(--text-secondary)',
            lineHeight: 1.65,
            marginBottom: '32px',
            maxWidth: '520px',
          }}>
            High-performance chain for verifiable credentials, cryptographic signatures, and on-chain trust, with the vision of bringing all credentials on-chain.
          </p>

          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '48px' }}>
            <a 
              className="btn btn-primary" 
              href="#/verify" 
              style={{ 
                textDecoration: 'none', 
                padding: '12px 28px',
                letterSpacing: '0.04em'
              }}
            >
              <span>DISCOVER CERTICHAIN •</span>
            </a>

            {user ? (
              <a 
                className="btn btn-outline" 
                href={user.role === 'ADMIN' ? '#/admin' : user.role === 'ISSUER' ? '#/issuer' : '#/wallet'} 
                style={{ textDecoration: 'none', padding: '12px 24px' }}
              >
                <Wallet size={16} />
                <span>Open My Workspace</span>
              </a>
            ) : (
              <a 
                className="btn btn-outline" 
                href="#/login" 
                style={{ textDecoration: 'none', padding: '12px 24px' }}
              >
                <span>Sign In</span>
                <ArrowRight size={16} />
              </a>
            )}
          </div>

          {/* Backed By Strip (Matching photo) */}
          <div style={{
            paddingTop: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '11px', letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              BACKED BY:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', color: '#94a3b8', fontSize: '12.5px', fontWeight: 700, letterSpacing: '0.06em' }}>
              <span>CIRCLE</span>
              <span>&gt;|&lt; DRAGONFLY</span>
              <span>∞ VENTURES</span>
              <span>SHIMA CAPITAL</span>
            </div>
          </div>
        </div>
      </section>

      {/* "Built to Settle Trust, Not Just Move It" & Global Reach Panel Section (Matching photo) */}
      <section style={{ marginBottom: '80px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '32px',
          alignItems: 'start'
        }}>
          {/* Left Column: Interlocking Geometric Rings & Tech Stack Accordion */}
          <div className="glass-panel" style={{ padding: '36px 30px', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.08em', color: 'var(--cyan-primary)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '20px' }}>
              CERTICHAIN'S TECH STACK
            </div>

            {/* Interlocking Rings Wireframe (Directly matches the 3 circles in photo) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px 0',
              marginBottom: '24px',
            }}>
              <svg width="240" height="90" viewBox="0 0 240 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Circle 1 */}
                <circle cx="55" cy="45" r="38" stroke="rgba(0, 240, 255, 0.35)" strokeWidth="2.5" />
                {/* Circle 2 */}
                <circle cx="120" cy="45" r="38" stroke="var(--cyan-primary)" strokeWidth="3" filter="drop-shadow(0 0 8px rgba(0, 240, 255, 0.6))" />
                {/* Circle 3 */}
                <circle cx="185" cy="45" r="38" stroke="rgba(0, 240, 255, 0.35)" strokeWidth="2.5" />
              </svg>
            </div>

            <h2 className="font-display" style={{
              fontSize: '1.85rem',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.2,
              marginBottom: '24px'
            }}>
              Built to Settle Trust,<br />Not Just Move It
            </h2>

            {/* Interactive Tech Accordion List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '32px' }}>
              {techStackItems.map((item, idx) => {
                const isActive = activeTechIndex === idx;
                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveTechIndex(isActive ? -1 : idx)}
                    className={`cyber-accordion-item ${isActive ? 'active' : ''}`}
                  >
                    <div style={{ width: '100%' }}>
                      <div className="item-title">
                        <span style={{ color: isActive ? 'var(--cyan-primary)' : 'var(--text-muted)', fontSize: '1.2rem' }}>
                          {isActive ? '•' : ''}
                        </span>
                        <span style={{ color: isActive ? 'var(--cyan-primary)' : '#ffffff' }}>
                          {item.title}
                        </span>
                        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '14px' }}>
                          {isActive ? '−' : '+'}
                        </span>
                      </div>
                      {isActive && (
                        <p style={{
                          fontSize: '13.5px',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.6,
                          marginTop: '8px',
                          paddingLeft: '14px',
                          borderLeft: '2px solid var(--cyan-primary)',
                          animation: 'fadeIn 0.2s ease-out'
                        }}>
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <a 
              className="btn btn-primary" 
              href="#/verify" 
              style={{ 
                textDecoration: 'none', 
                width: '100%',
                letterSpacing: '0.04em',
                padding: '12px 20px',
                fontWeight: 700
              }}
            >
              <span>WHAT POWERS CERTICHAIN •</span>
            </a>
          </div>

          {/* Right Column: Global Reach & Verifier Nodes Panel (Directly matches the right mobile/panel view) */}
          <div className="glass-panel" style={{
            padding: '36px 30px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid rgba(0, 240, 255, 0.25)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.8), 0 0 30px -10px rgba(0, 240, 255, 0.2)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: 'var(--radius-pill)',
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1px solid rgba(0, 240, 255, 0.35)',
                color: 'var(--cyan-primary)',
                fontSize: '11.5px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                marginBottom: '16px'
              }}>
                <Globe2 size={13} />
                <span>ACTIVE MAP 🌐</span>
              </div>

              <h3 className="font-display" style={{
                fontSize: '1.65rem',
                fontWeight: 800,
                color: '#ffffff',
                lineHeight: 1.25,
                marginBottom: '10px'
              }}>
                Backed by <span style={{ color: 'var(--cyan-primary)', textShadow: '0 0 15px rgba(0, 240, 255, 0.5)' }}>Industry Leaders</span>, Built for Global Reach
              </h3>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Active in North America, Europe, Asia, and scaling to 10+ countries
              </p>
            </div>

            {/* Stylized Futuristic Globe Wireframe graphic */}
            <div style={{
              background: 'radial-gradient(circle at center, rgba(0, 240, 255, 0.12) 0%, rgba(2, 4, 10, 0) 70%)',
              border: '1px solid rgba(0, 240, 255, 0.15)',
              borderRadius: 'var(--radius-md)',
              padding: '24px 16px',
              textAlign: 'center',
              marginBottom: '24px',
              position: 'relative'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--cyan-primary)',
                fontWeight: 600,
                fontSize: '12px',
                marginBottom: '8px'
              }}>
                <span className="badge-dot" style={{ background: '#00f0ff', boxShadow: '0 0 8px #00f0ff' }} />
                <span>1,420+ On-Chain Attestations Live</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                ETHEREUM SEPOLIA · ED25519 · IPFS DISTRIBUTED NETWORK
              </div>
            </div>

            <div style={{
              fontSize: '11px',
              letterSpacing: '0.08em',
              color: 'var(--cyan-primary)',
              textTransform: 'uppercase',
              fontWeight: 700,
              marginBottom: '12px'
            }}>
              ACTIVE REGIONS
            </div>

            {/* Region Accordion List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '28px' }}>
              {globalRegions.map((region, idx) => {
                const isOpen = activeRegion === idx;
                return (
                  <div
                    key={region}
                    onClick={() => setActiveRegion(isOpen ? null : idx)}
                    className={`cyber-accordion-item ${isOpen ? 'active' : ''}`}
                    style={{ padding: '12px 0' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontSize: '14px', color: isOpen ? 'var(--cyan-primary)' : 'var(--text-secondary)' }}>
                        {region}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                        {isOpen ? '−' : '+'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <a 
              className="btn btn-primary" 
              href="#/verify" 
              style={{ 
                textDecoration: 'none', 
                width: '100%',
                letterSpacing: '0.04em',
                padding: '12px 20px',
                fontWeight: 700
              }}
            >
              <span>WHAT POWERS CERTICHAIN •</span>
            </a>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ marginBottom: '80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 className="font-display" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '10px' }}>
            Cryptographic Integrity at Scale
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', maxWidth: '560px', margin: '0 auto' }}>
            Built with Ed25519 digital signatures, tamper-evident hash chains, and Ethereum smart contract anchors.
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
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: f.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: f.color,
                marginBottom: '18px',
                border: `1px solid ${f.color}40`,
                boxShadow: `0 0 15px ${f.color}25`
              }}>
                <f.icon size={24} />
              </div>
              <h3 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '10px' }}>
                {f.title}
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Cyber CTA Band */}
      <section className="glass-panel" style={{
        borderRadius: 'var(--radius-lg)',
        padding: '54px 32px',
        textAlign: 'center',
        background: 'radial-gradient(circle at 50% 0%, rgba(0, 240, 255, 0.15) 0%, rgba(7, 13, 24, 0.95) 75%)',
        border: '1px solid var(--border-accent)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 35px -10px rgba(0, 240, 255, 0.3)',
        marginBottom: '64px'
      }}>
        <h2 className="font-display" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.25rem)', fontWeight: 800, color: '#ffffff', marginBottom: '12px' }}>
          Ready to verify a credential?
        </h2>
        <p style={{ fontSize: '15px', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 28px' }}>
          No account needed for verification. Upload any issued credential file and receive an instant cryptographic authenticity audit.
        </p>
        <a className="btn btn-primary" href="#/verify" style={{
          textDecoration: 'none',
          padding: '13px 32px',
          fontWeight: 700,
          letterSpacing: '0.04em'
        }}>
          <FileCheck size={18} />
          <span>START VERIFYING •</span>
        </a>
      </section>

      {/* Trust footer strip */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '32px',
        flexWrap: 'wrap',
        marginBottom: '32px',
        fontSize: '12.5px',
        color: 'var(--text-muted)',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Fingerprint size={14} color="var(--cyan-primary)" />
          Ed25519 signed
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Database size={14} color="#10b981" />
          Decentralized storage
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle2 size={14} color="#a855f7" />
          Publicly auditable on Ethereum
        </span>
      </div>
    </main>
  );
}