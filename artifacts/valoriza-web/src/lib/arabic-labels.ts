export function arabicVipLabel(value?: string | null, fallbackLevel?: number): string {
  const label = value?.trim();
  if (!label) {
    return fallbackLevel
      ? `المستوى المميز ${fallbackLevel}`
      : "العضوية المميزة";
  }

  const numberedLevel = label.match(/^VIP\s*(\d+)(?:\s*[-–—].*)?$/i);
  if (numberedLevel) return `المستوى المميز ${numberedLevel[1]}`;

  return label.replace(/\bVIP\b/gi, "العضوية المميزة");
}

export function arabicFundLabel(value?: string | null): string {
  const label = value?.trim();
  if (!label) return "صندوق التوفير";

  return label
    .replace(/\bMUMBAI\b/gi, "مومباي")
    .replace(/\bNEW\s*MEXICO\b/gi, "نيو مكسيكو")
    .replace(/\bGXR\b/gi, "جي إكس آر")
    .replace(/\bNBL\b/gi, "إن بي إل");
}
