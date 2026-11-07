import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Geist: la misma tipografía del logotipo (local, funciona offline en la PWA)
const geist = localFont({ src: "./fonts/GeistVF.woff", variable: "--font-geist", weight: "100 900" });
const geistMono = localFont({ src: "./fonts/GeistMonoVF.woff", variable: "--font-geist-mono", weight: "100 900" });

export const metadata: Metadata = {
  title: "Shark Life",
  description: "Tu sistema operativo de vida: finanzas, hábitos, metas y propósito.",
  manifest: "/manifest.json",
  applicationName: "Shark Life",
  appleWebApp: { capable: true, title: "Shark Life", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};
export const viewport: Viewport = { themeColor: "#081523" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`dark ${geist.variable} ${geistMono.variable}`}>
      <body className="font-sans bg-ocean-950 text-ocean-100 antialiased">{children}</body>
    </html>
  );
}
