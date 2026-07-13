import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
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
