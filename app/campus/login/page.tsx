import { Login } from "@/components/portal";
import { getSettings } from "@/lib/server/catalog";

export const metadata = {
  title: "Campus sign in",
  robots: { index: false, follow: false },
};

export default async function Page() {
  let storeName = "Campus Bookstore";
  try {
    const { settings } = await getSettings();
    if (settings?.store_name) storeName = settings.store_name;
  } catch {}
  return <Login portal="campus" storeName={storeName} />;
}
