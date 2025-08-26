// app/s/[token]/layout.js

export const metadata = {
  robots: { index: false, follow: false }, 
};

export default function SharedDraftLayout({ children }) {
  return <>{children}</>;
}
