import { prisma } from '@/lib/prisma';
import { USOStats, MapServicePoint } from '@/types';
import Dashboard from '@/components/Dashboard';

export const dynamic = 'force-dynamic';

async function getStats(): Promise<USOStats> {
  const totalPoints = await prisma.uso_service_point.count();

  const byZoneRaw = await prisma.uso_service_point.groupBy({
    by: ['zone'],
    _count: { id: true },
  });
  const byZone: Record<string, number> = {};
  for (const row of byZoneRaw) {
    if (row.zone) byZone[row.zone] = row._count.id;
  }

  const byServiceNameRaw = await prisma.uso_service_point.groupBy({
    by: ['service_name'],
    _count: { id: true },
  });
  const byServiceName: Record<string, number> = {};
  for (const row of byServiceNameRaw) {
    byServiceName[row.service_name] = row._count.id;
  }

  const byDistrictRaw = await prisma.uso_service_point.groupBy({
    by: ['district'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });
  const byDistrict: Record<string, number> = {};
  for (const row of byDistrictRaw) {
    if (row.district) byDistrict[row.district] = row._count.id;
  }

  const byDistrictInspectedRaw = await prisma.uso_service_point.groupBy({
    by: ['district'],
    where: { inspected: true },
    _count: { id: true },
  });
  const byDistrictInspected: Record<string, number> = {};
  for (const row of byDistrictInspectedRaw) {
    if (row.district) byDistrictInspected[row.district] = row._count.id;
  }

  const byProviderRaw = await prisma.uso_service_point.groupBy({
    by: ['provider'],
    _count: { id: true },
  });
  const byProvider: Record<string, number> = {};
  for (const row of byProviderRaw) {
    byProvider[row.provider] = row._count.id;
  }

  return { totalPoints, byZone, byServiceName, byDistrict, byDistrictInspected, byProvider };
}

async function getMapPoints(): Promise<MapServicePoint[]> {
  const data = await prisma.uso_service_point.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
    },
    select: {
      id: true,
      service_name: true,
      village: true,
      subdistrict: true,
      district: true,
      province: true,
      provider: true,
      latitude: true,
      longitude: true,
      zone: true,
      install_location: true,
      contract_number: true,
      inspected: true,
    },
    orderBy: { id: 'asc' },
  });

  return data.map((p) => ({
    id: p.id,
    serviceName: p.service_name,
    village: p.village,
    subdistrict: p.subdistrict,
    district: p.district,
    province: p.province,
    provider: p.provider,
    latitude: p.latitude!,
    longitude: p.longitude!,
    zone: p.zone,
    installLocation: p.install_location,
    contractNumber: p.contract_number,
    inspected: p.inspected,
  }));
}

export default async function Home() {
  const [stats, initialMapPoints] = await Promise.all([
    getStats(),
    getMapPoints(),
  ]);

  return <Dashboard stats={stats} initialMapPoints={initialMapPoints} />;
}
