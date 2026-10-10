import { Store } from "@/components/store";
import { getSettings } from "@/lib/server/catalog";
import { all } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return {
    title: "Track Order | Campus Bookstore",
    description: "Track your course materials order status in real time.",
  };
}

export default async function TrackPage() {
  let data;
  try {
    const [{ settings }, campuses, prices] = await Promise.all([
      getSettings(),
      all<any>("SELECT id,name,city FROM campuses WHERE active=1"),
      all<any>("SELECT id,rate FROM pricing_categories ORDER BY id"),
    ]);
    data = { settings, books: [], campuses, prices };
  } catch {}
  return <Store mode="track" initial={data} />;
}
