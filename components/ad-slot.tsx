"use client";

import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

interface AdSlotProps {
  slotId?: string;
  format?: "auto" | "rectangle" | "horizontal" | "vertical";
  responsive?: boolean;
  style?: CSSProperties;
  className?: string;
}

const DISALLOWED_PATHS = [
  "/cart",
  "/checkout",
  "/orders",
  "/track",
  "/admin",
  "/campus",
  "/vendor",
];

export function AdSlot({
  slotId,
  format = "auto",
  responsive = true,
  style,
  className,
}: AdSlotProps) {
  const pathname = usePathname();
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

  // Render nothing unless NEXT_PUBLIC_ADSENSE_CLIENT is set
  if (!client) return null;

  // Never render on checkout, cart, orders, track, or staff portals
  if (
    pathname &&
    DISALLOWED_PATHS.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
    )
  ) {
    return null;
  }

  return (
    <aside
      className={`ad-slot-container ${className || ""}`}
      style={{
        margin: "16px auto",
        textAlign: "center",
        maxWidth: "100%",
        overflow: "hidden",
        ...style,
      }}
      aria-label="Advertisement"
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block", ...style }}
        data-ad-client={client}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </aside>
  );
}
