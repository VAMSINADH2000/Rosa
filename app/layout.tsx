import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rosa — Consejera Agrícola Bilingüe",
  description:
    "Asesora bilingüe (español / inglés) por voz y por foto para agricultores hispanos del suroeste de EE.UU. Diagnóstico de plantas con visión IA, citas reales de NMSU Extension, y contexto del clima en vivo.",
  applicationName: "Rosa",
  openGraph: {
    title: "Rosa — Consejera Agrícola Bilingüe",
    description:
      "Voz + foto + guías NMSU + clima local. Para los 84,000+ agricultores hispanos en EE.UU.",
    type: "website",
    locale: "es_MX",
    alternateLocale: ["en_US"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0d8b43",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${inter.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-background text-foreground font-sans"
      >
        {children}
      </body>
    </html>
  );
}
