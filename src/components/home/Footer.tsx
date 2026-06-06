import Image from "next/image";
import { getTranslations } from "next-intl/server";

const Footer = async () => {
  const commonT = await getTranslations("common");
  const t = await getTranslations("home.footer");

  return (
    <footer className="border-purple-200/20 border-t">
      <div className="flex sm:flex-row flex-col justify-between items-center gap-4 mx-auto px-24 py-8 text-purple-100 text-sm">
        <a href="#" className="flex items-center gap-2">
          <Image
            src="/logo-white.png"
            alt="Academix logo"
            className="w-[25px] h-[20px] rotate-[-15deg]"
            width={25}
            height={20}
          />
          <p className="font-semibold text-purple-100">{commonT("brand")}</p>
        </a>
        <p>{t("copyright")}</p>
      </div>
    </footer>
  );
};

export default Footer;
