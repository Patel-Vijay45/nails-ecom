"use client";

import type { Collection, Product } from "@prisma/client";
import { useState } from "react";
import NailArt from "@/components/NailArt";
import { ALL_LENGTHS, ALL_SHAPES, PATTERNS } from "@/lib/constants";
import { parseList } from "@/lib/format";
import { deleteProduct, saveProduct } from "../../actions";

export default function ProductForm({ product, collections }: { product: Product | null; collections: Collection[] }) {
  const palette = product ? parseList(product.palette) : ["#E8B4B8", "#FFFFFF"];
  const [c1, setC1] = useState(palette[0] ?? "#E8B4B8");
  const [c2, setC2] = useState(palette[1] ?? "#FFFFFF");
  const [pattern, setPattern] = useState(product?.pattern ?? "solid");
  const shapes = product ? parseList(product.shapes) : ["Almond", "Coffin", "Square", "Oval"];
  const lengths = product ? parseList(product.lengths) : ["Short", "Medium", "Long"];
  const [previewShape, setPreviewShape] = useState(shapes[0] ?? "Almond");
  const images = product ? parseList(product.images) : [];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <form action={saveProduct} className="space-y-6 lg:col-span-2">
        {product && <input type="hidden" name="id" value={product.id} />}
        <section className="card grid gap-4 p-6 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">Basics</h2>
          <label className="sm:col-span-2">
            <span className="label">Name *</span>
            <input name="name" required defaultValue={product?.name} className="field" />
          </label>
          <label className="sm:col-span-2">
            <span className="label">Description</span>
            <textarea name="description" rows={3} defaultValue={product?.description} className="field" />
          </label>
          <label>
            <span className="label">Price (₹) *</span>
            <input name="price" type="number" min={0} required defaultValue={product?.price ?? 699} className="field" />
          </label>
          <label>
            <span className="label">Compare-at price (₹), shown crossed out</span>
            <input name="compareAtPrice" type="number" min={0} defaultValue={product?.compareAtPrice ?? ""} className="field" />
          </label>
          <label>
            <span className="label">Collection</span>
            <select name="collectionId" defaultValue={product?.collectionId ?? ""} className="field">
              <option value="">None</option>
              {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Badge</span>
            <input name="badge" defaultValue={product?.badge ?? ""} className="field" placeholder="Bestseller, New drop, Bridal…" />
          </label>
          <label>
            <span className="label">Stock (standard sizes)</span>
            <input name="stock" type="number" min={0} defaultValue={product?.stock ?? 20} className="field" />
          </label>
          <label>
            <span className="label">Sort order (lower shows first)</span>
            <input name="sortOrder" type="number" defaultValue={product?.sortOrder ?? 0} className="field" />
          </label>
          <label className="sm:col-span-2">
            <span className="label">URL name (slug)</span>
            <input name="slug" defaultValue={product?.slug} className="field" placeholder="auto from name" />
          </label>
        </section>

        <section className="card grid gap-4 p-6 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">Options customers can choose</h2>
          <fieldset className="sm:col-span-2">
            <span className="label">Shapes (leave all unticked for extras like glue)</span>
            <div className="flex flex-wrap gap-2">
              {ALL_SHAPES.map((s) => (
                <label key={s} className="chip gap-2">
                  <input type="checkbox" name="shapes" value={s} defaultChecked={shapes.includes(s)} className="accent-berry" onChange={(e) => e.target.checked && setPreviewShape(s)} /> {s}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="sm:col-span-2">
            <span className="label">Lengths</span>
            <div className="flex flex-wrap gap-2">
              {ALL_LENGTHS.map((s) => (
                <label key={s} className="chip gap-2">
                  <input type="checkbox" name="lengths" value={s} defaultChecked={lengths.includes(s)} className="accent-berry" /> {s}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="madeToMeasure" defaultChecked={product?.madeToMeasure ?? true} className="h-4 w-4 accent-berry" /> Offer made to measure
          </label>
          <label>
            <span className="label">Made-to-measure extra (₹)</span>
            <input name="madeToMeasureFee" type="number" min={0} defaultValue={product?.madeToMeasureFee ?? 200} className="field" />
          </label>
        </section>

        <section className="card grid gap-4 p-6">
          <h2 className="font-bold">Photos</h2>
          {images.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {images.map((src) => (
                <label key={src} className="relative block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-24 w-24 rounded-xl object-cover" />
                  <span className="mt-1 flex items-center gap-1 text-xs">
                    <input type="checkbox" name="keepImages" value={src} defaultChecked className="accent-berry" /> Keep
                  </span>
                </label>
              ))}
            </div>
          )}
          <label>
            <span className="label">Upload photos (JPG, PNG, WEBP, max 8 MB each)</span>
            <input type="file" name="newImages" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="field" />
          </label>
          <label>
            <span className="label">Or paste image links (one per line)</span>
            <textarea name="imageUrls" rows={2} className="field" placeholder="https://…" />
          </label>
          <p className="text-xs text-muted">No photos yet? The shop shows the generated nail art on the right instead.</p>
        </section>

        <section className="card grid gap-4 p-6 sm:grid-cols-3">
          <h2 className="font-bold sm:col-span-3">Visibility</h2>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="h-4 w-4 accent-berry" /> Live on shop
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="featured" defaultChecked={product?.featured ?? false} className="h-4 w-4 accent-berry" /> Show on home page
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="isAddon" defaultChecked={product?.isAddon ?? false} className="h-4 w-4 accent-berry" /> Suggest in bag (add-on)
          </label>
        </section>

        <input type="hidden" name="color1" value={c1} />
        <input type="hidden" name="color2" value={c2} />
        <input type="hidden" name="pattern" value={pattern} />
        <button className="btn-primary w-full py-4">{product ? "Save product" : "Create product"}</button>
      </form>

      <aside className="space-y-6 lg:sticky lg:top-10 lg:self-start">
        <section className="card p-6">
          <h2 className="font-bold">Nail art preview</h2>
          <div className="mt-4 grid aspect-square place-items-center rounded-2xl bg-gradient-to-br from-white to-blush">
            <NailArt palette={[c1, c2]} pattern={pattern} shape={previewShape} seed={product?.slug ?? "new"} className="w-[85%]" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label>
              <span className="label">Main colour</span>
              <input type="color" value={c1} onChange={(e) => setC1(e.target.value)} className="h-11 w-full cursor-pointer rounded-xl border border-line" />
            </label>
            <label>
              <span className="label">Accent colour</span>
              <input type="color" value={c2} onChange={(e) => setC2(e.target.value)} className="h-11 w-full cursor-pointer rounded-xl border border-line" />
            </label>
          </div>
          <span className="label mt-4">Pattern</span>
          <div className="flex flex-wrap gap-2">
            {PATTERNS.map((p) => (
              <button type="button" key={p} className="chip px-3 py-1.5 text-xs capitalize" data-active={pattern === p} onClick={() => setPattern(p)}>
                {p}
              </button>
            ))}
          </div>
        </section>
        {product && (
          <form action={deleteProduct} className="card p-6">
            <input type="hidden" name="id" value={product.id} />
            <p className="text-sm text-muted">Delete removes the product for good. To stop selling it for now, untick &ldquo;Live on shop&rdquo; instead.</p>
            <button className="btn-outline mt-3 w-full text-berry">Delete product</button>
          </form>
        )}
      </aside>
    </div>
  );
}
