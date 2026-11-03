"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { saveImages } from "@/lib/uploads";

export type FormState = { ok: boolean; message: string; errors?: Record<string, string> };

const reviewSchema = z.object({
  productId: z.string().min(1),
  name: z.string().trim().min(2, "Please enter your name").max(60),
  city: z.string().trim().max(60).optional().default(""),
  rating: z.coerce.number().int().min(1).max(5),
  text: z.string().trim().min(10, "Tell us a little more (10+ characters)").max(1000),
});

export async function submitReview(_: FormState, form: FormData): Promise<FormState> {
  const parsed = reviewSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the form" };
  const product = await db.product.findUnique({ where: { id: parsed.data.productId } });
  if (!product) return { ok: false, message: "Product not found" };
  await db.review.create({ data: { ...parsed.data, approved: false } });
  return { ok: true, message: "Thank you! Your review will appear after a quick check." };
}

const customSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number"),
  email: z.union([z.literal(""), z.email("Enter a valid email")]).default(""),
  occasion: z.string().trim().min(2, "What's the occasion?").max(80),
  eventDate: z.string().trim().max(20).default(""),
  shape: z.string().trim().max(30).default(""),
  length: z.string().trim().max(30).default(""),
  colours: z.string().trim().max(200).default(""),
  description: z.string().trim().min(10, "Describe your idea in a few words (10+ characters)").max(2000),
  budget: z.string().trim().max(40).default(""),
  measurements: z.string().trim().max(200).default(""),
});

export async function submitCustomRequest(_: FormState, form: FormData): Promise<FormState> {
  const fields = Object.fromEntries([...form.entries()].filter(([k, v]) => k !== "images" && typeof v === "string"));
  const parsed = customSchema.safeParse(fields);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false, message: "Please fix the highlighted fields", errors };
  }
  const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 5);
  let images: string[] = [];
  try {
    images = await saveImages(files, "requests");
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
  await db.customRequest.create({ data: { ...parsed.data, images: JSON.stringify(images) } });
  return { ok: true, message: "Request received" };
}
