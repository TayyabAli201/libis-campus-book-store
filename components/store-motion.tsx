"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function StoreMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = matchMedia("(pointer: fine)");
    let frame = 0;
    let tiltFrame = 0;
    let activeCard: HTMLElement | null = null;
    const seen = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
      },
      { threshold: 0.08, rootMargin: "0px 0px -25px 0px" },
    );
    const discover = () => {
      el.querySelectorAll<HTMLElement>(
        ".section-top, .book-card, .steps > div, .course-links a, .about-band > div, .contact-band, .section > .eyebrow, .section > h2, .cart-row, .checkout-grid > .panel:not(.summary), .order-list-row, .prose-page section, .static-card-3d, .detail-facts",
      ).forEach((item) => {
        if (seen.has(item)) return;
        seen.add(item);
        if (
          preference.matches ||
          item.getBoundingClientRect().top < innerHeight - 20
        )
          return;
        item.classList.add("motion-reveal");
        const siblings = item.parentElement
          ? [...item.parentElement.children]
          : [];
        item.style.setProperty(
          "--reveal-delay",
          `${Math.max(0, siblings.indexOf(item) % 4) * 65}ms`,
        );
        observer.observe(item);
      });
    };
    discover();
    const mutations = new MutationObserver(discover);
    mutations.observe(el, { childList: true, subtree: true });
    const resetCard = () => {
      if (!activeCard) return;
      activeCard.style.removeProperty("--tilt-x");
      activeCard.style.removeProperty("--tilt-y");
      activeCard.style.removeProperty("--shine-x");
      activeCard.style.removeProperty("--shine-y");
      activeCard = null;
    };
    const onMove = (event: PointerEvent) => {
      if (preference.matches || !finePointer.matches) return;
      const target = (event.target as HTMLElement).closest<HTMLElement>(
        ".book-card, .course-links a, .benefits > div",
      );
      if (target !== activeCard) resetCard();
      if (!target) return;
      activeCard = target;
      cancelAnimationFrame(tiltFrame);
      tiltFrame = requestAnimationFrame(() => {
        if (activeCard !== target) return;
        const bounds = target.getBoundingClientRect();
        const x = Math.max(
          0,
          Math.min(1, (event.clientX - bounds.left) / bounds.width),
        );
        const y = Math.max(
          0,
          Math.min(1, (event.clientY - bounds.top) / bounds.height),
        );
        target.style.setProperty("--tilt-x", `${(0.5 - y) * 4}deg`);
        target.style.setProperty("--tilt-y", `${(x - 0.5) * 5}deg`);
        target.style.setProperty("--shine-x", `${x * 100}%`);
        target.style.setProperty("--shine-y", `${y * 100}%`);
      });
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const total = document.documentElement.scrollHeight - innerHeight;
        el.style.setProperty(
          "--scroll-progress",
          String(total > 0 ? scrollY / total : 0),
        );
        el.classList.toggle("page-scrolled", scrollY > 30);
      });
    };
    const onPreferenceChange = () => {
      if (preference.matches) {
        resetCard();
        el.querySelectorAll(".motion-reveal").forEach((item) =>
          item.classList.add("is-revealed"),
        );
      }
    };
    onScroll();
    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", resetCard);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    preference.addEventListener("change", onPreferenceChange);
    return () => {
      observer.disconnect();
      mutations.disconnect();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(tiltFrame);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", resetCard);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      preference.removeEventListener("change", onPreferenceChange);
    };
  }, []);
  return (
    <div className="storefront" ref={root}>
      <div className="reading-progress" aria-hidden="true" />
      {children}
    </div>
  );
}
