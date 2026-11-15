import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

const Footer = async () => {
  const commonT = await getTranslations("common");
  const t = await getTranslations("home.footer");

  return (
    <footer className="border-t border-outline bg-surface text-content-secondary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <Image
                src="/logo-purple.png"
                alt="Academix logo"
                className="w-8 h-7 object-contain rotate-[-12deg]"
                width={32}
                height={28}
              />
              <span className="font-bold text-xl text-content-primary tracking-tight">
                {commonT("brand")}
              </span>
            </Link>
            <p className="text-content-secondary text-sm leading-relaxed max-w-sm">
              {t("tagline")}
            </p>
            <div className="flex items-center gap-2 text-xs text-content-muted pt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{t("operational")}</span>
            </div>
          </div>

          {/* Platform Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-content-primary">
              {t("platformTitle")}
            </h4>
            <ul className="space-y-2 text-sm text-content-secondary">
              <li>
                <a href="#about" className="hover:text-content-primary transition-colors">
                  {t("about")}
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-content-primary transition-colors">
                  {t("features")}
                </a>
              </li>
              <li>
                <a href="#roles" className="hover:text-content-primary transition-colors">
                  {t("roles")}
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-content-primary transition-colors">
                  {t("howItWorks")}
                </a>
              </li>
            </ul>
          </div>

          {/* Quick Access */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-content-primary">
              {t("portalsTitle")}
            </h4>
            <ul className="space-y-2 text-sm text-content-secondary">
              <li>
                <Link href="/sign-in" className="hover:text-content-primary transition-colors">
                  {t("signIn")}
                </Link>
              </li>
              <li>
                <Link href="/school-signup" className="hover:text-content-primary transition-colors">
                  {t("registerSchool")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-outline flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-content-muted">
          <p>{t("copyright")}</p>
          <div className="flex items-center gap-6">
            <span>{t("bilingualNote")}</span>
            <span>{t("complianceNote")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
