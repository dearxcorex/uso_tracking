import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhotoUpload from './PhotoUpload';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

const mockPendingPoints = [
  {
    ids: [1],
    asset_id: 'AST-001',
    o_asset_id: 'O-001',
    service_name: 'Wi-Fi โรงเรียน',
    village: 'บ้านทดสอบ',
    district: 'เมือง',
    province: 'ชัยภูมิ',
    upload_status: 'pending',
    uploaded_at: null,
    inspected_at: '2026-03-01',
    point_count: 1,
  },
];

const mockSubAssets = {
  items: [
    { id: 101, subAssetId: 'SUB-001', assetDesc: 'Router', statusKey: null, derivedStatus: null },
    { id: 102, subAssetId: 'SUB-002', assetDesc: 'Switch', statusKey: null, derivedStatus: null },
  ],
};

function createMockFile(name: string): File {
  return new File(['fake-image-data'], name, { type: 'image/jpeg' });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('/api/upload/pending')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPendingPoints) });
    }
    if (url.includes('/api/upload/sub-assets')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSubAssets) });
    }
    if (url.includes('/api/upload/submit')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [{ success: true }] }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
});

describe('PhotoUpload', () => {
  it('should render the upload header', async () => {
    render(<PhotoUpload />);
    await waitFor(() => {
      expect(screen.getByText('อัปโหลดรูปภาพ')).toBeInTheDocument();
    });
  });

  it('should load and display pending points', async () => {
    render(<PhotoUpload />);
    await waitFor(() => {
      expect(screen.getByText('AST-001')).toBeInTheDocument();
    });
  });

  it('should expand upload form when clicking a point card', async () => {
    const user = userEvent.setup();
    render(<PhotoUpload />);

    await waitFor(() => {
      expect(screen.getByText('AST-001')).toBeInTheDocument();
    });

    await user.click(screen.getByText('AST-001'));

    await waitFor(() => {
      expect(screen.getByText('รายการที่ 1 / 2')).toBeInTheDocument();
    });
  });
});

describe('PhotoUpload - file input reset bug', () => {
  it('should reset file input value after selecting a file so onChange fires again', async () => {
    const user = userEvent.setup();
    render(<PhotoUpload />);

    // Wait for points to load
    await waitFor(() => {
      expect(screen.getByText('AST-001')).toBeInTheDocument();
    });

    // Expand the card
    await user.click(screen.getByText('AST-001'));

    await waitFor(() => {
      expect(screen.getByText('รายการที่ 1 / 2')).toBeInTheDocument();
    });

    // Find hidden file inputs
    const fileInputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
    expect(fileInputs.length).toBe(2);

    const equipInput = fileInputs[0];
    const overallInput = fileInputs[1];

    // Upload files to step 1
    const equipFile = createMockFile('equip1.jpg');
    const overallFile = createMockFile('overall1.jpg');

    await user.upload(equipInput, equipFile);
    await user.upload(overallInput, overallFile);

    // After selecting a file, the input value should be cleared (the bug fix)
    // This ensures onChange will fire even if user picks the same file next time
    expect(equipInput.value).toBe('');
    expect(overallInput.value).toBe('');
  });

  it('should show preview images after selecting files', async () => {
    const user = userEvent.setup();
    render(<PhotoUpload />);

    await waitFor(() => {
      expect(screen.getByText('AST-001')).toBeInTheDocument();
    });

    await user.click(screen.getByText('AST-001'));

    await waitFor(() => {
      expect(screen.getByText('รายการที่ 1 / 2')).toBeInTheDocument();
    });

    const fileInputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
    const equipFile = createMockFile('equip.jpg');

    await user.upload(fileInputs[0], equipFile);

    // Preview image should appear
    await waitFor(() => {
      const img = screen.getByAltText('Equipment');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'blob:mock-url');
    });
  });
});
