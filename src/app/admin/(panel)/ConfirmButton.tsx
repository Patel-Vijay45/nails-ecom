"use client";

/** Submit button that asks "Are you sure?" first (for actions that cost money or can't be undone). */
export default function ConfirmButton({ message, className, children, formAction }: { message: string; className?: string; children: React.ReactNode; formAction?: (f: FormData) => void }) {
  return (
    <button
      className={className}
      formAction={formAction}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
