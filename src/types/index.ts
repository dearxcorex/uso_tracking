export type ActiveTab = 'dashboard' | 'map';

// USO Service Point types
export type USOZone = 'USO Zone C' | 'USO Zone C+';
export type ServiceName = 'Wi-Fi หมู่บ้าน' | 'Mobile' | 'Wi-Fi โรงเรียน' | 'อาคาร USO Net' | 'ห้อง USO Wrap' | 'Wi-Fi รพ.สต.';

export interface MapServicePoint {
  id: number;
  assetId: string | null;
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
