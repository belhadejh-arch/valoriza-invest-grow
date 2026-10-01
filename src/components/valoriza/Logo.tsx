import React from "react";

export interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  variant?: "horizontal" | "stacked" | "mark";
  className?: string;
}

/**
 * High-Fidelity 3D Ribbon V & Upward Growth Arrow
 * Faithful vector reproduction of the Valoriza brand emblem uploaded by the user.
 */
export function ValorizaMarkIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} shrink-0`}
      aria-label="Valoriza Mark"
      role="img"
    >
      <defs>
        {/* Front Left Ribbon Gradient (Electric Cyan -> Royal Blue) */}
        <linearGradient id="vzLeftRibbon" x1="12%" y1="12%" x2="78%" y2="88%">
          <stop offset="0%" stopColor="#00D2FF" />
          <stop offset="28%" stopColor="#009BF9" />
          <stop offset="62%" stopColor="#0C56DB" />
          <stop offset="100%" stopColor="#073090" />
        </linearGradient>

        {/* Back Right Ribbon Gradient (Deep Cobalt -> Vibrant Blue -> Cyan edge) */}
        <linearGradient id="vzRightRibbon" x1="15%" y1="85%" x2="85%" y2="15%">
          <stop offset="0%" stopColor="#062B82" />
          <stop offset="35%" stopColor="#0B4ECC" />
          <stop offset="75%" stopColor="#1466F6" />
          <stop offset="100%" stopColor="#00C0FF" />
        </linearGradient>

        {/* Outer Bevel / Edge Highlight */}
        <linearGradient id="vzBevelHighlight" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0E54E0" />
          <stop offset="55%" stopColor="#00B8FF" />
          <stop offset="100%" stopColor="#60D5FF" />
        </linearGradient>

        {/* 3D Depth Inner Crease Shadow */}
        <linearGradient id="vzDeepShadow" x1="38%" y1="12%" x2="62%" y2="88%">
          <stop offset="0%" stopColor="#020D2B" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#051B52" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#082A78" stopOpacity="0" />
        </linearGradient>

        {/* Dynamic Upward Growth Arrow Gradient */}
        <linearGradient id="vzArrowTip" x1="10%" y1="90%" x2="90%" y2="10%">
          <stop offset="0%" stopColor="#0091FF" />
          <stop offset="50%" stopColor="#00C8FF" />
          <stop offset="100%" stopColor="#5AE2FF" />
        </linearGradient>

        {/* Soft Ambient Cyan Glow */}
        <filter id="vzBrandGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="5" stdDeviation="10" floodColor="#0099FF" floodOpacity="0.38" />
        </filter>
      </defs>

      <g filter="url(#vzBrandGlow)">
        {/* Right Arm / Back Ribbon */}
        <path
          d="M 238 315 C 265 260, 310 185, 342 128 C 346 120, 354 122, 356 130 L 358 152 C 328 206, 282 284, 252 324 C 244 332, 235 322, 238 315 Z"
          fill="url(#vzRightRibbon)"
        />

        {/* Right Arm Highlight Bevel Edge */}
        <path
          d="M 334 135 C 344 118, 352 118, 356 128 L 358 156 C 342 186, 312 240, 280 290 L 272 278 C 300 234, 324 180, 334 135 Z"
          fill="url(#vzBevelHighlight)"
          opacity="0.9"
        />

        {/* Front Left Ribbon / Main Wing */}
        <path
          d="M 122 108 C 140 102, 172 124, 194 170 C 216 216, 238 274, 248 304 C 254 322, 242 334, 230 328 C 208 312, 180 264, 154 204 C 134 158, 112 120, 122 108 Z"
          fill="url(#vzLeftRibbon)"
        />

        {/* Inner Fold Shadow for 3D Crease Depth */}
        <path
          d="M 188 165 C 208 210, 230 265, 244 298 C 236 290, 222 260, 206 220 C 194 190, 184 170, 188 165 Z"
          fill="url(#vzDeepShadow)"
        />

        {/* Dynamic Upward Growth Arrowhead */}
        <path
          d="M 318 92 L 384 72 L 362 128 L 350 110 L 334 116 L 318 92 Z"
          fill="url(#vzArrowTip)"
        />
      </g>
    </svg>
  );
}

export function Logo({
  size = "md",
  showTagline = true,
  variant = "horizontal",
  className = "",
}: LogoProps) {
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

  if (variant === "mark") {
    return (
      <div className={`inline-flex items-center justify-center select-none ${className}`}>
        <ValorizaMarkIcon className={dims} />
      </div>
    );
  }

  if (variant === "stacked") {
    return (
      <div className={`flex flex-col items-center select-none text-center ${className}`}>
        <ValorizaMarkIcon className={dims} />
        <div className="mt-1 leading-none tracking-tight font-black" dir="ltr">
          <span className="bg-gradient-to-r from-[#00D2FF] to-[#0B51D8] bg-clip-text text-transparent">
            V
          </span>
          <span className="text-white">alor</span>
          <span className="relative inline-block text-white">
            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-[#00D2FF] shadow-[0_0_6px_#00D2FF]" />
            ı
          </span>
          <span className="text-white">za</span>
        </div>
        {showTagline && (
          <div className={`${sub} mt-1 font-medium tracking-wide text-muted-foreground`}>
            Invest Today .. Build Tomorrow
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      {/* Brand Icon: 3D Ribbon V + Arrow */}
      <ValorizaMarkIcon className={dims} />

      {/* Brand Wordmark matching the exact typography and coloring from the user's logo */}
      <div className="leading-none text-start" dir="ltr">
        <div className={`${title} font-black tracking-tight flex items-baseline`}>
          {/* Stylized Gradient V */}
          <span className="bg-gradient-to-br from-[#00D2FF] via-[#0088FF] to-[#0B51D8] bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(0,180,255,0.4)]">
            V
          </span>
          {/* White letters "alor" */}
          <span className="text-white">alor</span>
          {/* "i" with the distinctive cyan dot */}
          <span className="relative inline-block text-white">
            <span
              className={`absolute left-1/2 -translate-x-1/2 rounded-full bg-[#00D2FF] shadow-[0_0_8px_#00D2FF] ${
                size === "xl"
                  ? "-top-2 h-2 w-2"
                  : size === "lg"
                    ? "-top-1.5 h-1.5 w-1.5"
                    : size === "sm"
                      ? "-top-1 h-1 w-1"
                      : "-top-1.5 h-1.5 w-1.5"
              }`}
            />
            ı
          </span>
          {/* White letters "za" */}
          <span className="text-white">za</span>
        </div>

        {showTagline && (
          <div
            className={`${sub} mt-0.5 font-medium tracking-wide text-muted-foreground/90 whitespace-nowrap hidden xs:block sm:block`}
          >
            Invest Today .. Build Tomorrow
          </div>
        )}
      </div>
    </div>
  );
}

export default Logo;
