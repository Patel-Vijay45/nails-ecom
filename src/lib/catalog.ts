import type { Collection, Product } from "@prisma/client";
import { parseColors, type ColorOption } from "./colors";
import { parseList } from "./format";

export type ProductView = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  images: string[];
  palette: string[];
  pattern: string;
  colors: ColorOption[];
  nailType: string;
  shapes: string[];
  lengths: string[];
  madeToMeasure: boolean;
  madeToMeasureFee: number;
  stock: number;
  badge: string | null;
  isAddon: boolean;
  collection: { slug: string; name: string } | null;
};

export function toView(p: Product & { collection?: Collection | null }): ProductView {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    images: parseList(p.images),
    palette: parseList(p.palette),
    pattern: p.pattern,
    colors: parseColors(p.colors),
    nailType: p.nailType,
    shapes: parseList(p.shapes),
    lengths: parseList(p.lengths),
    madeToMeasure: p.madeToMeasure,
    madeToMeasureFee: p.madeToMeasureFee,
    stock: p.stock,
    badge: p.badge,
    isAddon: p.isAddon,
    collection: p.collection ? { slug: p.collection.slug, name: p.collection.name } : null,
  };
}
