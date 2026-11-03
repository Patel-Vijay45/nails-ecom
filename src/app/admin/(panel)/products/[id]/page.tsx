import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ProductForm from "../ProductForm";
import { PageTitle, Saved } from "../../ui";

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const [product, collections] = await Promise.all([db.product.findUnique({ where: { id } }), db.collection.findMany({ orderBy: { sortOrder: "asc" } })]);
  if (!product) notFound();
  return (
    <>
      <Link href="/admin/products" className="text-sm text-muted hover:text-ink">← Products</Link>
      <PageTitle title={product.name}>
        <Link href={`/product/${product.slug}`} target="_blank" className="btn-outline">View on shop ↗</Link>
      </PageTitle>
      <Saved show={sp.saved === "1"} />
      <ProductForm key={product.updatedAt.toISOString()} product={product} collections={collections} />
    </>
  );
}
