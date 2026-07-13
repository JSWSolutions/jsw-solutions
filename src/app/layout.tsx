import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JSW Solutions — Industrial Laser & CNC Maintenance",
  description:
    "JSW Solutions provides industrial laser and CNC maintenance services throughout the Metro Detroit area. Based in Saline, Michigan.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
