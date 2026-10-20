import { Store } from "@/components/store";
import { Suspense } from "react";
import { Loading } from "@/components/shared";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="section" style={{ minHeight: "50vh", display: "grid", placeItems: "center" }}>
          <Loading />
        </div>
      }
    >
      <Store mode="home" />
    </Suspense>
  );
}
