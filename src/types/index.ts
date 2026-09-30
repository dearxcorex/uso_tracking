export type ActiveTab = 'dashboard' | 'points' | 'map';

/** One planned visit site from the visit_plan table (round x department x site) */
export interface VisitSite {
  id: number;
  round: string;
  department: string;
  deptSeq: number | null;
  serviceType: string | null;
  serviceName: string;
  villageCode: string | null;
  village: string | null;
  subdistrict: string | null;
  district: string | null;
  province: string | null;
  installLocation: string | null;
  provider: string | null;
  latitude: number | null;
  longitude: number | null;
  project: string | null;
  phone: string | null;
  phoneSource: string | null;
  inspected: boolean;
  inspectedAt: string | null;
}

export interface VisitStats {
  total: number;
  missingCoords: number;
  schools: number;
  schoolsWithPhone: number;
  inspected: number;
  byRound: Record<string, number>;
  byDepartment: Record<string, number>;
  /** department -> service name -> count */
  byDepartmentService: Record<string, Record<string, number>>;
  byServiceName: Record<string, number>;
  byDistrict: Record<string, number>;
  byProvider: Record<string, number>;
}
