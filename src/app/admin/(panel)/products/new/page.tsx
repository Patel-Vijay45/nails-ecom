import Link from "next/link";
import { db } from "@/lib/db";
import ProductForm from "../ProductForm";
import { PageTitle } from "../../ui";

export default async function NewProduct() {
  const collections = await db.collection.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <>
      <Link href="/admin/products" className="text-sm text-muted hover:text-ink">← Products</Link>
      <PageTitle title="New product" />
      <ProductForm product={null} collections={collections} />
    </>
  );
}
