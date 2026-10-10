import { PortalPage } from "@/lib/server/portal-page";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Campus Portal",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  return PortalPage({
    portal: "campus",
    segments: (await params).section || [],
  });
}
