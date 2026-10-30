import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SL Website Publish — Discover independent digital projects",
  description:
    "Explore websites and Android apps submitted by independent creators and reviewed by Nithish Studio.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
