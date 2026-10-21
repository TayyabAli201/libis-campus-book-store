import { Login } from "@/components/portal";
import { getSettings } from "@/lib/server/catalog";

export const metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default async function Page() {
  let storeName = "Campus Bookstore";
  let logoUrl: string | null = null;
  try {
    const { settings } = await getSettings();
    if (settings?.store_name) storeName = settings.store_name;
    if (settings?.logo_url) logoUrl = settings.logo_url;
  } catch {}
  return <Login portal="admin" storeName={storeName} logoUrl={logoUrl} />;
}
