"use client";

import { useEffect, useRef, useState } from "react";
import { compressImage } from "@/lib/compressImage";
import { CloseIcon, UploadIcon } from "../Icons";

type Picked = { file: File; url: string };

/**
 * Photo picker for forms: shrinks photos in the browser, shows previews and lets people remove them.
 * The prepared files are put into a hidden <input type="file" name={name}> so the form submits them normally.
 */
export default function ImageInput({ name, maxFiles = 10, label, hint }: { name: string; maxFiles?: number; label: string; hint?: string }) {
  const hidden = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Keep the hidden input's files in sync with what's shown.
  useEffect(() => {
    if (!hidden.current) return;
    const dt = new DataTransfer();
    picked.forEach((p) => dt.items.add(p.file));
    hidden.current.files = dt.files;
  }, [picked]);
  useEffect(() => () => picked.forEach((p) => URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  async function onPick(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    const errs: string[] = [];
    const next: Picked[] = [];
    const room = Math.max(0, maxFiles - picked.length);
    const files = Array.from(list);
    if (files.length > room) errs.push(`You can add up to ${maxFiles} photos.`);
    for (const f of files.slice(0, room)) {
      try {
        const out = await compressImage(f);
        next.push({ file: out, url: URL.createObjectURL(out) });
      } catch (e) {
        errs.push((e as Error).message);
      }
    }
    setPicked((p) => [...p, ...next]);
    setErrors(errs);
    setBusy(false);
  }

  return (
    <div>
      <input ref={hidden} type="file" name={name} multiple className="hidden" tabIndex={-1} aria-hidden />
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-shell/50 p-5 text-center transition hover:border-berry">
        <UploadIcon className="text-berry" />
        <span className="text-sm font-semibold">{busy ? "Preparing photos…" : label}</span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          disabled={busy || picked.length >= maxFiles}
          onChange={(e) => {
            onPick(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      {picked.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {picked.map((p, i) => (
            <div key={p.url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-20 w-20 rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => setPicked(picked.filter((_, k) => k !== i))}
                className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-ink text-cream"
                aria-label="Remove photo"
              >
                <CloseIcon width={12} height={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      {errors.map((e) => (
        <p key={e} className="mt-2 rounded-xl bg-blush px-3 py-2 text-xs text-berry-dark">{e}</p>
      ))}
    </div>
  );
}
