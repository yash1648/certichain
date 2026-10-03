import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PublicVerifierView } from './PublicVerifierView';
import { BatchVerifierView } from './BatchVerifierView';
import { BatchDropZone } from './BatchDropZone';
import { verifierService } from '../../services/verifierService';

vi.mock('../../services/verifierService', () => ({
  verifierService: {
    verifyCredentialFile: vi.fn(),
    verifyBatch: vi.fn(),
    exportBatchCsv: vi.fn(),
    lookupAnchor: vi.fn(),
    listVerificationHistory: vi.fn(),
  },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    accessToken: 'mock-token',
    user: { id: 'u1', email: 'test@verifier.org', role: 'VERIFIER' },
  }),
}));

function renderWithAuth(ui) {
  return render(ui);
}

const mockBatchResponse = {
  batchId: 'batch-test-uuid-1234',
  total: 4,
  processed: 4,
  valid: 2,
  tampered: 1,
  revoked: 1,
  expired: 0,
  notFound: 0,
  unavailable: 0,
  failed: 0,
  durationMs: 340,
  results: [
    {
      fileName: 'cred-1.json',
      credentialNumber: 'MIT-BSC-2026-001',
      recipientName: 'Alice Mercer',
      issuerName: 'Massachusetts Institute of Technology',
      status: 'VALID',
      valid: true,
      checks: {
        envelopeStructure: true,
        schemaConformance: true,
        issuerSignature: true,
        onChainAnchor: true,
        revocationStatus: true,
        ipfsIntegrity: true,
      },
      result: {
        valid: true,
        status: 'VALID',
        credentialNumber: 'MIT-BSC-2026-001',
        issuerName: 'Massachusetts Institute of Technology',
        issuerDomain: 'mit.edu',
        reason: 'Cryptographic signature is valid',
        claims: { studentName: 'Alice Mercer', degree: 'Computer Science' },
        issuedAt: '2026-01-01T00:00:00Z',
        anchorTxHash: '0x1111111111111111',
        anchorBlockNumber: 500,
        anchorChainId: 31337,
        anchorVerified: true,
      },
      errorMessage: null,
    },
    {
      fileName: 'cred-2.json',
      credentialNumber: 'MIT-BSC-2026-002',
      recipientName: 'Bob Smith',
      issuerName: 'Massachusetts Institute of Technology',
      status: 'VALID',
      valid: true,
      checks: {
        envelopeStructure: true,
        schemaConformance: true,
        issuerSignature: true,
        onChainAnchor: true,
        revocationStatus: true,
        ipfsIntegrity: true,
      },
      result: {
        valid: true,
        status: 'VALID',
        credentialNumber: 'MIT-BSC-2026-002',
        issuerName: 'Massachusetts Institute of Technology',
        issuerDomain: 'mit.edu',
        reason: 'Cryptographic signature is valid',
        claims: { studentName: 'Bob Smith' },
        issuedAt: '2026-01-01T00:00:00Z',
      },
      errorMessage: null,
    },
    {
      fileName: 'cred-tampered.json',
      credentialNumber: 'MIT-BSC-2026-003',
      recipientName: 'Charlie Brown',
      issuerName: 'Massachusetts Institute of Technology',
      status: 'TAMPERED',
      valid: false,
      checks: {
        envelopeStructure: true,
        schemaConformance: false,
        issuerSignature: false,
        onChainAnchor: false,
        revocationStatus: true,
        ipfsIntegrity: false,
      },
      result: null,
      errorMessage: 'Content hash mismatch',
    },
    {
      fileName: 'cred-revoked.json',
      credentialNumber: 'MIT-BSC-2026-004',
      recipientName: 'Diana Prince',
      issuerName: 'Massachusetts Institute of Technology',
      status: 'REVOKED',
      valid: false,
      checks: {
        envelopeStructure: true,
        schemaConformance: true,
        issuerSignature: true,
        onChainAnchor: true,
        revocationStatus: false,
        ipfsIntegrity: true,
      },
      result: null,
      errorMessage: 'Credential revoked by issuer',
    },
  ],
};

describe('Batch Verification UI Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows selecting Batch Verification mode on the PublicVerifierView', async () => {
    renderWithAuth(<PublicVerifierView />);

    expect(screen.getByRole('tab', { name: /single verification/i })).toBeDefined();
    const batchTab = screen.getByRole('tab', { name: /batch verification/i });
    expect(batchTab).toBeDefined();

    fireEvent.click(batchTab);

    expect(batchTab.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText(/drop credential files or zip archive here/i)).toBeDefined();
  });

  it('DropZone handles selecting JSON files and displays file list with remove option', async () => {
    const handleStart = vi.fn();
    renderWithAuth(<BatchDropZone onStartVerification={handleStart} />);

    const input = screen.getByTestId('batch-verify-file-input');
    const file1 = new File(['{}'], 'cert1.json', { type: 'application/json' });
    const file2 = new File(['{}'], 'cert2.json', { type: 'application/json' });

    fireEvent.change(input, { target: { files: [file1, file2] } });

    expect(screen.getByText(/2 files selected/i)).toBeDefined();
    expect(screen.getByText('cert1.json')).toBeDefined();
    expect(screen.getByText('cert2.json')).toBeDefined();

    // Remove file 1
    const removeButtons = screen.getAllByTitle(/remove/i);
    fireEvent.click(removeButtons[0]);

    expect(screen.queryByText('cert1.json')).toBeNull();
    expect(screen.getByText('cert2.json')).toBeDefined();
    expect(screen.getByText(/1 file selected/i)).toBeDefined();
  });

  it('DropZone rejects unsupported file types with validation error', async () => {
    renderWithAuth(<BatchDropZone onStartVerification={vi.fn()} />);

    const input = screen.getByTestId('batch-verify-file-input');
    const exeFile = new File(['bin'], 'hack.exe', { type: 'application/octet-stream' });

    fireEvent.change(input, { target: { files: [exeFile] } });

    expect(screen.getByText(/unsupported file type: "hack.exe"/i)).toBeDefined();
  });

  it('Executes batch verification and displays results dashboard with summary counts', async () => {
    verifierService.verifyBatch.mockResolvedValueOnce(mockBatchResponse);

    renderWithAuth(<BatchVerifierView />);

    const input = screen.getByTestId('batch-verify-file-input');
    const file = new File(['{}'], 'credentials.zip', { type: 'application/zip' });
    fireEvent.change(input, { target: { files: [file] } });

    const verifyButton = screen.getByRole('button', { name: /verify 1 credential/i });
    fireEvent.click(verifyButton);

    await waitFor(() => {
      expect(screen.getByText(/batch verification results/i)).toBeDefined();
    });

    expect(screen.getByText(/batch-test-uuid-1234/)).toBeDefined();
    // Summary metrics
    expect(screen.getByText('Alice Mercer')).toBeDefined();
    expect(screen.getByText('Bob Smith')).toBeDefined();
    expect(screen.getByText('Charlie Brown')).toBeDefined();
    expect(screen.getByText('Diana Prince')).toBeDefined();
  });

  it('Filters batch results by status', async () => {
    verifierService.verifyBatch.mockResolvedValueOnce(mockBatchResponse);
    renderWithAuth(<BatchVerifierView />);

    const input = screen.getByTestId('batch-verify-file-input');
    fireEvent.change(input, { target: { files: [new File(['{}'], 'test.json')] } });
    fireEvent.click(screen.getByRole('button', { name: /verify/i }));

    await waitFor(() => {
      expect(screen.getByText('Alice Mercer')).toBeDefined();
    });

    // Filter by Tampered
    const tamperedFilterBtn = screen.getByRole('button', { name: /tampered/i });
    fireEvent.click(tamperedFilterBtn);

    expect(screen.getByText('Charlie Brown')).toBeDefined();
    expect(screen.queryByText('Alice Mercer')).toBeNull();
    expect(screen.queryByText('Bob Smith')).toBeNull();
  });

  it('Searches batch results client-side by query', async () => {
    verifierService.verifyBatch.mockResolvedValueOnce(mockBatchResponse);
    renderWithAuth(<BatchVerifierView />);

    const input = screen.getByTestId('batch-verify-file-input');
    fireEvent.change(input, { target: { files: [new File(['{}'], 'test.json')] } });
    fireEvent.click(screen.getByRole('button', { name: /verify/i }));

    await waitFor(() => {
      expect(screen.getByText('Alice Mercer')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/search file, recipient/i);
    fireEvent.change(searchInput, { target: { value: 'Diana' } });

    expect(screen.getByText('Diana Prince')).toBeDefined();
    expect(screen.queryByText('Alice Mercer')).toBeNull();
  });

  it('Opens detail modal when Details button is clicked', async () => {
    verifierService.verifyBatch.mockResolvedValueOnce(mockBatchResponse);
    renderWithAuth(<BatchVerifierView />);

    const input = screen.getByTestId('batch-verify-file-input');
    fireEvent.change(input, { target: { files: [new File(['{}'], 'test.json')] } });
    fireEvent.click(screen.getByRole('button', { name: /verify/i }));

    await waitFor(() => {
      expect(screen.getByText('Alice Mercer')).toBeDefined();
    });

    const detailButtons = screen.getAllByRole('button', { name: /details/i });
    fireEvent.click(detailButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Envelope Structure')).toBeDefined();
      expect(screen.getByText('Ed25519 Issuer Signature')).toBeDefined();
      expect(screen.getByText('Certificate #MIT-BSC-2026-001')).toBeDefined();
    });
  });

  it('Handles batch verification error gracefully', async () => {
    verifierService.verifyBatch.mockRejectedValueOnce(new Error('Batch verification rejected by security policy'));
    renderWithAuth(<BatchVerifierView />);

    const input = screen.getByTestId('batch-verify-file-input');
    fireEvent.change(input, { target: { files: [new File(['{}'], 'bad.json')] } });
    fireEvent.click(screen.getByRole('button', { name: /verify/i }));

    await waitFor(() => {
      expect(screen.getByText(/batch verification rejected by security policy/i)).toBeDefined();
    });
  });

  it('Exports CSV report on button click', async () => {
    verifierService.verifyBatch.mockResolvedValueOnce(mockBatchResponse);
    const mockBlob = new Blob(['sample-csv'], { type: 'text/csv' });
    verifierService.exportBatchCsv.mockResolvedValueOnce(mockBlob);

    // Mock URL.createObjectURL and revokeObjectURL
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/test-csv');
    window.URL.revokeObjectURL = vi.fn();

    renderWithAuth(<BatchVerifierView />);

    const input = screen.getByTestId('batch-verify-file-input');
    fireEvent.change(input, { target: { files: [new File(['{}'], 'test.json')] } });
    fireEvent.click(screen.getByRole('button', { name: /verify/i }));

    await waitFor(() => {
      expect(screen.getByText(/download csv report/i)).toBeDefined();
    });

    const csvButton = screen.getByRole('button', { name: /download csv report/i });
    fireEvent.click(csvButton);

    await waitFor(() => {
      expect(verifierService.exportBatchCsv).toHaveBeenCalledWith(mockBatchResponse);
    });
  });

  it('Renders empty filtered state when search finds no matches', async () => {
    verifierService.verifyBatch.mockResolvedValueOnce(mockBatchResponse);
    renderWithAuth(<BatchVerifierView />);

    const input = screen.getByTestId('batch-verify-file-input');
    fireEvent.change(input, { target: { files: [new File(['{}'], 'test.json')] } });
    fireEvent.click(screen.getByRole('button', { name: /verify/i }));

    await waitFor(() => {
      expect(screen.getByText('Alice Mercer')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/search file, recipient/i);
    fireEvent.change(searchInput, { target: { value: 'NonExistentPerson' } });

    expect(screen.getByText(/no credentials match the current filter and search criteria/i)).toBeDefined();
  });

  it('Triggers sample batch verification when "Try sample batch" is clicked', async () => {
    verifierService.verifyBatch.mockResolvedValueOnce(mockBatchResponse);
    renderWithAuth(<BatchVerifierView />);

    const sampleBtn = screen.getByRole('button', { name: /try sample batch/i });
    expect(sampleBtn).toBeDefined();

    fireEvent.click(sampleBtn);

    await waitFor(() => {
      expect(verifierService.verifyBatch).toHaveBeenCalled();
    });
  });

  it('Supports verifying with multiple separate JSON files in batch', async () => {
    verifierService.verifyBatch.mockResolvedValueOnce(mockBatchResponse);
    renderWithAuth(<BatchVerifierView />);

    const input = screen.getByTestId('batch-verify-file-input');
    const f1 = new File(['{"c":1}'], 'cred-1.json', { type: 'application/json' });
    const f2 = new File(['{"c":2}'], 'cred-2.json', { type: 'application/json' });
    fireEvent.change(input, { target: { files: [f1, f2] } });

    expect(screen.getByText(/2 files selected/i)).toBeDefined();

    const verifyBtn = screen.getByRole('button', { name: /verify 2 credentials/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(verifierService.verifyBatch).toHaveBeenCalled();
    });
  });
});
