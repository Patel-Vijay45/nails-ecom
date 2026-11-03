import type { Metadata } from "next";
import Link from "next/link";
import NailArt from "@/components/NailArt";
import RichTitle from "@/components/RichTitle";

export const metadata: Metadata = { title: "Sizing guide & how to apply" };

const CHART = [
  ["XS", 14, 10, 11, 10, 7],
  ["S", 15, 11, 12, 11, 8],
  ["M", 16, 12, 13, 12, 9],
  ["L", 18, 13, 14, 13, 10],
];

export default function SizingGuide() {
  return (
    <div className="container-x max-w-5xl pt-12">
      <p className="eyebrow">Perfect fit</p>
      <h1 className="display mt-3 text-5xl md:text-6xl">
        <RichTitle text="Find your *size*" />
      </h1>
      <p className="mt-4 max-w-2xl text-muted">The right fit makes press-ons look natural and last longer. It takes 2 minutes.</p>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {[
          ["1", "Use tape", "Press a strip of clear tape across the widest part of your nail, from edge to edge."],
          ["2", "Mark & measure", "Mark both edges with a pen, peel the tape off and measure it with a ruler in millimetres."],
          ["3", "Match the chart", "Do this for all 5 fingers. If you're between two sizes, choose the bigger one and file it down."],
        ].map(([n, t, d]) => (
          <div key={n} className="card p-6">
            <span className="display text-5xl italic text-blush">{n}</span>
            <p className="mt-2 text-lg font-bold">{t}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
          </div>
        ))}
      </div>

      <div className="card mt-10 overflow-x-auto p-2">
        <table className="w-full min-w-[520px] text-center text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-muted">
              {["Size", "Thumb", "Index", "Middle", "Ring", "Pinky"].map((h) => (
                <th key={h} className="p-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CHART.map(([s, ...v]) => (
              <tr key={s as string} className="border-t border-line">
                <td className="p-4 font-bold">{s}</td>
                {v.map((n, i) => (
                  <td key={i} className="p-4">{n} mm</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-muted">
        Different sizes on each finger? Choose <b>Made to measure</b> on any product and enter your sizes, or start with the{" "}
        <Link href="/product/sizing-kit" className="font-semibold text-berry underline">sizing kit</Link>.
      </p>

      <section id="apply" className="mt-24 grid items-center gap-12 md:grid-cols-2">
        <div>
          <p className="eyebrow">How to apply</p>
          <h2 className="display mt-3 text-4xl">On in 10 minutes</h2>
          <ol className="mt-8 space-y-5">
            {[
              "Wash your hands and push back your cuticles.",
              "Lightly buff the shine off your nails and wipe them with the alcohol pad.",
              "Lay out the right size for each finger before you start.",
              "Glue: put a thin layer on your nail and the press-on, then press for 10–15 seconds. Tabs: stick a tab on your nail and press the nail on for 20 seconds.",
              "Avoid water for 1 hour. Then enjoy!",
            ].map((t, i) => (
              <li key={i} className="flex gap-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-cream">{i + 1}</span>
                <p className="pt-1 text-muted">{t}</p>
              </li>
            ))}
          </ol>
          <h3 className="mt-10 text-lg font-bold">Removing & reusing</h3>
          <p className="mt-2 text-muted">
            Soak your fingertips in warm soapy water with a few drops of cuticle oil for 10 minutes. Gently lift from the side with the cuticle
            stick. Clean off the old glue and keep the nails in their box to wear again.
          </p>
        </div>
        <div className="grid place-items-center rounded-[40px] bg-gradient-to-br from-white to-blush p-10">
          <NailArt palette={["#F7EEE8", "#FFFFFF"]} pattern="french" shape="Almond" length="Medium" seed="guide" className="w-full max-w-sm" />
        </div>
      </section>
    </div>
  );
}
