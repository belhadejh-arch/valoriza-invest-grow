import { storedLanguage, translateLegacyText } from "./legacy-i18n";

const messages = {
  ar: {
    UNAUTHORIZED: "انتهت جلسة الدخول؛ سجّل الدخول مجددًا.",
    FORBIDDEN: "ليس لديك صلاحية لتنفيذ هذه العملية.",
    SERVICE_UNAVAILABLE: "تعذر الاتصال بالخادم أو تأكيد نتيجة العملية. حدّث البيانات قبل إعادة المحاولة.",
    DAILY_REWARD_UNAVAILABLE: "المكافأة اليومية غير متاحة حالياً. حاول لاحقاً.",
  },
  en: {
    UNAUTHORIZED: "Your session has expired. Please sign in again.",
    FORBIDDEN: "You do not have permission to perform this action.",
    SERVICE_UNAVAILABLE: "Unable to reach the server or confirm the result. Refresh the data before trying again.",
    DAILY_REWARD_UNAVAILABLE: "The daily reward is currently unavailable. Please try later.",
  },
  es: {
    UNAUTHORIZED: "Tu sesión ha caducado. Inicia sesión de nuevo.",
    FORBIDDEN: "No tienes permiso para realizar esta operación.",
    SERVICE_UNAVAILABLE: "No se pudo contactar con el servidor ni confirmar el resultado. Actualiza los datos antes de reintentar.",
    DAILY_REWARD_UNAVAILABLE: "La recompensa diaria no está disponible. Inténtalo más tarde.",
  },
};

export function requestErrorMessage(code: string) {
  const dictionary = messages[storedLanguage()];
  return code in dictionary
    ? dictionary[code as keyof typeof dictionary]
    : translateLegacyText(code);
}

export class BackendRequestError extends Error {
  constructor(public code: string, public status: number) {
    super(requestErrorMessage(code));
    this.name = "BackendRequestError";
  }
}

/** The global session handler already explains this error and opens sign-in. */
export function isSessionExpiredError(error: unknown) {
  return error instanceof BackendRequestError && error.code === "UNAUTHORIZED";
}
