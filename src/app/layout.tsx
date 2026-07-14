import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

// Fraunces — soft, optical-size-aware display serif (boutique/fashion editorial feel).
// Used for hero + major section headlines via the `.font-display` utility.
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

// Plus Jakarta Sans — friendly geometric sans for body & UI (excellent legibility).
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FitMirror — AI Virtual Try-On Studio",
  description:
    "Snap any garment, upload your photo, and see how it looks on you — naturally. AI-rendered try-on with fit, size, color & styling intelligence. Free to start.",
  keywords: [
    "virtual try-on",
    "AI fashion",
    "dress fitting",
    "outfit preview",
    "FitMirror",
    "AI styling",
  ],
  authors: [{ name: "FitMirror" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "FitMirror — AI Virtual Try-On Studio",
    description:
      "See how any outfit looks on you before you buy. AI try-on + style report. Free to start.",
    siteName: "FitMirror",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fraunces.variable} ${jakarta.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
