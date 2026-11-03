import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces/full.css";
import "@fontsource-variable/fraunces/full-italic.css";
import "@fontsource-variable/manrope";
import "./globals.css";
import { getStore } from "@/lib/store";

// Every page reads live data (products, prices, settings) from the database.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const store = await getStore();
  return {
    title: { default: `${store.name} | ${store.tagline}`, template: `%s | ${store.name}` },
    description: store.heroSubtitle,
  };
}

export const viewport: Viewport = { themeColor: "#fbf6f1", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
