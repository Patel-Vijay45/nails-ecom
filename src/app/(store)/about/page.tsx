import type { Metadata } from "next";
import Link from "next/link";
import NailArt from "@/components/NailArt";
import RichTitle from "@/components/RichTitle";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Our story" };

export default async function About() {
  const store = await getStore();
  return (
    <div className="container-x max-w-5xl pt-12">
      <p className="eyebrow">Our story</p>
      <h1 className="display mt-3 text-5xl md:text-7xl">
        <RichTitle text="Every nail, painted *by hand*." />
      </h1>
      <div className="mt-12 grid gap-12 md:grid-cols-2">
        <div className="grid place-items-center rounded-[40px] bg-gradient-to-br from-[#efe3ee] to-blush p-10">
          <NailArt palette={["#C9B6E4", "#FFFFFF"]} pattern="marble" shape="Coffin" seed="about" className="w-full" />
        </div>
        <div className="space-y-5 text-lg leading-relaxed text-ink/80">
          <p>{store.aboutText}</p>
          <p>
            {store.name} started with a simple idea: everyone should be able to have salon-quality nail art, without spending hours in a salon chair.
            So {store.artistName} began painting press-on sets for friends, and then for brides, and then for people all over India.
          </p>
          <p>We make sets in small batches, so we can check every nail and keep improving every design based on what you tell us.</p>
          <div className="flex flex-wrap gap-3 pt-4">
            <Link href="/shop" className="btn-primary">Shop the collection</Link>
            <a href={`https://instagram.com/${store.instagram}`} target="_blank" rel="noreferrer" className="btn-outline">@{store.instagram}</a>
          </div>
        </div>
      </div>
    </div>
  );
}
