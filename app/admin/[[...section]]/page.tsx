import { PortalPage } from "@/lib/server/portal-page";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Super Admin",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  return PortalPage({
    portal: "admin",
    segments: (await params).section || [],
  });
}
