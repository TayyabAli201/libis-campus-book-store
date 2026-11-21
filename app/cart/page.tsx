import { Store } from "@/components/store";
import { getStoreInitialData } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return {
    title: "Cart",
    robots: { index: false, follow: false },
  };
}

export default async function CartPage() {
  let initial;
  try {
    initial = await getStoreInitialData();
  } catch {}
  return <Store mode="cart" initial={initial} />;
}
