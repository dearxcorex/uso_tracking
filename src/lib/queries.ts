import { prisma } from '@/lib/prisma';
import { compareSites } from '@/lib/points';
import type { VisitSite } from '@/types';

export async function getSites(): Promise<VisitSite[]> {
  const rows = await prisma.visit_plan.findMany();

  return rows
    .map((r) => ({
      id: r.id,
      round: r.round,
      department: r.department,
      deptSeq: r.dept_seq,
      serviceType: r.service_type,
      serviceName: r.service_name,
      villageCode: r.village_code,
      village: r.village,
      subdistrict: r.subdistrict,
      district: r.district,
      province: r.province,
      installLocation: r.install_location,
      provider: r.provider,
      latitude: r.latitude,
      longitude: r.longitude,
      project: r.project,
      phone: r.phone,
      phoneSource: r.phone_source,
      inspected: r.inspected,
      inspectedAt: r.inspected_at?.toISOString() ?? null,
    }))
    .sort(compareSites);
}
