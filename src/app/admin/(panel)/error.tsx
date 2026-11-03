"use client";

// Shown instead of a blank "server error" page if something unexpected fails in the admin panel.
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card mx-auto max-w-lg p-8 text-center">
      <h1 className="display text-3xl">Something went wrong</h1>
      <p className="mt-3 text-sm text-muted">
        {error.message && !error.message.startsWith("An error occurred") ? error.message : "That didn't work. Your other data is safe."} Please try again.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <button onClick={reset} className="btn-primary">Try again</button>
        <a href="/admin" className="btn-outline">Back to dashboard</a>
      </div>
      {error.digest && <p className="mt-4 text-[11px] text-muted">Error code: {error.digest}</p>}
    </div>
  );
}
