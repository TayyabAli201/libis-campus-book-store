import { PortalPage } from "@/lib/server/portal-page";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Vendor Portal",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  return PortalPage({
    portal: "vendor",
    segments: (await params).section || [],
  });
}
