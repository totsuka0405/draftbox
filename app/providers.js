// app/providers.js
"use client";
import { I18nProvider } from "@/lib/i18n";

export default function Providers({ children, defaultLang = "ja" }) {
  return <I18nProvider defaultLang={defaultLang}>{children}</I18nProvider>;
}
