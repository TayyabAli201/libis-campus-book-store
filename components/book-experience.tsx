"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Move,
  Pause,
  Play,
  RotateCcw,
  Search,
} from "lucide-react";
import { VULogo } from "./shared";
import type { Book, StoreSettings } from "@/lib/contracts";
import { money } from "@/lib/contracts";

type DisplayBook = Pick<
  Book,
  "title" | "code" | "category" | "cover" | "course_name"
>;

export function getBookPaletteClass(book: {
  code?: string;
  category?: string;
  title?: string;
}): string {
  const code = (book.code || "").toUpperCase();

  // Specific subject code prefix matching
  if (/^(ACC|FIN|MGT|ECO|BUS|AUD)/.test(code)) return "book-palette-A"; // Mahogany Brown (from user screenshot)
  if (/^(CS|IT|BIT|ISL)/.test(code)) return "book-palette-B"; // Midnight Navy Blue
  if (/^(MTH|STA|PHY|CHE|BIO)/.test(code)) return "book-palette-C"; // Forest Emerald Green
  if (/^(ENG|EDU|PSY|MCM|SOC|PAK|HUM|BIF)/.test(code)) return "book-palette-D"; // Luxury Cream / Ivory Parchment

  // Fallback category matching if category is A, B, C, D
  if (book.category === "A") return "book-palette-A";
  if (book.category === "B") return "book-palette-B";
  if (book.category === "C") return "book-palette-C";
  if (book.category === "D") return "book-palette-D";

  // Fallback hash for any custom book code to ensure rotation across 4 rich colors
  const palettes = [
    "book-palette-A",
    "book-palette-B",
    "book-palette-C",
    "book-palette-D",
  ];
  let hash = 0;
  const str = code || book.title || "book";
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return palettes[Math.abs(hash) % palettes.length];
}

export function VUBookCover3D({
  book,
  className = "",
}: {
  book: { code?: string; title?: string; course_code?: string; cover?: string | null };
  className?: string;
}) {
  const [isStraight, setIsStraight] = useState(false);
  const code = (book.course_code || book.code || "VU").toUpperCase();
  const title = book.title || "Course Material";
  const straightClass = isStraight ? "is-straight" : "";

  if (book.cover) {
    return (
      <div
        className={`vu-textbook-3d ${straightClass} ${className}`}
        onClick={() => setIsStraight((prev) => !prev)}
        onMouseEnter={() => setIsStraight(true)}
        onMouseLeave={() => setIsStraight(false)}
      >
        <div className="vu-textbook-wrapper">
          <div className="vu-textbook-spine" />
          <div className="vu-textbook-front has-custom-cover">
            <img src={book.cover} alt={`${title} cover`} loading="lazy" />
          </div>
          <div className="vu-textbook-pages" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`vu-textbook-3d ${straightClass} ${className}`}
      onClick={() => setIsStraight((prev) => !prev)}
      onMouseEnter={() => setIsStraight(true)}
      onMouseLeave={() => setIsStraight(false)}
    >
      <div className="vu-textbook-wrapper">
        {/* Left 3D Spine with matching wrapping stripes */}
        <div className="vu-textbook-spine">
          <div className="vu-spine-header" />
          <div className="vu-spine-ribbon-top" />
          <div className="vu-spine-body">
            <span className="vu-spine-code">{code}</span>
          </div>
          <div className="vu-spine-ribbon-bottom" />
          <div className="vu-spine-footer" />
        </div>

        {/* Front Cover Face */}
        <div className="vu-textbook-front">
          {/* 1. Header (Royal Blue with VU Badge & Lecture Notes) */}
          <div className="vu-tb-header">
            <div className="vu-tb-logo-box">
              <img
                src="/vu-logo.jpg"
                alt="Virtual University"
                className="vu-tb-logo-img"
              />
            </div>
            <span className="vu-tb-notes">Notes</span>
          </div>

          {/* 2. Hanging Ribbon Tab with Swallowtail Notch */}
          <div className="vu-tb-hanging-tab" aria-hidden="true" />

          {/* 3. Golden Course Code Ribbon */}
          <div className="vu-tb-code-bar">
            <span className="vu-tb-code-text">{code}</span>
          </div>

          {/* 4. Center Main Body with Watermark & Title */}
          <div className="vu-tb-body">
            <div className="vu-tb-watermark" aria-hidden="true">
              <svg viewBox="0 0 200 240" fill="none" stroke="currentColor">
                {/* Open Book - Top Left */}
                <path d="M 25 35 Q 45 28 65 35 L 65 65 Q 45 58 25 65 Z" strokeWidth="1.6" opacity="0.14" />
                <path d="M 65 35 Q 85 28 105 35 L 105 65 Q 85 58 65 65 Z" strokeWidth="1.6" opacity="0.14" />
                {/* Globe - Top Middle */}
                <circle cx="140" cy="45" r="22" strokeWidth="1.5" opacity="0.13" />
                <ellipse cx="140" cy="45" rx="9" ry="22" strokeWidth="1.2" opacity="0.11" />
                <line x1="118" y1="45" x2="162" y2="45" strokeWidth="1.2" opacity="0.11" />
                {/* Atom Orbits - Top Right */}
                <ellipse cx="180" cy="50" rx="16" ry="6" transform="rotate(35 180 50)" strokeWidth="1.3" opacity="0.13" />
                <ellipse cx="180" cy="50" rx="16" ry="6" transform="rotate(-35 180 50)" strokeWidth="1.3" opacity="0.13" />
                <circle cx="180" cy="50" r="3" fill="currentColor" opacity="0.15" />
                {/* Slanted Pencil - Mid Right */}
                <path d="M 175 120 L 160 160 L 155 155 L 170 115 Z" strokeWidth="1.4" opacity="0.13" />
                <polygon points="160,160 155,155 152,163" strokeWidth="1.2" opacity="0.13" />
                {/* Graduation Cap - Bottom Right */}
                <polygon points="150,185 185,198 150,211 115,198" strokeWidth="1.5" opacity="0.14" />
                <path d="M 130 205 L 130 218 C 130 223 170 223 170 218 L 170 205" strokeWidth="1.4" opacity="0.13" />
                <line x1="185" y1="198" x2="190" y2="218" strokeWidth="1.2" opacity="0.13" />
                {/* Globe & Books - Bottom Left */}
                <circle cx="50" cy="190" r="18" strokeWidth="1.4" opacity="0.13" />
                <ellipse cx="50" cy="190" rx="7" ry="18" strokeWidth="1.1" opacity="0.11" />
                <line x1="32" y1="190" x2="68" y2="190" strokeWidth="1.1" opacity="0.11" />
                <path d="M 30 220 L 70 220 L 70 225 L 30 225 Z" strokeWidth="1.2" opacity="0.13" />
              </svg>
            </div>

            <h3 className="vu-tb-title">{title}</h3>

            <div className="vu-tb-divider">
              <span className="vu-tb-line" />
              <span className="vu-tb-dots">··</span>
              <span className="vu-tb-star">✦</span>
              <span className="vu-tb-dots">··</span>
              <span className="vu-tb-line" />
            </div>
          </div>

          {/* 5. Lower Golden Slogan Ribbon */}
          <div className="vu-tb-slogan-bar">
            <span>World Class Education at Your Doorstep</span>
          </div>

          {/* 6. Deep Midnight Navy Footer Bar */}
          <div className="vu-tb-footer-bar">
            <span>VIRTUAL UNIVERSITY OF PAKISTAN</span>
          </div>
        </div>

        {/* Right 3D Pages Block */}
        <div className="vu-textbook-pages" />
      </div>
    </div>
  );
}

export function BookObject({
  book,
  open = false,
}: {
  book: DisplayBook;
  open?: boolean;
}) {
  const code = (book.code || "VU").toUpperCase();
  const title = book.title || "Course Material";
  const longTitle = title.length > 22;
  const paletteClass = getBookPaletteClass(book);
  return (
    <div
      className={`book-object ${paletteClass}${longTitle ? " book-long-title" : ""}${open ? " book-open" : ""}`}
      aria-hidden="true"
    >
      <div className="book-face book-back">
        <BookOpen />
        <span>
          World Class Education
          <br />
          at Your Doorstep.
        </span>
        <small>VIRTUAL UNIVERSITY OF PAKISTAN</small>
      </div>
      <div className="book-face book-spine vu-textbook-spine">
        <div className="vu-spine-header" />
        <div className="vu-spine-ribbon-top" />
        <div className="vu-spine-body">
          <span className="vu-spine-code">{code}</span>
        </div>
        <div className="vu-spine-ribbon-bottom" />
        <div className="vu-spine-footer" />
      </div>
      <div className="book-face book-pages" />
      <div className="book-face book-top" />
      <div className="book-face book-base" />
      <div className="book-inside">
        <span>VIRTUAL UNIVERSITY</span>
        <BookOpen />
        <strong>{title}</strong>
        <p>
          World Class Education
          <br />at Your Doorstep.
        </p>
        <small>{code} · OFFICIAL LECTURE NOTES</small>
      </div>
      <div className="book-face book-front">
        <div className="book-front-art vu-textbook-front">
          {book.cover ? (
            <img src={book.cover} alt={`${title} cover`} loading="lazy" />
          ) : (
            <>
              {/* 1. Header (Royal Blue with VU Badge & Lecture Notes) */}
              <div className="vu-tb-header">
                <div className="vu-tb-logo-box">
                  <img
                    src="/vu-logo.jpg"
                    alt="Virtual University"
                    className="vu-tb-logo-img"
                  />
                </div>
                <span className="vu-tb-notes">Notes</span>
              </div>

              {/* 2. Hanging Ribbon Tab with Swallowtail Notch */}
              <div className="vu-tb-hanging-tab" aria-hidden="true" />

              {/* 3. Golden Course Code Ribbon */}
              <div className="vu-tb-code-bar">
                <span className="vu-tb-code-text">{code}</span>
              </div>

              {/* 4. Center Main Body with Watermark & Title */}
              <div className="vu-tb-body">
                <div className="vu-tb-watermark" aria-hidden="true">
                  <svg viewBox="0 0 200 240" fill="none" stroke="currentColor">
                    {/* Open Book - Top Left */}
                    <path d="M 25 35 Q 45 28 65 35 L 65 65 Q 45 58 25 65 Z" strokeWidth="1.6" opacity="0.14" />
                    <path d="M 65 35 Q 85 28 105 35 L 105 65 Q 85 58 65 65 Z" strokeWidth="1.6" opacity="0.14" />
                    {/* Globe - Top Middle */}
                    <circle cx="140" cy="45" r="22" strokeWidth="1.5" opacity="0.13" />
                    <ellipse cx="140" cy="45" rx="9" ry="22" strokeWidth="1.2" opacity="0.11" />
                    <line x1="118" y1="45" x2="162" y2="45" strokeWidth="1.2" opacity="0.11" />
                    {/* Atom Orbits - Top Right */}
                    <ellipse cx="180" cy="50" rx="16" ry="6" transform="rotate(35 180 50)" strokeWidth="1.3" opacity="0.13" />
                    <ellipse cx="180" cy="50" rx="16" ry="6" transform="rotate(-35 180 50)" strokeWidth="1.3" opacity="0.13" />
                    <circle cx="180" cy="50" r="3" fill="currentColor" opacity="0.15" />
                    {/* Slanted Pencil - Mid Right */}
                    <path d="M 175 120 L 160 160 L 155 155 L 170 115 Z" strokeWidth="1.4" opacity="0.13" />
                    <polygon points="160,160 155,155 152,163" strokeWidth="1.2" opacity="0.13" />
                    {/* Graduation Cap - Bottom Right */}
                    <polygon points="150,185 185,198 150,211 115,198" strokeWidth="1.5" opacity="0.14" />
                    <path d="M 130 205 L 130 218 C 130 223 170 223 170 218 L 170 205" strokeWidth="1.4" opacity="0.13" />
                    <line x1="185" y1="198" x2="190" y2="218" strokeWidth="1.2" opacity="0.13" />
                    {/* Globe & Books - Bottom Left */}
                    <circle cx="50" cy="190" r="18" strokeWidth="1.4" opacity="0.13" />
                    <ellipse cx="50" cy="190" rx="7" ry="18" strokeWidth="1.1" opacity="0.11" />
                    <line x1="32" y1="190" x2="68" y2="190" strokeWidth="1.1" opacity="0.11" />
                    <path d="M 30 220 L 70 220 L 70 225 L 30 225 Z" strokeWidth="1.2" opacity="0.13" />
                  </svg>
                </div>

                <h3 className="vu-tb-title">{title}</h3>

                <div className="vu-tb-divider">
                  <span className="vu-tb-line" />
                  <span className="vu-tb-dots">··</span>
                  <span className="vu-tb-star">✦</span>
                  <span className="vu-tb-dots">··</span>
                  <span className="vu-tb-line" />
                </div>
              </div>

              {/* 5. Lower Golden Slogan Ribbon */}
              <div className="vu-tb-slogan-bar">
                <span>World Class Education at Your Doorstep</span>
              </div>

              {/* 6. Deep Midnight Navy Footer Bar */}
              <div className="vu-tb-footer-bar">
                <span>VIRTUAL UNIVERSITY OF PAKISTAN</span>
              </div>
            </>
          )}
        </div>
        <div className="book-front-lining" />
      </div>
    </div>
  );
}

export function BookExperience({
  books,
  compact = false,
}: {
  books: Book[];
  compact?: boolean;
}) {
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [rotationValue, setRotationValue] = useState(-24);
  const scene = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    turn: number;
    pitch: number;
  } | null>(null);
  const angle = useRef({ turn: -24, pitch: 9 });
  const featured = compact
    ? books.slice(0, 1)
    : [
      books.find((b) => b.code === "CS101") || books[0],
      books.find((b) => b.code === "MTH101") || books[1],
      books.find((b) => b.code === "MGT101") || books[2],
    ].filter(
      (b, index, all): b is Book =>
        !!b && all.findIndex((other) => other?.id === b.id) === index,
    );
  const index = Math.min(selected, Math.max(0, featured.length - 1));
  const current = featured[index];

  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(preference.matches);
    update();
    preference.addEventListener("change", update);
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "80px" },
    );
    if (scene.current) observer.observe(scene.current);
    return () => {
      preference.removeEventListener("change", update);
      observer.disconnect();
    };
  }, []);

  const reset = () => {
    angle.current = { turn: -24, pitch: 9 };
    scene.current?.style.setProperty("--book-turn", "-24deg");
    scene.current?.style.setProperty("--book-pitch", "9deg");
    setRotationValue(-24);
    setOpen(false);
  };
  const syncRotation = () =>
    setRotationValue(((((angle.current.turn + 180) % 360) + 360) % 360) - 180);
  const stopDrag = () => {
    drag.current = null;
    setDragging(false);
    syncRotation();
  };
  const select = (next: number) => {
    setSelected((next + featured.length) % featured.length);
    reset();
  };
  if (!current) return null;

  return (
    <div
      className={`book-experience${compact ? " compact-experience" : ""}${paused || reduced || !visible ? " scene-paused" : ""}`}
    >
      <div className="scene-topline">
        <span>
          <i /> THE CAMPUS COLLECTION
        </span>
        <span>
          {String(index + 1).padStart(2, "0")} /{" "}
          {String(featured.length).padStart(2, "0")}
        </span>
      </div>
      <div
        className={`book-scene${dragging ? " is-dragging" : ""}`}
        ref={scene}
        role="group"
        aria-label={`Interactive 3D preview of ${current.title}`}
      >
        <div className="scene-aura" aria-hidden="true" />
        <div className="scene-orbit orbit-one" aria-hidden="true" />
        <div className="scene-orbit orbit-two" aria-hidden="true" />
        <div className="scene-platform" aria-hidden="true">
          <span />
        </div>
        <div className="scene-spark spark-one" aria-hidden="true" />
        <div className="scene-spark spark-two" aria-hidden="true" />
        {featured.map((book, n) => {
          const position =
            n === index
              ? "center"
              : (n - index + featured.length) % featured.length === 1
                ? "right"
                : "left";
          return (
            <div key={book.id} className={`scene-book scene-book-${position}`}>
              <div className="book-float">
                <div className="book-orientation">
                  <BookObject book={book} open={n === index && open} />
                </div>
              </div>
            </div>
          );
        })}
        <div
          className="scene-drag-area"
          role="slider"
          tabIndex={0}
          aria-label="Rotate book. Drag left or right, or use arrow keys. Home resets the view."
          aria-valuemin={-180}
          aria-valuemax={180}
          aria-valuenow={rotationValue}
          aria-valuetext={`${Math.round(rotationValue)} degrees`}
          onKeyDown={(event) => {
            if (
              ![
                "ArrowLeft",
                "ArrowRight",
                "ArrowUp",
                "ArrowDown",
                "Home",
              ].includes(event.key)
            )
              return;
            event.preventDefault();
            if (event.key === "Home") {
              reset();
              return;
            }
            if (event.key === "ArrowLeft") angle.current.turn -= 15;
            if (event.key === "ArrowRight") angle.current.turn += 15;
            if (event.key === "ArrowUp")
              angle.current.pitch = Math.max(-35, angle.current.pitch - 8);
            if (event.key === "ArrowDown")
              angle.current.pitch = Math.min(35, angle.current.pitch + 8);
            scene.current?.style.setProperty(
              "--book-turn",
              `${angle.current.turn}deg`,
            );
            scene.current?.style.setProperty(
              "--book-pitch",
              `${angle.current.pitch}deg`,
            );
            syncRotation();
          }}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            drag.current = {
              id: event.pointerId,
              x: event.clientX,
              y: event.clientY,
              ...angle.current,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(true);
          }}
          onPointerMove={(event) => {
            if (!drag.current || drag.current.id !== event.pointerId) return;
            angle.current = {
              turn: drag.current.turn + (event.clientX - drag.current.x) * 0.65,
              pitch: Math.max(
                -35,
                Math.min(
                  35,
                  drag.current.pitch - (event.clientY - drag.current.y) * 0.18,
                ),
              ),
            };
            scene.current?.style.setProperty(
              "--book-turn",
              `${angle.current.turn}deg`,
            );
            scene.current?.style.setProperty(
              "--book-pitch",
              `${angle.current.pitch}deg`,
            );
            event.currentTarget.setAttribute(
              "aria-valuenow",
              String(((((angle.current.turn + 180) % 360) + 360) % 360) - 180),
            );
          }}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          onLostPointerCapture={stopDrag}
        />
        <span className="scene-caption" aria-hidden="true">
          <Move size={14} /> DRAG TO DISCOVER
        </span>
      </div>
      <div className="scene-controls">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-pressed={open}
        >
          <BookOpen size={16} />
          {open ? "Close cover" : "Open cover"}
        </button>
        <button type="button" onClick={reset} aria-label="Reset book view">
          <RotateCcw size={16} />
        </button>
        {!reduced && (
          <button
            type="button"
            onClick={() => setPaused(!paused)}
            aria-label={paused ? "Play book animation" : "Pause book animation"}
          >
            {paused ? <Play size={15} /> : <Pause size={15} />}
          </button>
        )}
      </div>
      <div className="scene-selection">
        {featured.length > 1 && (
          <button
            type="button"
            className="scene-arrow"
            aria-label="Previous featured book"
            onClick={() => select(index - 1)}
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <div className="scene-book-label" aria-live="polite">
          <span>
            {current.code}
            {current.course_name && ` / ${current.course_name}`}
          </span>
          <a href={`/books/${current.code.toLowerCase()}`}>
            {current.title}
            <ArrowRight size={15} />
          </a>
          <span className="student-price-label">Student category</span>
          <strong>{money(current.price)}</strong>
        </div>
        {featured.length > 1 && (
          <button
            type="button"
            className="scene-arrow"
            aria-label="Next featured book"
            onClick={() => select(index + 1)}
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>
      {featured.length > 1 && (
        <div className="scene-dots" aria-label="Featured books">
          {featured.map((book, n) => (
            <button
              key={book.id}
              type="button"
              aria-label={`Preview ${book.title}`}
              aria-pressed={n === index}
              onClick={() => select(n)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ImmersiveHero({
  books,
  settings,
}: {
  books: Book[];
  settings?: StoreSettings;
}) {
  const storeName = settings?.store_name || "Your Campus";
  const tagline =
    settings?.header_tagline ||
    "Big ideas start with the right books. Find your course, discover your next read, and make this semester yours.";

  return (
    <>
      <section className="hero immersive-hero">
        <div className="hero-grain" aria-hidden="true" />
        <div className="hero-copy">
          <span className="eyebrow hero-arrival">
            <span className="eyebrow-line" />{" "}
            {settings?.header_tagline
              ? settings.header_tagline.toUpperCase()
              : "A NEW CHAPTER STARTS HERE"}
          </span>
          <h1>
            <span>{storeName}.</span>
            <span>Your Books.</span>
            <em>One Place.</em>
          </h1>
          <p className="hero-arrival">{tagline}</p>
          <div className="actions hero-arrival">
            <a className="btn primary" href="#books">
              Explore the collection <ArrowRight size={18} />
            </a>
            <a className="hero-search-link" href="#search">
              <Search size={17} /> Find your course
            </a>
          </div>
          <div className="hero-foot hero-arrival">
            <div className="hero-mini-books" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <div>
              <strong>Made for your semester.</strong>
              <span>Course essentials. One thoughtful collection.</span>
            </div>
          </div>
        </div>
        <BookExperience books={books} />
        <a className="hero-scroll" href="#books">
          <span>SCROLL TO EXPLORE</span>
          <ArrowDown size={17} />
        </a>
        <span className="hero-side-note" aria-hidden="true">
          A LITTLE KNOWLEDGE GOES A LONG WAY
        </span>
      </section>
      <div className="collection-ribbon" aria-label="Course collections">
        <div>
          {[0, 1].map((copy) => (
            <div
              className="ribbon-group"
              key={copy}
              aria-hidden={copy === 1 ? true : undefined}
            >
              {[
                "COMPUTING",
                "MATHEMATICS",
                "BUSINESS",
                "LANGUAGE",
                "BIG IDEAS",
              ].map((field) => (
                <span key={field}>
                  {field}
                  <span className="ribbon-star">✳</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
