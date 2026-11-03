import Link from "next/link";
import NailArt from "@/components/NailArt";
import { db } from "@/lib/db";
import { inr, parseList } from "@/lib/format";
import { PageTitle } from "../ui";

export default async function Products() {
  const products = await db.product.findMany({ include: { collection: true }, orderBy: [{ isAddon: "asc" }, { sortOrder: "asc" }] });
  return (
    <>
      <PageTitle title="Products" sub={`${products.length} products. Changes show on the shop instantly.`}>
        <Link href="/admin/products/new" className="btn-primary">+ Add product</Link>
      </PageTitle>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted">
            <tr><th className="p-4">Product</th><th className="p-4">Collection</th><th className="p-4">Price</th><th className="p-4">Stock</th><th className="p-4">Status</th></tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const img = parseList(p.images)[0];
              return (
                <tr key={p.id} className="border-t border-line hover:bg-shell/50">
                  <td className="p-4">
                    <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                      <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-shell">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <NailArt palette={parseList(p.palette)} pattern={p.pattern} shape={parseList(p.shapes)[0]} seed={p.slug} className="w-11" />
                        )}
                      </span>
                      <span>
                        <span className="font-semibold hover:text-berry">{p.name}</span>
                        <span className="block text-xs text-muted">{[p.featured && "★ Featured", p.isAddon && "Add-on", p.badge].filter(Boolean).join(" · ")}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="p-4 text-muted">{p.collection?.name ?? "—"}</td>
                  <td className="p-4 font-semibold">{inr(p.price)}</td>
                  <td className={`p-4 font-semibold ${p.stock <= 5 ? "text-berry" : ""}`}>{p.stock}</td>
                  <td className="p-4">{p.active ? <span className="text-[#2f7a4b]">● Live</span> : <span className="text-muted">○ Hidden</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
