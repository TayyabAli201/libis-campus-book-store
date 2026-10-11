import { Store } from "@/components/store";
import { catalog, getSettings } from "@/lib/server/catalog";
import { all } from "@/lib/server/db";
export const dynamic = "force-dynamic";
export default async function Home() {
  let data;
  try {
    const [{ settings }, books, campuses, prices] = await Promise.all([
      getSettings(),
      catalog(),
      all<any>("SELECT id,name,city FROM campuses WHERE active=1"),
      all<any>("SELECT id,rate,binding_rate FROM pricing_categories ORDER BY id"),
    ]);
    data = { settings, books, campuses, prices };
  } catch {}
  return <Store initial={data} />;
}
