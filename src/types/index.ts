export type ActiveTab = 'dashboard' | 'map' | 'upload';

export interface AssetSubItem {
  id: number;
  assetId: string;
  subAssetId: string;
  oAssetId: string;
  assetDesc: string;
  refDoc: string;
  locationText: string;
  statusKey: string | null;
  derivedStatus: string | null;
}

export interface UploadServicePoint {
  ids: number[];
  assetId: string;
  oAssetId: string | null;
  serviceName: string;
  village: string | null;
  district: string | null;
  province: string;
  uploadStatus: string | null;
  uploadedAt: string | null;
  inspectedAt: string | null;
  pointCount: number;
}

export interface MapServicePoint {
  id: number;
  assetId: string | null;
  oAssetId: string | null;
  serviceName: string;
  village: string | null;
  subdistrict: string | null;
  district: string | null;
  province: string;
  provider: string;
  latitude: number;
  longitude: number;
  zone: string | null;
  installLocation: string | null;
  contractNumber: string | null;
  inspected: boolean;
}

export interface USOStats {
  totalPoints: number;
  byZone: Record<string, number>;
  byServiceName: Record<string, number>;
  byDistrict: Record<string, number>;
  byDistrictInspected: Record<string, number>;
  byProvider: Record<string, number>;
}
