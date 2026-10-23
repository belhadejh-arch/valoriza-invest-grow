const dictionaries: Record<"en" | "es", Record<string, string>> = { en: {}, es: {} };
const createTemplateRules = (dictionary: Record<string, string>) => Object.entries(dictionary).filter(([key]) => /\{\d+\}/.test(key)).map(([key, value]) => {
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
const templateRules: Record<"en" | "es", ReturnType<typeof createTemplateRules>> = { en: [], es: [] };
const languageLoads = new Map<string, Promise<void>>();

/** Load the selected language before importing routes and their module-level copy. */
export function loadLegacyLanguage(language: "ar" | "en" | "es"): Promise<void> {
  if (language === "ar") return Promise.resolve();
  const existing = languageLoads.get(language);
  if (existing) return existing;
  const loading = (language === "en"
    ? import("./locales/en-legacy.json")
    : import("./locales/es-legacy.json")
  ).then((module) => {
    dictionaries[language] = module.default;
    templateRules[language] = createTemplateRules(module.default);
  }).catch((error) => {
    languageLoads.delete(language);
    throw error;
  });
  languageLoads.set(language, loading);
  return loading;
}
export function storedLanguage(): "ar" | "en" | "es" {
  try {
    const value = localStorage.getItem("valoriza_language");
    return value === "en" || value === "es" ? value : "ar";
  }
  catch { return "ar"; }
}
export const currentDirection = () => storedLanguage() === "ar" ? "rtl" : "ltr";
export const currentLocale = () => ({ ar: "ar-DZ", en: "en-US", es: "es-ES" })[storedLanguage()];

/** Translates only known interface copy, never arbitrary user-supplied text. */
export function translateLegacyText(text: string, values: unknown[] = [], language = storedLanguage()): string {
  const key = text.replace(/\s+/g, " ").trim();
  const dictionary = language === "ar" ? undefined : dictionaries[language];
  let translated = dictionary?.[key] ?? key;
  if (language !== "ar" && !dictionary?.[key] && /[\u0600-\u06ff]/.test(key)) {
    for (const rule of templateRules[language]) {
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
  if (storedLanguage() === "ar") return value;
  if (typeof value === "string") return (copyFields.has(field) ? translateLegacyText(value) : value) as T;
  if (Array.isArray(value)) return value.map((item) => localizeResponse(item, field)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localizeResponse(item, key)])) as T;
  }
  return value;
}
