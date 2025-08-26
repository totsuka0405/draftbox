// app/privacy/layout.js
export const metadata = {
  title: "プライバシーポリシー / Privacy Policy - DraftBox",
  alternates: { languages: { "ja": "/privacy", "en": "/privacy" } },
  robots: { index: true, follow: true },
};
export default function PrivacyLayout({ children }) { return <>{children}</>; }
