import { Store } from "@/components/store";
import { getStoreInitialData } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return {
    title: "Checkout",
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutPage() {
  let initial;
  try {
    initial = await getStoreInitialData();
  } catch {}
  return <Store mode="checkout" initial={initial} />;
}
