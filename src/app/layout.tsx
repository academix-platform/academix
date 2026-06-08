import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ToastContainer } from "react-toastify";
import { getLocale, getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Academix - School Management & Assessment System",
  description: "Next.js School Management System",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <body className={inter.className}>
        <ClerkProvider
          signInFallbackRedirectUrl="/post-login"
          signInForceRedirectUrl="/post-login"
        >
          <NextIntlClientProvider messages={messages}>
            {children}
            <ToastContainer position="bottom-right" theme="dark" />
          </NextIntlClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
