import { useCallback } from "react";
import { translations, useI18n, type LanguageCode } from "./i18n";

export type LocalizedContentVariants = Partial<Record<LanguageCode, string>>;

export interface LocalizedContentOptions {
  /** Locale of the original authored string; Arabic is the default source locale. */
  sourceLanguage?: LanguageCode;
  /** Explicitly allow an untranslated language-neutral code such as USDT or BEP20. */
  allowLanguageNeutral?: boolean;
  /** Explicitly allow an untranslated user-provided identifier such as a username. */
  allowUserIdentifier?: boolean;
  /** Override the translated unavailable-content label. */
  unavailableText?: string;
}

/**
 * Selects an explicitly authored locale variant. Missing translations are never
 * silently shown in the source language unless a caller opts into that behavior.
 */
export function localizeAuthoredContent(
  content: string | LocalizedContentVariants | null | undefined,
  language: LanguageCode,
  options: LocalizedContentOptions = {},
): string {
  const sourceLanguage = options.sourceLanguage ?? "ar";
  const unavailable =
    options.unavailableText ??
    (translations[language] as Record<string, string>)["content.unavailable"];

  if (content == null) return unavailable;

  if (typeof content === "string") {
    if (language === sourceLanguage || options.allowLanguageNeutral || options.allowUserIdentifier) {
      return content;
    }
    return unavailable;
  }

  const localized = content[language];
  if (typeof localized === "string" && localized.length > 0) return localized;

  const source = content[sourceLanguage];
  if (
    typeof source === "string" &&
    source.length > 0 &&
    (language === sourceLanguage || options.allowLanguageNeutral || options.allowUserIdentifier)
  ) {
    return source;
  }

  return unavailable;
}

/** Hook-bound form that always uses the active app locale and its placeholder. */
export function useLocalizedContent() {
  const { lang, t } = useI18n();
  return useCallback(
    (content: string | LocalizedContentVariants | null | undefined, options: LocalizedContentOptions = {}) =>
      localizeAuthoredContent(content, lang, {
        ...options,
        unavailableText: t("content.unavailable"),
      }),
    [lang, t],
  );
}