import type { Metadata } from "next";
import { Nunito, Fredoka } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";

const nunito = Nunito({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

const fredoka = Fredoka({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "USONet | USO Dashboard",
  description: "USO Net phase 2 visit plan by department - USONet by NBTC",
  keywords: "USO, Wi-Fi, visit plan, NBTC, Chaiyaphum, Nakhon Ratchasima",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="dark" suppressHydrationWarning>
      <body className={`${nunito.variable} ${fredoka.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
