import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Layout from "@/components/Layout";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://www.pokoparty.com";
const SITE_NAME = "PokoParty - 포코파티";
const SITE_DESCRIPTION =
  "포켓몬 스토리 공략에 최적화된 파티를 추천받으세요. 포켓몬 타입 상성, 기술폭, 입수시기를 분석하여 최적의 파티를 구성합니다.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | PokoParty`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "포코파티",
    "pokoparty",
    "포켓몬 파티 추천",
    "포켓몬 공략",
    "포켓몬 파티 구성",
    "포켓몬 타입 상성",
    "포켓몬 스토리 공략",
    "포켓몬 추천",
    "pokemon party",
    "pokemon team builder",
  ],
  icons: {
    icon: "/favicon-p.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "PokoParty - 포코파티",
              url: "https://www.pokoparty.com",
              description: SITE_DESCRIPTION,
              applicationCategory: "GameApplication",
              operatingSystem: "Web",
              inLanguage: "ko",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "KRW",
              },
            }),
          }}
        />
        <AuthProvider>
          <Layout>{children}</Layout>
        </AuthProvider>
      </body>
    </html>
  );
}
