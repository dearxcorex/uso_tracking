import Dashboard from '@/components/Dashboard';
import { getSites } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const sites = await getSites();

  return <Dashboard points={sites} />;
}
