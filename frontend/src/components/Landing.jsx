import React from 'react';
import {
  ShieldCheck,
  FileCheck,
  Link2,
  Lock,
  Wallet,
  Building2,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/* What the verifier actually does, in the order it does it. This is the
   page's reason to exist: an employer asking "how do I know this is
   real" gets a concrete answer, not a slogan. */
const CHECKS = [
  {
    icon: Lock,
    title: 'Signature',
    detail:
      'The issuer’s Ed25519 public key is re-derived and the signature over the canonical document is recomputed.',
  },
  {
    icon: ShieldCheck,
    title: 'Standing',
    detail:
      'The credential number is checked against recorded revocations and its expiry date.',
  },
  {
    icon: Link2,
    title: 'Ledger anchor',
    detail:
      'The document hash is matched against the transaction anchored when the credential was issued.',
  },
];

const LIFECYCLE = [
  {
    step: '01',
    title: 'An institution signs a credential',
    detail:
      'A verified issuer generates a signing key and issues a document. The content is canonicalised and hashed.',
  },
  {
    step: '02',
    title: 'The hash is anchored to the ledger',
    detail:
      'The hash is written in a transaction, so the record exists independently of the issuer.',
  },
  {
    step: '03',
    title: 'A holder presents the file',
    detail:
      'The holder keeps the signed file. Anyone can verify it without contacting the issuer.',
  },
];

const ROLES = [
  {
    icon: Wallet,
    role: 'Holder',
    detail:
      'Claims issued credentials into a wallet, inspects them, and downloads an official copy.',
  },
  {
    icon: Building2,
    role: 'Issuer',
    detail:
      'Registers an institution, manages signing keys, issues credentials and records revocations.',
  },
  {
    icon: ShieldAlert,
    role: 'Administrator',
    detail:
      'Approves institutions, and reviews the registry-wide verification audit trail.',
  },
];

function workspaceFor(user) {
  if (user.role === 'ADMIN') return '#/admin';
  if (user.role === 'ISSUER') return '#/issuer';
  return '#/wallet';
}

export function Landing() {
  const { user } = useAuth();

  return (
    <div className="landing">
      <section className="masthead">
        <p className="eyebrow">Verifiable credential registry</p>
        <h1 className="masthead__title">CertiChain</h1>
        <p className="masthead__lede">
          Issue, hold and verify tamper-evident digital credentials. Every
          document is signed by its issuer and anchored to a ledger, so it
          can be checked by anyone without asking the institution.
        </p>

        <div className="masthead__actions">
          <a className="btn btn-primary btn-lg" href="#/verify">
            <FileCheck size={17} aria-hidden="true" />
            <span>Verify a credential</span>
            <ArrowRight size={16} aria-hidden="true" />
          </a>

          {user ? (
            <a className="btn btn-secondary btn-lg" href={workspaceFor(user)}>
              <span>Open your workspace</span>
            </a>
          ) : (
            <a className="btn btn-secondary btn-lg" href="#/login">
              <span>Sign in</span>
            </a>
          )}
        </div>
      </section>

      <section className="landing__split">
        <div className="card">
          <div className="card__header">
            <h2 className="section-title">What a verification checks</h2>
          </div>

          <ul className="checklist">
            {CHECKS.map(({ icon: Icon, title, detail }) => (
              <li key={title} className="checklist__item">
                <span className="checklist__icon">
                  <Icon size={15} aria-hidden="true" />
                </span>
                <div>
                  <p className="checklist__title">{title}</p>
                  <p className="checklist__detail">{detail}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="card__footer">
            <a className="btn btn-primary" href="#/verify">
              <FileCheck size={16} aria-hidden="true" />
              <span>Open the verifier</span>
            </a>
          </div>
        </div>

        <div>
          <h2 className="section-title landing__block-title">
            Credential lifecycle
          </h2>

          <ol className="lifecycle">
            {LIFECYCLE.map(({ step, title, detail }) => (
              <li key={step} className="lifecycle__item">
                <span className="lifecycle__step">{step}</span>
                <div>
                  <p className="lifecycle__title">{title}</p>
                  <p className="lifecycle__detail">{detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="landing__roles">
        <h2 className="section-title">Who uses the registry</h2>

        <ul className="roles">
          {ROLES.map(({ icon: Icon, role, detail }) => (
            <li key={role} className="roles__item">
              <span className="roles__icon">
                <Icon size={16} aria-hidden="true" />
              </span>
              <div>
                <p className="roles__name">{role}</p>
                <p className="roles__detail">{detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
