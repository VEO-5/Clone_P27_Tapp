import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";

import { AppShell } from "@/components/layout/AppShell";
import { MockProvider } from "@/components/MockProvider";
import { SessionHeader } from "@/components/SessionHeader";

import "./globals.css";

const sans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const display = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "Sphere Support · Pearl 27",
    template: "%s · Pearl 27",
  },
  description:
    "Submit and track Sphere account issues with Pearl 27 System Support. Attach screenshots, get a reference, and follow every update.",
  applicationName: "Pearl 27 Sphere Support",
  icons: { icon: "/pearl27-logo.png" },
  openGraph: {
    title: "Sphere Support · Pearl 27",
    description: "Report a Sphere issue and track it end to end.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#FAF9F6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="relative flex min-h-full flex-col">
        <div className="relative z-10 flex min-h-full flex-1 flex-col">
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-iris-500 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
          >
            Skip to content
          </a>
          <AppShell>
            <MockProvider>
              <SessionHeader />
              <main id="main" className="flex-1">
                {children}
              </main>
            </MockProvider>
          </AppShell>
        </div>
      </body>
    </html>
  );
}
