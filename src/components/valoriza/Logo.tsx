import mark from "@/assets/valoriza-mark.png";

export function Logo({
  size = "md",
  showTagline = true,
  className = "",
}: {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  className?: string;
}) {
  const dims =
    size === "xl"
      ? "h-14 w-14 sm:h-16 sm:w-16"
      : size === "lg"
        ? "h-10 w-10 sm:h-12 sm:w-12"
        : size === "md"
          ? "h-8 w-8 sm:h-9 sm:w-9"
          : size === "sm"
            ? "h-7 w-7"
            : "h-6 w-6";

  const title =
    size === "xl"
      ? "text-3xl sm:text-4xl"
      : size === "lg"
        ? "text-2xl sm:text-3xl"
        : size === "md"
          ? "text-xl sm:text-2xl"
          : size === "sm"
            ? "text-base sm:text-lg"
            : "text-sm";

  const sub =
    size === "xl"
      ? "text-[11px] sm:text-xs"
      : size === "lg"
        ? "text-[10px] sm:text-[11px]"
        : "text-[9px] sm:text-[10px]";

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <img
        src={mark}
        alt="Valoriza"
        className={`${dims} shrink-0 object-contain drop-shadow-[0_2px_10px_oklch(0.68_0.17_240/0.4)]`}
        width={816}
        height={816}
        loading="eager"
      />
      <div className="leading-none text-start" dir="ltr">
        <div className={`${title} font-black tracking-tight text-gold-gradient`}>Valoriza</div>
        {showTagline && (
          <div
            className={`${sub} mt-0.5 font-medium tracking-wide text-muted-foreground whitespace-nowrap`}
          >
            Invest Today .. Build Tomorrow
          </div>
        )}
      </div>
    </div>
  );
}
