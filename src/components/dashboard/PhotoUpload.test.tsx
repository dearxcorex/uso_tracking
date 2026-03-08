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

describe('PhotoUpload - toggle status button', () => {
  it('should show "เสร็จแล้ว" button on pending cards', async () => {
    render(<PhotoUpload />);
    await waitFor(() => {
      expect(screen.getByText('AST-001')).toBeInTheDocument();
    });
    expect(screen.getByTitle('ทำเครื่องหมายว่าอัปโหลดแล้ว')).toBeInTheDocument();
  });

  it('should show "ยกเลิก" button on uploaded cards', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/upload/pending')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{
            ...mockPendingPoints[0],
            upload_status: 'uploaded',
            uploaded_at: '2026-03-08T12:00:00Z',
          }]),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<PhotoUpload />);
    await waitFor(() => {
      expect(screen.getByText('AST-001')).toBeInTheDocument();
    });
    expect(screen.getByTitle('เปลี่ยนเป็นรอดำเนินการ')).toBeInTheDocument();
  });

  it('should toggle pending → uploaded when clicking toggle button', async () => {
    const user = userEvent.setup();
    render(<PhotoUpload />);

    await waitFor(() => {
      expect(screen.getByText('AST-001')).toBeInTheDocument();
    });

    // Status should be pending (appears in filter tab + card, just verify at least one exists)
    expect(screen.getAllByText('รอดำเนินการ').length).toBeGreaterThanOrEqual(1);

    // Mock toggle API
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (url.includes('/api/upload/toggle-status') && opts?.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ upload_status: 'uploaded', uploaded_at: '2026-03-08T12:00:00Z' }),
        });
      }
      if (url.includes('/api/upload/pending')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPendingPoints) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    // Click the toggle button (not the status text)
    const toggleBtn = screen.getByTitle('ทำเครื่องหมายว่าอัปโหลดแล้ว');
    await user.click(toggleBtn);

    await waitFor(() => {
      expect(screen.getByTitle('เปลี่ยนเป็นรอดำเนินการ')).toBeInTheDocument();
    });
  });

  it('should send correct payload to toggle API', async () => {
    const user = userEvent.setup();
    render(<PhotoUpload />);

    await waitFor(() => {
      expect(screen.getByText('AST-001')).toBeInTheDocument();
    });

    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (url.includes('/api/upload/toggle-status')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ upload_status: 'uploaded', uploaded_at: '2026-03-08T12:00:00Z' }),
        });
      }
      if (url.includes('/api/upload/pending')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPendingPoints) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const toggleBtn = screen.getByTitle('ทำเครื่องหมายว่าอัปโหลดแล้ว');
    await user.click(toggleBtn);

    await waitFor(() => {
      const toggleCall = mockFetch.mock.calls.find(
        (c: [string, RequestInit?]) => typeof c[0] === 'string' && c[0].includes('toggle-status')
      );
      expect(toggleCall).toBeDefined();
      const body = JSON.parse(toggleCall![1]?.body as string);
      expect(body.ids).toEqual([1]);
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
      const img = screen.getByAltText('ภาพอุปกรณ์ (ใกล้)');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'blob:mock-url');
    });
  });
});

describe('PhotoUpload - image replace and delete', () => {
  it('should show เปลี่ยนรูป and ลบ buttons after selecting a file', async () => {
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
    await user.upload(fileInputs[0], createMockFile('equip.jpg'));

    await waitFor(() => {
      expect(screen.getByAltText('ภาพอุปกรณ์ (ใกล้)')).toBeInTheDocument();
    });

    // เปลี่ยนรูป and ลบ buttons should appear
    const replaceButtons = screen.getAllByText('เปลี่ยนรูป');
    expect(replaceButtons.length).toBeGreaterThanOrEqual(1);
    const deleteButtons = screen.getAllByText('ลบ');
    expect(deleteButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('should clear preview when clicking ลบ button', async () => {
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
    await user.upload(fileInputs[0], createMockFile('equip.jpg'));

    // Verify preview appears
    await waitFor(() => {
      expect(screen.getByAltText('ภาพอุปกรณ์ (ใกล้)')).toBeInTheDocument();
    });

    // Click ลบ to clear
    const deleteBtn = screen.getAllByText('ลบ')[0];
    await user.click(deleteBtn);

    // Preview should be gone, placeholder should return
    await waitFor(() => {
      expect(screen.getByText('ถ่ายรูปอุปกรณ์นี้')).toBeInTheDocument();
    });
  });

  it('should open file picker when clicking เปลี่ยนรูป button', async () => {
    const user = userEvent.setup();
    render(<PhotoUpload />);

    await waitFor(() => {
      expect(screen.getByText('AST-001')).toBeInTheDocument();
    });

    await user.click(screen.getByText('AST-001'));

    await waitFor(() => {
      expect(screen.getByText('รายการที่ 1 / 2')).toBeInTheDocument();
    });

    // Upload a file first
    const fileInputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
    await user.upload(fileInputs[0], createMockFile('equip.jpg'));

    await waitFor(() => {
      expect(screen.getByAltText('ภาพอุปกรณ์ (ใกล้)')).toBeInTheDocument();
    });

    // Spy on input click
    const input = document.querySelectorAll<HTMLInputElement>('input[type="file"]')[0];
    const clickSpy = vi.spyOn(input, 'click');

    // Click เปลี่ยนรูป
    const replaceBtn = screen.getAllByText('เปลี่ยนรูป')[0];
    await user.click(replaceBtn);

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('should open file picker when clicking the photo area', async () => {
    const user = userEvent.setup();
    render(<PhotoUpload />);

    await waitFor(() => {
      expect(screen.getByText('AST-001')).toBeInTheDocument();
    });

    await user.click(screen.getByText('AST-001'));

    await waitFor(() => {
      expect(screen.getByText('รายการที่ 1 / 2')).toBeInTheDocument();
    });

    // Spy on first file input click
    const input = document.querySelectorAll<HTMLInputElement>('input[type="file"]')[0];
    const clickSpy = vi.spyOn(input, 'click');

    // Click the photo area button (contains placeholder text)
    const photoArea = screen.getByText('ถ่ายรูปอุปกรณ์นี้').closest('button');
    expect(photoArea).not.toBeNull();
    await user.click(photoArea!);

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });
});
