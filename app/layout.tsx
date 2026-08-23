import type { Metadata } from "next";
import { Bowlby_One, Inter } from "next/font/google";
import "./globals.css";

const bowlby = Bowlby_One({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "School Thik Karo — Ground Report",
  description: "CJP's live map of School Thik Karo audits — flagged, in progress, resolved.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bowlby.variable} ${inter.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
