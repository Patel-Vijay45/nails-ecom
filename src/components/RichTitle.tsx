/** Renders text where *words* in asterisks become italic and coloured. */
export default function RichTitle({ text, accent = "text-berry" }: { text: string; accent?: string }) {
  const parts = text.split(/(\*[^*]+\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("*") && p.endsWith("*") ? (
          <em key={i} className={`font-normal italic ${accent}`}>
            {p.slice(1, -1)}
          </em>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
