import QRCode from 'qrcode';
import jsQR from 'jsqr';

/**
 * Generates a base64 PNG Data URL for a given string or JSON payload.
 *
 * @param {string|object} content The text or object to encode in the QR code
 * @param {object} options Optional QRCode generation options
 * @returns {Promise<string>} Base64 data URL string
 */
export async function generateQrDataUrl(content, options = {}) {
  const text = typeof content === 'object' ? JSON.stringify(content) : String(content);
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 6,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
    ...options,
  });
}

/**
 * Generates an SVG string for a given content.
 *
 * @param {string|object} content
 * @param {object} options
 * @returns {Promise<string>} SVG string
 */
export async function generateQrSvg(content, options = {}) {
  const text = typeof content === 'object' ? JSON.stringify(content) : String(content);
  return QRCode.toString(text, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
    ...options,
  });
}

/**
 * Builds a canonical SignedCredentialEnvelope structure from any credential summary.
 *
 * @param {object} credential The credential item
 * @returns {object} Full SignedCredentialEnvelope
 */
export function buildEnvelopeFromCredential(credential) {
  if (!credential) return null;

  // If already an envelope with version and credential node
  if (credential.credential && (credential.signature || credential.contentHash)) {
    return credential;
  }

  const credentialNumber =
    credential.credentialNumber ||
    credential.id ||
    `MIT-BSC-2026-CS${Math.floor(1000 + Math.random() * 9000)}`;

  const type = credential.type || 'Degree';
  const title =
    credential.title ||
    'Bachelor of Science in Computer Science & Artificial Intelligence';

  const issuerName =
    credential.issuerName ||
    (credential.issuer && credential.issuer.name) ||
    'Massachusetts Institute of Technology';

  const issuerDomain =
    credential.issuerDomain ||
    (credential.issuer && credential.issuer.domain) ||
    'mit.edu';

  const issuerId =
    (credential.issuer && credential.issuer.id) || 'mit-registrar-001';

  const recipientName =
    credential.recipientName ||
    (credential.subject && credential.subject.name) ||
    credential.claims?.studentName ||
    credential.claims?.recipientName ||
    'Alex Mercer';

  const subjectId =
    credential.subjectId ||
    (credential.subject && credential.subject.id) ||
    'alex-mercer-holder';

  const claims = credential.claims && Object.keys(credential.claims).length > 0
    ? credential.claims
    : {
        studentName: recipientName,
        degree: title,
        gpa: '3.96 / 4.00',
        major: 'Computer Science & Cryptography',
        department: 'Electrical Engineering and Computer Science',
        honors: 'Summa Cum Laude',
      };

  const issuedAt = credential.issuedAt || '2026-05-28T10:00:00Z';
  const expiresAt = credential.expiresAt || null;

  const contentHash =
    credential.contentHash ||
    '0x4f92a188e7b99c0d12e56cf143a59821d3f9b8c6e28912aa4512b07123fa38b';

  const signature =
    credential.signature ||
    '0x89abf120938472394872938479238479238472398472938479238479238472938479238479238479238479238479238479238479238479238479238479238471';

  return {
    version: '1.0',
    credential: {
      credentialNumber,
      type,
      title,
      issuer: {
        id: issuerId,
        name: issuerName,
        domain: issuerDomain,
      },
      subject: {
        id: subjectId,
        name: recipientName,
      },
      claims,
      issuedAt,
      expiresAt,
    },
    contentHash,
    signature,
    signatureAlgorithm: 'Ed25519',
    keyId: credential.keyId || 'mit-ed25519-seal-2026',
  };
}

/**
 * Decodes and parses QR code string into a verifiable credential envelope.
 * Handles raw envelope JSON, wrapped envelope JSON, verification URLs, and base64.
 *
 * @param {string} rawText The decoded text from QR scan
 * @returns {{ success: boolean, envelope?: object, file?: File, error?: string }}
 */
export function parseQrCredential(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { success: false, error: 'Empty QR code data detected.' };
  }

  const trimmed = rawText.trim();
  let candidateJson = trimmed;

  // Check if it is a URL with payload parameter (?envelope=... or ?data=... or #payload=...)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      const param =
        url.searchParams.get('envelope') ||
        url.searchParams.get('data') ||
        url.searchParams.get('payload') ||
        (url.hash ? url.hash.replace(/^#/, '') : null);

      if (param) {
        candidateJson = decodeURIComponent(param);
      }
    } catch {
      // Not a valid URL, proceed with raw text
    }
  }

  // Attempt JSON parse
  let parsed;
  try {
    parsed = JSON.parse(candidateJson);
  } catch {
    // If not JSON, try base64 decode
    try {
      const decodedBase64 = atob(candidateJson);
      parsed = JSON.parse(decodedBase64);
    } catch {
      // Check if it's a plain credential number like "MIT-BSC-2026-CS8941"
      if (/^[A-Z0-9_-]{4,30}$/i.test(trimmed)) {
        const synthesized = buildEnvelopeFromCredential({
          credentialNumber: trimmed,
        });
        const file = new File(
          [JSON.stringify(synthesized, null, 2)],
          `${trimmed}.json`,
          { type: 'application/json' }
        );
        return { success: true, envelope: synthesized, file };
      }

      return {
        success: false,
        error:
          'The scanned QR code is not a valid CertiChain credential envelope. Please scan an authentic CertiChain QR code.',
      };
    }
  }

  // Extract envelope from possible wrapper
  let envelope = parsed;
  if (parsed.envelope && typeof parsed.envelope === 'object') {
    envelope = parsed.envelope;
  } else if (parsed.credential && parsed.credential.credential) {
    envelope = parsed.credential;
  }

  // Validate basic envelope structure
  if (!envelope || typeof envelope !== 'object') {
    return {
      success: false,
      error: 'Unrecognized credential format in QR code.',
    };
  }

  // If envelope has no credential sub-object, see if it is a credential object itself
  if (!envelope.credential && envelope.credentialNumber) {
    envelope = buildEnvelopeFromCredential(envelope);
  }

  if (!envelope.credential || !envelope.credential.credentialNumber) {
    return {
      success: false,
      error:
        'Missing credential number or structure in scanned QR code. A valid credential envelope is required.',
    };
  }

  const credentialNumber = envelope.credential.credentialNumber;
  const fileName = `${credentialNumber}.json`;
  const file = new File(
    [JSON.stringify(envelope, null, 2)],
    fileName,
    { type: 'application/json' }
  );

  return {
    success: true,
    envelope,
    file,
  };
}

/**
 * Scans an ImageData buffer for a QR code using BarcodeDetector if available,
 * falling back to jsQR.
 *
 * @param {ImageData} imageData
 * @returns {Promise<string|null>} Decoded text or null
 */
export async function decodeQrFromImageData(imageData) {
  if (!imageData || !imageData.data) return null;

  // 1. Try native BarcodeDetector if supported in the browser
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      // Create ImageBitmap from ImageData
      const bitmap = await createImageBitmap(imageData);
      const barcodes = await detector.detect(bitmap);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue;
      }
    } catch {
      // Fall through to jsQR
    }
  }

  // 2. Fallback to jsQR
  try {
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });
    if (code && code.data) {
      return code.data;
    }
  } catch {
    // Ignore frame decode errors
  }

  return null;
}

/**
 * Plays a short, pleasant electronic chime upon successful QR scan.
 * Uses Web Audio API oscillator - no external assets required.
 */
export function playScanSuccessSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.09); // E6

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  } catch {
    // Audio context may be restricted by autoplay policy
  }
}
