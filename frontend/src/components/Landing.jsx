import React, { useState } from 'react';
import {
  ShieldCheck,
  FileCheck,
  Link2,
  Lock,
  Wallet,
  Building2,
  ShieldAlert,
  ArrowRight,
  Fingerprint,
  Award,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CertificateDiplomaModal } from './common/CertificateDiplomaModal';

/* What the verifier actually does, in the order it does it. This is the
   page's reason to exist: an employer asking "how do I know this is
   real" gets a concrete answer, not a slogan. */
const CHECKS = [
  {
    icon: Lock,
    title: 'Signature & Integrity',
    tag: 'Ed25519 Cryptography',
    detail:
      'The issuer’s Ed25519 public key is verified against the canonical document digest to prove the document has not been altered since conferral.',
  },
  {
    icon: ShieldCheck,
    title: 'Revocation & Standing',
    tag: 'Real-time Status',
    detail:
      'The credential number is cross-referenced against recorded revocations and its expiration timestamp.',
  },
  {
    icon: Link2,
    title: 'Ledger Anchor Proof',
    tag: 'Immutable Timestamp',
    detail:
      'The document hash is verified against the transaction anchored to the blockchain ledger when the credential was originally issued.',
  },
];

const LIFECYCLE = [
  {
    step: '01',
    title: 'Institution confers & signs document',
    detail:
      'An authorized issuer generates a cryptographic signing key and mints a credential envelope. The payload is canonicalized and hashed.',
  },
  {
    step: '02',
    title: 'Content hash anchored to the ledger',
    detail:
      'The cryptographic hash is immutably anchored in a blockchain transaction, guaranteeing existence independent of the issuing server.',
  },
  {
    step: '03',
    title: 'Holder presents for instant proof',
    detail:
      'The holder retains the digital certificate file. Any third party can independently verify authenticity without contacting the institution.',
  },
];

const ROLES = [
  {
    icon: Wallet,
    role: 'Credential Holder',
    detail:
      'Store claimed credentials in a personal wallet, configure selective disclosure, and download official copies for employment or education.',
    link: '#/wallet',
    actionText: 'View wallet',
  },
  {
    icon: Building2,
    role: 'Issuing Institution',
    detail:
      'Register universities and authorities, manage digital signing seals, mint verifiable degrees, and record revocations.',
    link: '#/issuer',
    actionText: 'Issuer studio',
  },
  {
    icon: ShieldAlert,
    role: 'Registry Administrator',
    detail:
      'Authorize accredited issuing bodies, supervise identity governance, and inspect the registry-wide audit trail.',
    link: '#/admin',
    actionText: 'Admin console',
  },
];

const ASSURANCES = [
  { icon: Lock, label: 'Ed25519 Signatures' },
  { icon: Link2, label: 'Immutable Ledger Anchors' },
  { icon: Fingerprint, label: 'Zero-Knowledge Selective Disclosure' },
  { icon: ShieldCheck, label: 'Instant Revocation Verification' },
];

const SAMPLE_MODAL_CREDENTIAL = {
  title: 'Bachelor of Science in Computer Science & Artificial Intelligence',
  type: 'Degree',
  credentialNumber: 'MIT-BSC-2026-CS8941',
  issuerName: 'Massachusetts Institute of Technology',
  issuerDomain: 'mit.edu',
  recipientName: 'Alex Mercer',
  claims: {
    department: 'Electrical Engineering and Computer Science',
    major: 'Computer Science & Cryptography',
    gpa: '3.96 / 4.00',
    honors: 'Summa Cum Laude',
  },
  issuedAt: '2026-05-28T10:00:00Z',
  txHash: '0x7e8b91a23c4d5f6e708192a3b4c5d6e7f8091a2b3c4d5e6f7a8b9c0d1e2f3a4b',
  blockNumber: 18492103,
  status: 'VERIFIED',
};

function workspaceFor(user) {
  if (user.role === 'ADMIN') return '#/admin';
  if (user.role === 'ISSUER') return '#/issuer';
  return '#/wallet';
}

export function Landing() {
  const { user } = useAuth();
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  return (
    <div className="landing animate-fade-in">
      <section className="masthead">
        {/* Left Column: Mission, CTAs, and Assurances */}
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--space-3)' }}>
            <span className="badge badge--info">
              <ShieldCheck size={13} aria-hidden="true" />
              <span>W3C Verifiable Credentials Standard</span>
            </span>
          </div>

          <h1 className="masthead__title">
            Verifiable digital credentials, anchored to the ledger.
          </h1>

          <p className="masthead__lede">
            Issue, hold, and verify tamper-evident academic and professional credentials.
            Every document is cryptographically signed with Ed25519 and anchored to an
            immutable blockchain ledger &mdash; verifiable by anyone without asking the institution.
          </p>

          <div className="masthead__actions">
            <a className="btn btn-primary btn-lg" href="#/verify">
              <FileCheck size={18} aria-hidden="true" />
              <span>Verify a credential</span>
              <ArrowRight size={16} aria-hidden="true" />
            </a>

            {user ? (
              <a className="btn btn-secondary btn-lg" href={workspaceFor(user)}>
                <span>Open your workspace</span>
                <ArrowRight size={15} aria-hidden="true" />
              </a>
            ) : (
              <a className="btn btn-secondary btn-lg" href="#/login">
                <span>Sign in to workspace</span>
              </a>
            )}
          </div>

          {/* Cryptographic Assurances Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 'var(--space-3)',
              marginTop: 'var(--space-6)',
              paddingTop: 'var(--space-5)',
              borderTop: '1px solid var(--line)',
            }}
          >
            {ASSURANCES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--ink-secondary)',
                }}
              >
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--surface-sunken)',
                    border: '1px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent)',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={12} aria-hidden="true" />
                </span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Live Interactive Credential Inspection Card */}
        <div
          className="card card--flush"
          style={{
            boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.06)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--surface)',
          }}
        >
          {/* Card Top: Institution branding & live status */}
          <div
            style={{
              padding: '14px 18px',
              background: 'var(--surface-sunken)',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="icon-tile" style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)' }}>
                <Building2 size={15} />
              </span>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', display: 'block', lineHeight: 1.2 }}>
                  Massachusetts Institute of Technology
                </span>
                <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>mit.edu &bull; Accredited Issuer</span>
              </div>
            </div>
            <span className="badge badge--ok" style={{ fontSize: '11px' }}>
              <span className="badge-dot" />
              <span>VERIFIED ON-CHAIN</span>
            </span>
          </div>

          {/* Card Body: Credential details */}
          <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-muted)', fontWeight: 600 }}>
                Conferred Academic Degree
              </span>
              <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink)', marginTop: '2px', lineHeight: 1.3 }}>
                Bachelor of Science in Computer Science & Artificial Intelligence
              </h3>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '10px',
                padding: '12px 14px',
                backgroundColor: 'var(--surface-sunken)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--line)',
                marginBottom: '16px',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: 'var(--ink-muted)', display: 'block' }}>Candidate</span>
                <strong style={{ fontSize: '13px', color: 'var(--ink)' }}>Alex Mercer</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--ink-muted)', display: 'block' }}>Honors</span>
                <strong style={{ fontSize: '13px', color: 'var(--ok)' }}>Summa Cum Laude</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--ink-muted)', display: 'block' }}>Certificate #</span>
                <code className="font-mono tabular-nums" style={{ fontSize: '11.5px', color: 'var(--accent)', wordBreak: 'break-all' }}>
                  MIT-BSC-2026-CS8941
                </code>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--ink-muted)', display: 'block' }}>Ledger Anchor</span>
                <span className="font-mono tabular-nums" style={{ fontSize: '11.5px', color: 'var(--ink)' }}>
                  Block #18,492,103
                </span>
              </div>
            </div>

            {/* Verification checklist pills */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--ink-secondary)' }}>
                <ShieldCheck size={15} style={{ color: 'var(--ok)', flexShrink: 0 }} />
                <span>Ed25519 digital signature verified against registered key</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--ink-secondary)' }}>
                <ShieldCheck size={15} style={{ color: 'var(--ok)', flexShrink: 0 }} />
                <span>SHA-256 canonical digest matches immutable ledger anchor</span>
              </div>
            </div>

            {/* Actions: View Diploma Modal or Test in Verifier */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ flex: '1 1 160px', minHeight: '38px' }}
                onClick={() => setPreviewModalOpen(true)}
              >
                <Award size={14} aria-hidden="true" />
                <span>Inspect Official Diploma</span>
              </button>
              <a
                href="#/verify"
                className="btn btn-outline btn-sm"
                style={{ flex: '1 1 120px', minHeight: '38px', justifyContent: 'center' }}
              >
                <span>Launch Verifier</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Diploma Modal Preview */}
      {previewModalOpen && (
        <CertificateDiplomaModal
          credential={SAMPLE_MODAL_CREDENTIAL}
          issuerName={SAMPLE_MODAL_CREDENTIAL.issuerName}
          issuerDomain={SAMPLE_MODAL_CREDENTIAL.issuerDomain}
          onClose={() => setPreviewModalOpen(false)}
        />
      )}

      <section className="landing__split">
        <div className="card card--flush">
          <div className="card__header">
            <div>
              <h2 className="section-title">What a verification checks</h2>
              <p className="section-note" style={{ marginTop: '0.125rem' }}>
                Three-layer cryptographic validation pipeline
              </p>
            </div>
          </div>

          <ul className="checklist">
            {CHECKS.map(({ icon: Icon, title, tag, detail }) => (
              <li key={title} className="checklist__item">
                <span className="checklist__icon" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius)' }}>
                  <Icon size={16} aria-hidden="true" style={{ color: 'var(--accent)' }} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <p className="checklist__title">{title}</p>
                    <span className="badge badge--neutral" style={{ fontSize: '0.6875rem' }}>{tag}</span>
                  </div>
                  <p className="checklist__detail">{detail}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="card__footer">
            <a className="btn btn-primary" href="#/verify">
              <FileCheck size={16} aria-hidden="true" />
              <span>Launch Verifier</span>
            </a>
          </div>
        </div>

        <div className="card card--flush" style={{ padding: 'var(--space-5)' }}>
          <h2 className="section-title landing__block-title" style={{ marginBottom: 'var(--space-4)' }}>
            Credential Lifecycle
          </h2>

          <ol className="lifecycle" style={{ margin: 0 }}>
            {LIFECYCLE.map(({ step, title, detail }) => (
              <li key={step} className="lifecycle__item" style={{ position: 'relative' }}>
                <span
                  className="lifecycle__step"
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--surface-sunken)',
                    border: '1px solid var(--line-strong)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    color: 'var(--ink)',
                  }}
                >
                  {step}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p className="lifecycle__title" style={{ fontWeight: 600 }}>{title}</p>
                  <p className="lifecycle__detail">{detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="landing__roles">
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <h2 className="section-title">Who uses the registry</h2>
          <p className="section-note">
            Built for universities, students, credential holders, and authorized administrators.
          </p>
        </div>

        <ul className="roles" style={{ margin: 0, padding: 0 }}>
          {ROLES.map(({ icon: Icon, role, detail, link, actionText }) => (
            <li key={role} className="card card--interactive" style={{ padding: 'var(--space-5)', listStyle: 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 'var(--space-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span className="icon-tile" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <div>
                    <h3 className="roles__name" style={{ fontSize: 'var(--text-md)', margin: 0 }}>{role}</h3>
                  </div>
                </div>

                <p className="roles__detail" style={{ flex: 1, margin: 0, lineHeight: 1.55 }}>
                  {detail}
                </p>

                <div style={{ marginTop: 'auto', paddingTop: 'var(--space-2)' }}>
                  <a
                    href={user ? workspaceFor(user) : link}
                    className="btn btn-outline btn-sm"
                    style={{ width: '100%', justifyContent: 'space-between' }}
                  >
                    <span>{actionText}</span>
                    <ArrowRight size={13} aria-hidden="true" />
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
