import { db } from "@/lib/db";
import { deleteCollection, saveCollection } from "../../actions";
import { PageTitle } from "../ui";

export default async function Collections() {
  const collections = await db.collection.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } });
  return (
    <>
      <PageTitle title="Collections" sub="Groups of products shown on the home page and shop filters." />
      <div className="space-y-4">
        {[...collections, null].map((c) => (
          <form key={c?.id ?? "new"} action={saveCollection} className="card grid items-end gap-3 p-5 md:grid-cols-[1fr_1fr_2fr_90px_70px_auto]">
            {c && <input type="hidden" name="id" value={c.id} />}
            <label><span className="label">{c ? "Name" : "New collection"}</span><input name="name" defaultValue={c?.name} required className="field" /></label>
            <label><span className="label">Slug</span><input name="slug" defaultValue={c?.slug} className="field" placeholder="auto" /></label>
            <label><span className="label">Description</span><input name="description" defaultValue={c?.description} className="field" /></label>
            <label><span className="label">Colour</span><input type="color" name="tint" defaultValue={c?.tint ?? "#F4D9D6"} className="h-[46px] w-full rounded-xl border border-line" /></label>
            <label><span className="label">Order</span><input type="number" name="sortOrder" defaultValue={c?.sortOrder ?? collections.length + 1} className="field" /></label>
            <div className="flex gap-2">
              <button className="btn-primary py-3">{c ? "Save" : "Add"}</button>
              {c && (
                <button formAction={deleteCollection} className="btn-outline py-3 text-berry" title={`${c._count.products} products will be left without a collection`}>
                  Delete
                </button>
              )}
            </div>
          </form>
        ))}
      </div>
    </>
  );
}
