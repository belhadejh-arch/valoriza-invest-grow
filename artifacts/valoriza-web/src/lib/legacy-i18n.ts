import english from "./locales/en-legacy.json";

const dictionary = english as Record<string, string>;
const templateRules = Object.entries(dictionary).filter(([key]) => /\{\d+\}/.test(key)).map(([key, value]) => {
  const indices: number[] = [];
  const pattern = key.split(/(\{\d+\})/).map((part) => {
    if (/^\{\d+\}$/.test(part)) {
      indices.push(Number(part.slice(1, -1)));
      return "(.+?)";
    }
    return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }).join("");
  return { pattern: new RegExp(`^${pattern}$`), value, indices };
});
export function storedLanguage(): "ar" | "en" {
  try { return localStorage.getItem("valoriza_language") === "en" ? "en" : "ar"; }
  catch { return "ar"; }
}
export const currentDirection = () => storedLanguage() === "ar" ? "rtl" : "ltr";
export const currentLocale = () => storedLanguage() === "ar" ? "ar-DZ" : "en-US";

/** Translates only known interface copy, never arbitrary user-supplied text. */
export function translateLegacyText(text: string, values: unknown[] = [], language = storedLanguage()): string {
  const key = text.replace(/\s+/g, " ").trim();
  let translated = language === "en" ? (dictionary[key] ?? key) : key;
  if (language === "en" && !dictionary[key] && /[\u0600-\u06ff]/.test(key)) {
    for (const rule of templateRules) {
      const match = key.match(rule.pattern);
      if (!match) continue;
      translated = rule.value.replace(/\{(\d+)\}/g, (part, index) => {
        const position = rule.indices.indexOf(Number(index));
        return position < 0 ? part : match[position + 1];
      });
      break;
    }
  }
  return translated.replace(/\{(\d+)\}/g, (placeholder, index) => {
    const value = values[Number(index)];
    return value === undefined ? placeholder : String(value);
  });
}

const copyFields = new Set([
  "message", "title", "title_ar", "description", "description_ar", "label", "label_ar",
  "name", "name_ar", "vipName", "vipRequirement", "about_company", "rejectReason",
]);
export function localizeResponse<T>(value: T, field = ""): T {
  if (storedLanguage() !== "en") return value;
  if (typeof value === "string") return (copyFields.has(field) ? translateLegacyText(value) : value) as T;
  if (Array.isArray(value)) return value.map((item) => localizeResponse(item, field)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localizeResponse(item, key)])) as T;
  }
  return value;
}
