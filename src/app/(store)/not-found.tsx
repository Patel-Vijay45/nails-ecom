import Link from "next/link";
import NailArt from "@/components/NailArt";

export default function NotFound() {
  return (
    <div className="container-x py-24 text-center">
      <NailArt palette={["#F4D9D6", "#8E2C48"]} pattern="french" seed="404" className="mx-auto w-56" />
      <h1 className="display mt-6 text-5xl">Page not found</h1>
      <p className="mt-3 text-muted">This page may have moved, or the design may be sold out.</p>
      <Link href="/shop" className="btn-primary mt-8">Shop all designs</Link>
    </div>
  );
}
