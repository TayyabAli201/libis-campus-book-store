"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="section">
      <h1 className="page-title">We hit a little snag.</h1>
      <p>Your saved orders are safe. Please try loading this page again.</p>
      <button className="btn primary" onClick={reset}>
        Try again
      </button>
      <a className="btn" href="/">
        Bookstore home
      </a>
    </main>
  );
}
