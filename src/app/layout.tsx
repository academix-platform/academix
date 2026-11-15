import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { arSA } from "@clerk/localizations";
import { ToastContainer } from "react-toastify";
import { getLocale, getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";

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
  const isRtl = locale === "ar";

  return (
    <html lang={locale} dir={isRtl ? "rtl" : "ltr"}>
      <body className={isRtl ? "font-arabic" : "font-sans"}>
        <ClerkProvider
          localization={isRtl ? arSA : undefined}
          signInFallbackRedirectUrl="/post-login"
          signInForceRedirectUrl="/post-login"
        >
          <NextIntlClientProvider messages={messages}>
            {children}
            <ToastContainer
              position={isRtl ? "bottom-left" : "bottom-right"}
              theme="dark"
              rtl={isRtl}
            />
          </NextIntlClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
