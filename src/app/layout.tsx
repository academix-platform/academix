import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ToastContainer } from "react-toastify";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Academix - School Management & Assessment System",
  description: "Next.js School Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClerkProvider
          signInFallbackRedirectUrl="/post-login"
          signInForceRedirectUrl="/post-login"
        >
          {children}
          <ToastContainer position="bottom-right" theme="dark" />
        </ClerkProvider>
      </body>
    </html>
  );
}
