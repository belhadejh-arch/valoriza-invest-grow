import mark from "@/assets/valoriza-mark.png";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dims = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const title = size === "lg" ? "text-4xl" : size === "sm" ? "text-lg" : "text-2xl";
  const sub = size === "lg" ? "text-[11px]" : "text-[9px]";

  return (
    <div className="flex items-center gap-2">
      <img src={mark} alt="Valoriza" className={`${dims} shrink-0 object-contain`} width={816} height={816} />
      <div className="leading-none" dir="ltr">
        <div className={`${title} font-extrabold tracking-tight text-gold-gradient`}>Valoriza</div>
        <div className={`${sub} mt-1 font-medium tracking-wide text-muted-foreground`}>
          Invest Today .. Build Tomorrow
        </div>
      </div>
    </div>
  );
}
