'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { UploadServicePoint, AssetSubItem } from '@/types';
import { filterUploadPoints } from '@/lib/map-utils';

/* ─── Status config ─── */
const STATUS_OPTIONS = [
  { value: 'normal_use', label: 'ใช้งานได้ปกติ', color: 'bg-emerald-500' },
  { value: 'damaged', label: 'ชำรุด', color: 'bg-red-500' },
  { value: 'deteriorated', label: 'เสื่อมสภาพ', color: 'bg-amber-500' },
  { value: 'not_found', label: 'ไม่พบ', color: 'bg-gray-500' },
  { value: 'request_disposal', label: 'ขอจำหน่าย', color: 'bg-purple-500' },
] as const;

/* ─── Sub-component: Service Point Card ─── */
function PointCard({
  point,
  onExpand,
  isExpanded,
  onToggleStatus,
}: {
  point: UploadServicePoint;
  onExpand: (assetId: string) => void;
  isExpanded: boolean;
  onToggleStatus: (point: UploadServicePoint) => void;
}) {
  const [toggling, setToggling] = useState(false);
  const isUploaded = point.uploadStatus === 'uploaded';

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setToggling(true);
    try {
      await onToggleStatus(point);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div
      onClick={() => onExpand(point.assetId)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onExpand(point.assetId); }}
      className={`w-full text-left clay-card overflow-hidden transition-all cursor-pointer ${
        isExpanded ? 'ring-1 ring-primary' : 'hover:shadow-md'
      } ${isUploaded ? 'opacity-60' : ''}`}
    >
      <div className="flex">
        {/* Left accent stripe */}
        <div className={`w-1 shrink-0 ${
          isUploaded
            ? 'bg-emerald-500'
            : point.uploadStatus === 'partial'
            ? 'bg-amber-500'
            : 'bg-gray-300 dark:bg-gray-600'
        }`} />

        <div className="flex-1 min-w-0 p-3">
          {/* Row 1: Asset ID + status */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono text-[var(--muted-foreground)]">
              {point.assetId}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {isUploaded ? (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  เสร็จแล้ว
                </span>
              ) : point.uploadStatus === 'partial' ? (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">บางส่วน</span>
              ) : (
                <span className="text-[10px] text-[var(--muted-foreground)]">รอดำเนินการ</span>
              )}
              <svg
                className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Row 2: Service name */}
          <p className="text-sm font-medium mt-0.5 truncate">{point.serviceName}</p>

          {/* Row 3: Location + toggle */}
          <div className="flex items-center justify-between mt-1 gap-2">
            <p className="text-[11px] text-[var(--muted-foreground)] truncate">
              {point.village} {point.district}
              {point.pointCount > 1 && (
                <span className="ml-1 text-blue-600 dark:text-blue-400">({point.pointCount} จุด)</span>
              )}
            </p>
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium border transition-colors ${
                isUploaded
                  ? 'border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/20'
                  : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20'
              } ${toggling ? 'opacity-50' : ''}`}
              title={isUploaded ? 'เปลี่ยนเป็นรอดำเนินการ' : 'ทำเครื่องหมายว่าอัปโหลดแล้ว'}
            >
              {toggling ? '...' : isUploaded ? 'ยกเลิก' : 'เสร็จแล้ว'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-component: Photo Slot (single photo upload area) ─── */
function PhotoSlot({
  label,
  placeholder,
  preview,
  existingImage,
  onFileSelect,
  onDelete,
}: {
  label: string;
  placeholder: string;
  preview: string | null;
  existingImage: string | null;
  onFileSelect: (file: File) => void;
  onDelete: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasImage = preview || existingImage;

  const openPicker = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    e.target.value = '';
  };

  return (
    <div>
      <h4 className="text-xs font-semibold mb-1">{label}</h4>
      <button
        type="button"
        onClick={openPicker}
        className="w-full h-28 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 active:bg-primary/10 transition-colors overflow-hidden relative"
      >
        {preview ? (
          <img src={preview} alt={label} className="w-full h-full object-cover" />
        ) : existingImage ? (
          <>
            <img src={existingImage} alt={label} className="w-full h-full object-cover opacity-70" />
            <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded">มีรูปแล้ว</span>
          </>
        ) : (
          <>
            <svg className="w-6 h-6 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[10px] text-[var(--muted-foreground)] mt-1">{placeholder}</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
      {hasImage && (
        <div className="flex gap-1 mt-1">
          <button
            type="button"
            onClick={openPicker}
            className="flex-1 text-center text-[10px] py-1.5 rounded bg-primary/10 text-primary font-medium active:bg-primary/20"
          >
            เปลี่ยนรูป
          </button>
          {preview && (
            <button
              type="button"
              onClick={onDelete}
              className="text-[10px] px-2 py-1.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 font-medium active:bg-red-500/20"
            >
              ลบ
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Sub-component: Step-by-step Upload Wizard ─── */
function UploadForm({
  point,
  onComplete,
}: {
  point: UploadServicePoint;
  onComplete: () => void;
}) {
  const [subAssets, setSubAssets] = useState<AssetSubItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState('normal_use');
  const [reason, setReason] = useState('');

  // Per-step state
  const [stepEquipFiles, setStepEquipFiles] = useState<(File | null)[]>([]);
  const [stepEquipPreviews, setStepEquipPreviews] = useState<(string | null)[]>([]);
  const [stepOverallFiles, setStepOverallFiles] = useState<(File | null)[]>([]);
  const [stepOverallPreviews, setStepOverallPreviews] = useState<(string | null)[]>([]);
  const [stepResults, setStepResults] = useState<('pending' | 'uploading' | 'success' | 'failed')[]>([]);

  // Existing images from server
  const [existingEquipImages, setExistingEquipImages] = useState<(string | null)[]>([]);
  const [existingOverallImages, setExistingOverallImages] = useState<(string | null)[]>([]);

  const [uploading, setUploading] = useState(false);
  const [allDone, setAllDone] = useState(false);

  // Fetch sub-assets then load existing images
  useEffect(() => {
    setLoading(true);
    fetch(`/api/upload/sub-assets?asset_id=${point.assetId}`)
      .then((r) => r.json())
      .then(async (data) => {
        const items: AssetSubItem[] = data.items || [];
        setSubAssets(items);
        setStepEquipFiles(new Array(items.length).fill(null));
        setStepEquipPreviews(new Array(items.length).fill(null));
        setStepOverallFiles(new Array(items.length).fill(null));
        setStepOverallPreviews(new Array(items.length).fill(null));
        setStepResults(new Array(items.length).fill('pending'));

        // Batch-fetch existing images in a single request (much faster than N individual calls)
        const equipImgs: (string | null)[] = new Array(items.length).fill(null);
        const overallImgs: (string | null)[] = new Array(items.length).fill(null);
        try {
          const ids = items.map((item) => item.id).join(',');
          const r = await fetch(`/api/upload/images?item_ids=${ids}`);
          if (r.ok) {
            const batch = await r.json();
            items.forEach((item, i) => {
              const img = batch[String(item.id)];
              if (img) {
                if (img.equipImageUrl) equipImgs[i] = img.equipImageUrl;
                if (img.overallImageUrl) overallImgs[i] = img.overallImageUrl;
              }
            });
          }
        } catch { /* ignore — existing images are non-critical */ }
        setExistingEquipImages([...equipImgs]);
        setExistingOverallImages([...overallImgs]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [point.assetId]);

  const currentItem = subAssets[currentStep];
  const completedCount = stepResults.filter((r) => r === 'success').length;

  // Use a ref to always have the latest stepResults without stale closures
  const stepResultsRef = useRef(stepResults);
  stepResultsRef.current = stepResults;

  const handleUploadStep = useCallback(async () => {
    const equipFile = stepEquipFiles[currentStep];
    const overallFile = stepOverallFiles[currentStep];
    if (!equipFile || !overallFile) return;

    setUploading(true);
    setStepResults((prev) => { const n = [...prev]; n[currentStep] = 'uploading'; return n; });

    // Check if this will be the last item (use ref for fresh data)
    const latestResults = [...stepResultsRef.current];
    latestResults[currentStep] = 'success'; // optimistic
    const willBeComplete = latestResults.every((r) => r === 'success');

    const formData = new FormData();
    formData.append('servicePointIds', JSON.stringify(point.ids));
    formData.append('itemIds', JSON.stringify([currentItem.id]));
    formData.append('status', status);
    formData.append('reason', reason);
    formData.append('equipImage', equipFile);
    formData.append('overallImage', overallFile);
    if (willBeComplete) formData.append('isComplete', 'true');

    try {
      const r = await fetch('/api/upload/submit', { method: 'POST', body: formData });
      const data = await r.json();
      const success = data.results?.[0]?.success ?? false;

      // Update results via functional setter and capture the new array
      let newResults: typeof stepResults = [];
      setStepResults((prev) => {
        newResults = [...prev];
        newResults[currentStep] = success ? 'success' : 'failed';
        return newResults;
      });

      // Auto-advance to next pending step
      if (success) {
        const nextPending = subAssets.findIndex((_, i) => i > currentStep && newResults[i] !== 'success');
        if (nextPending >= 0) {
          setCurrentStep(nextPending);
        } else if (newResults.every((r) => r === 'success')) {
          setAllDone(true);
          onComplete();
        }
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setStepResults((prev) => { const n = [...prev]; n[currentStep] = 'failed'; return n; });
    } finally {
      setUploading(false);
    }
  }, [currentStep, stepEquipFiles, stepOverallFiles, status, reason, point.ids, currentItem, subAssets, onComplete]);

  if (loading) {
    return (
      <div className="clay-card p-6 animate-pulse space-y-3">
        <div className="h-4 bg-muted/50 rounded w-1/3" />
        <div className="h-4 bg-muted/50 rounded w-2/3" />
        <div className="h-4 bg-muted/50 rounded w-1/2" />
      </div>
    );
  }

  if (allDone) {
    return (
      <div className="clay-card p-6 text-center space-y-3">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          อัปโหลดครบทั้ง {subAssets.length} รายการ
        </p>
      </div>
    );
  }

  return (
    <div className="clay-card p-3 space-y-2.5 max-w-lg">
      {/* Progress dots */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--muted-foreground)]">
            รายการที่ {currentStep + 1} / {subAssets.length}
          </span>
          <span className="text-xs text-emerald-600 font-medium">
            {completedCount > 0 && `สำเร็จ ${completedCount}/${subAssets.length}`}
          </span>
        </div>
        <div className="flex gap-1">
          {subAssets.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`flex-1 h-2 rounded-full transition-all ${
                stepResults[i] === 'success'
                  ? 'bg-emerald-500'
                  : stepResults[i] === 'failed'
                  ? 'bg-red-500'
                  : stepResults[i] === 'uploading'
                  ? 'bg-amber-500 animate-pulse'
                  : i === currentStep
                  ? 'bg-primary'
                  : 'bg-[var(--muted)]/40'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Current item info */}
      <div className={`p-3 rounded-lg border transition-colors ${
        stepResults[currentStep] === 'success'
          ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20'
          : stepResults[currentStep] === 'failed'
          ? 'border-red-300 bg-red-50 dark:bg-red-900/20'
          : 'border-border bg-[var(--muted)]/10'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">{currentItem?.assetDesc}</p>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              Sub Asset: {currentItem?.subAssetId}
              {currentItem?.statusKey && (
                <span className="ml-2 text-emerald-600 font-medium">{currentItem.derivedStatus}</span>
              )}
            </p>
          </div>
          {stepResults[currentStep] === 'success' && (
            <span className="text-emerald-600 text-xs font-bold">สำเร็จ</span>
          )}
          {stepResults[currentStep] === 'failed' && (
            <span className="text-red-600 text-xs font-bold">ล้มเหลว</span>
          )}
        </div>
      </div>

      {/* Status selection */}
      <div>
        <h4 className="text-xs font-semibold mb-1.5">สถานะ</h4>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatus(opt.value)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                status === opt.value
                  ? `${opt.color} text-white`
                  : 'bg-[var(--muted)]/30 text-[var(--foreground)] hover:bg-[var(--muted)]/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reason */}
      <div>
        <h4 className="text-xs font-semibold mb-1.5">สาเหตุ/เหตุผล (ถ้ามี)</h4>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="พิมพ์รายละเอียด..."
          className="w-full max-w-md px-3 py-2 rounded-lg border border-border bg-[var(--muted)]/10 text-sm placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Photo uploads for current step */}
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <PhotoSlot
          key={`equip-${currentStep}`}
          label="ภาพอุปกรณ์ (ใกล้)"
          placeholder="ถ่ายรูปอุปกรณ์นี้"
          preview={stepEquipPreviews[currentStep]}
          existingImage={existingEquipImages[currentStep]}
          onFileSelect={(file) => {
            const url = URL.createObjectURL(file);
            setStepEquipFiles((prev) => { const n = [...prev]; n[currentStep] = file; return n; });
            setStepEquipPreviews((prev) => { const n = [...prev]; n[currentStep] = url; return n; });
          }}
          onDelete={() => {
            setStepEquipFiles((p) => { const n = [...p]; n[currentStep] = null; return n; });
            setStepEquipPreviews((p) => { const n = [...p]; n[currentStep] = null; return n; });
          }}
        />
        <PhotoSlot
          key={`overall-${currentStep}`}
          label="ภาพโดยรวม (ไกล)"
          placeholder="ถ่ายภาพโดยรวม"
          preview={stepOverallPreviews[currentStep]}
          existingImage={existingOverallImages[currentStep]}
          onFileSelect={(file) => {
            const url = URL.createObjectURL(file);
            setStepOverallFiles((prev) => { const n = [...prev]; n[currentStep] = file; return n; });
            setStepOverallPreviews((prev) => { const n = [...prev]; n[currentStep] = url; return n; });
          }}
          onDelete={() => {
            setStepOverallFiles((p) => { const n = [...p]; n[currentStep] = null; return n; });
            setStepOverallPreviews((p) => { const n = [...p]; n[currentStep] = null; return n; });
          }}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          disabled={currentStep === 0 || uploading}
          className="px-4 py-2.5 rounded-xl text-sm font-medium border border-border text-[var(--foreground)] hover:bg-[var(--muted)]/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ย้อนกลับ
        </button>
        <button
          onClick={handleUploadStep}
          disabled={uploading || !stepEquipFiles[currentStep] || !stepOverallFiles[currentStep] || stepResults[currentStep] === 'success'}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2 ${
            stepResults[currentStep] === 'success'
              ? 'bg-emerald-500 cursor-default'
              : 'bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          {uploading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              กำลังอัปโหลด...
            </>
          ) : stepResults[currentStep] === 'success' ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              อัปโหลดแล้ว
            </>
          ) : stepResults[currentStep] === 'failed' ? (
            'ลองอีกครั้ง'
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              อัปโหลด แล้วไปรายการถัดไป
            </>
          )}
        </button>
      </div>

      {/* Skip / nav to specific step */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            const next = subAssets.findIndex((_, i) => i > currentStep && stepResults[i] !== 'success');
            if (next >= 0) setCurrentStep(next);
          }}
          disabled={uploading}
          className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          ข้ามรายการนี้ &rarr;
        </button>
        <span className="text-[10px] text-[var(--muted-foreground)]">
          {completedCount}/{subAssets.length} เสร็จแล้ว
        </span>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function PhotoUpload() {
  const [points, setPoints] = useState<UploadServicePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'uploaded'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const fetchPoints = useCallback(async () => {
    try {
      const r = await fetch('/api/upload/pending');
      const data = await r.json();
      if (!Array.isArray(data)) { setPoints([]); return; }
      setPoints(data.map((p: Record<string, unknown>) => ({
        ids: p.ids as number[],
        assetId: p.asset_id as string,
        oAssetId: (p.o_asset_id as string) || null,
        serviceName: p.service_name as string,
        village: p.village as string | null,
        district: p.district as string | null,
        province: p.province as string,
        uploadStatus: p.upload_status as string | null,
        uploadedAt: p.uploaded_at as string | null,
        inspectedAt: p.inspected_at as string | null,
        pointCount: (p.point_count as number) || 1,
      })));
    } catch (err) {
      console.error('Failed to fetch points:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPoints(); }, [fetchPoints]);

  const handleToggleStatus = useCallback(async (point: UploadServicePoint) => {
    const res = await fetch('/api/upload/toggle-status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: point.ids }),
    });
    if (!res.ok) throw new Error('Toggle failed');
    const data = await res.json();
    setPoints((prev) =>
      prev.map((p) =>
        p.assetId === point.assetId
          ? { ...p, uploadStatus: data.upload_status, uploadedAt: data.uploaded_at }
          : p
      )
    );
  }, []);

  const filteredPoints = useMemo(() => filterUploadPoints(points, filter), [points, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredPoints.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedPoints = filteredPoints.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );

  const pendingCards = useMemo(() => points.filter((p) => p.uploadStatus === 'pending' || p.uploadStatus === 'partial').length, [points]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="clay-card p-4 animate-pulse">
            <div className="h-4 bg-muted/50 rounded w-1/3 mb-2" />
            <div className="h-3 bg-muted/50 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="clay-card p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">อัปโหลดรูปภาพ</h2>
            <p className="text-xs text-[var(--muted-foreground)]">
              {pendingCards > 0 ? `${pendingCards} รอดำเนินการ` : 'ไม่มีรายการรอ'}
            </p>
          </div>
          <div className="flex gap-0.5 bg-[var(--muted)]/20 rounded-md p-0.5 flex-shrink-0">
            {(['all', 'pending', 'uploaded'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setCurrentPage(1); }}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  filter === f
                    ? 'bg-[var(--foreground)]/10 text-[var(--foreground)]'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                {f === 'all' ? 'ทั้งหมด' : f === 'pending' ? 'รอดำเนินการ' : 'เสร็จแล้ว'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Points list */}
      {filteredPoints.length === 0 ? (
        <div className="clay-card p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-[var(--muted-foreground)] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-[var(--muted-foreground)]">
            {filter === 'pending' ? 'ไม่มีรายการรอดำเนินการ' : filter === 'uploaded' ? 'ยังไม่มีรายการที่อัปโหลดแล้ว' : 'ไม่มีรายการ — ตรวจจุดบริการก่อนเพื่อเริ่มอัปโหลด'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginatedPoints.map((point) => (
              <div key={point.assetId}>
                <PointCard
                  point={point}
                  onExpand={(assetId) => setExpandedId(expandedId === assetId ? null : assetId)}
                  isExpanded={expandedId === point.assetId}
                  onToggleStatus={handleToggleStatus}
                />
                {expandedId === point.assetId && (
                  <div className="mt-2 ml-2">
                    <UploadForm point={point} onComplete={fetchPoints} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                {(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredPoints.length)} / {filteredPoints.length}
              </p>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="p-1.5 rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous page"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-6 h-6 rounded text-[11px] font-medium transition-colors ${
                      page === safeCurrentPage
                        ? 'bg-[var(--foreground)]/10 text-[var(--foreground)]'
                        : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="p-1.5 rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next page"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
