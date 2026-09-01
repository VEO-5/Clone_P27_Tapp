import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, JetBrains_Mono } from "next/font/google";

import { Aurora } from "@/components/Aurora";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getEmployeeSession } from "@/lib/employeeAuth";

import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const employee = await getEmployeeSession();

  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="relative flex min-h-full flex-col">
        <Aurora />
        <div className="relative z-10 flex min-h-full flex-1 flex-col">
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-iris-500 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
          >
            Skip to content
          </a>
          <SiteHeader employeeEmail={employee?.email ?? null} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
