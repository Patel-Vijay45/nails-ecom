import { STATUS_LABEL } from "@/lib/constants";

const COLORS: Record<string, string> = {
  PENDING: "bg-[#fdf0d5] text-[#8a5a00]",
  CONFIRMED: "bg-[#e0ecff] text-[#1d4ea3]",
  IN_PRODUCTION: "bg-[#efe3ee] text-[#6b2a78]",
  PACKED: "bg-[#e6f0f0] text-[#1e5c5c]",
  SHIPPED: "bg-[#e3ede6] text-[#2f6b44]",
  DELIVERED: "bg-[#2f7a4b] text-white",
  CANCELLED: "bg-line text-muted",
  RTO: "bg-blush text-berry-dark",
  NEW: "bg-[#fdf0d5] text-[#8a5a00]",
  QUOTED: "bg-[#e0ecff] text-[#1d4ea3]",
  ACCEPTED: "bg-[#efe3ee] text-[#6b2a78]",
  IN_PROGRESS: "bg-[#efe3ee] text-[#6b2a78]",
  DONE: "bg-[#2f7a4b] text-white",
  DECLINED: "bg-line text-muted",
  PAID: "bg-[#e3ede6] text-[#2f6b44]",
  FAILED: "bg-blush text-berry-dark",
  REFUNDED: "bg-line text-muted",
};

export function Badge({ value, label }: { value: string; label?: string }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${COLORS[value] ?? "bg-line text-muted"}`}>
      {label ?? STATUS_LABEL[value] ?? value.replace("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
    </span>
  );
}

export function PageTitle({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="display text-4xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export function Saved({ show }: { show: boolean }) {
  return show ? <p className="mb-6 rounded-xl bg-[#e3ede6] px-4 py-3 text-sm font-semibold text-[#2f6b44]">Saved ✓</p> : null;
}
