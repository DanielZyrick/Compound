"use client"; // error boundaries must be Client Components

// The last resort: it replaces the root layout when that layout itself fails,
// so it brings its own <html> and <body> and doesn't get the app's stylesheet.
// That's why it uses a few inline styles instead of Tailwind classes.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#ffffff",
          color: "#0b0b0f",
          textAlign: "center",
        }}
      >
        <title>Something went wrong · Compound</title>
        <main style={{ padding: 24, maxWidth: 420 }}>
          <p style={{ color: "#1f6bff", fontWeight: 500, margin: 0 }}>Something went wrong</p>
          <h1 style={{ fontSize: 24, margin: "8px 0" }}>Compound couldn&apos;t load</h1>
          <p style={{ color: "#6b6b72", margin: 0 }}>Your data is safe. Please try again in a moment.</p>
          <button
            onClick={() => retry()}
            style={{
              marginTop: 24,
              padding: "10px 18px",
              border: 0,
              borderRadius: 10,
              background: "#1f6bff",
              color: "#ffffff",
              font: "inherit",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
