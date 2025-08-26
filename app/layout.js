// app/layout.js
import "./globals.css";
import "easymde/dist/easymde.min.css";
import { Geist, Geist_Mono } from "next/font/google";
import Providers from "./providers";
import NavBar from "@/components/NavBar";
import { cookies } from "next/headers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = { title: "DraftBox", description: "Lightweight markdown drafts" };

export default function RootLayout({ children }) {
  // Cookieの i18n_lang を取得（なければ ja）
  const langCookie = cookies().get("i18n_lang")?.value;
  const initialLang = langCookie === "en" ? "en" : "ja";

  return (
    <html lang={initialLang}>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {/* Provider に初期言語を渡す → サーバーとクライアントで一致 */}
        <Providers defaultLang={initialLang}>
          <NavBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
