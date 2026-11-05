import Image from "next/image";
import Link from "next/link";
import SignOutToSignInButton from "@/components/SignOutToSignInButton";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function UnauthorizedPage() {
  const t = await getTranslations("states");
  const commonT = await getTranslations("common");

  return (
    <div className="relative flex flex-col justify-between items-center bg-canvas p-4 sm:p-6 min-h-screen overflow-hidden text-content-primary">
      {/* Subtle Ambient Violet Glow */}
      <div
        aria-hidden="true"
        className="absolute top-0 inset-x-0 h-[480px] bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(124,58,237,0.08),transparent_70%)] pointer-events-none"
      />

      {/* Header bar */}
      <header className="relative z-10 w-full max-w-5xl mx-auto flex items-center justify-between py-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-surface hover:bg-surface-muted border border-outline text-content-secondary hover:text-content-primary text-xs sm:text-sm font-medium shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>{t("backHome")}</span>
        </Link>
        <LanguageSwitcher variant="compact" />
      </header>

      {/* Main card */}
      <div className="z-10 relative shadow-xl p-8 sm:p-10 border border-outline bg-surface rounded-2xl md:rounded-3xl w-full max-w-lg text-center my-auto">
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <Image
            src="/logo-purple.png"
            alt="Academix logo"
            className="w-9 h-7 object-contain rotate-[-12deg]"
            width={36}
            height={28}
          />
          <span className="font-bold text-2xl tracking-wide text-content-primary">
            {commonT("brand")}
          </span>
        </div>

        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-6 shadow-2xs">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h1 className="mb-3 font-bold text-2xl sm:text-3xl tracking-tight text-content-primary">
          {t("unauthorizedTitle")}
        </h1>
        <p className="text-sm text-content-secondary leading-relaxed max-w-sm mx-auto">
          {t("unauthorizedDescription")}
        </p>

        <div className="mt-8 pt-6 border-t border-outline flex flex-wrap items-center justify-center gap-3">
          <SignOutToSignInButton />
          <Link href="/">
            <Button variant="secondary" size="md" className="whitespace-nowrap">
              <span>{t("backHome")}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center py-4 text-xs text-content-muted">
        <span>{commonT("copyright")}</span>
      </footer>
    </div>
  );
}
