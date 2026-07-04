import { BarChart3, Globe2, Shield } from "lucide-react";
import { getTranslations } from "next-intl/server";

const highlights = [
  {
    key: "multilingual",
    icon: Globe2,
  },
  {
    key: "roleAccess",
    icon: Shield,
  },
  {
    key: "insights",
    icon: BarChart3,
  },
];

const AboutSection = async () => {
  const t = await getTranslations("home.about");

  return (
    <section id="about" className="mx-auto px-6 py-20 max-w-6xl">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-semibold text-3xl md:text-4xl tracking-tight">
          {t("title")}
        </h2>
        <p className="mt-4 text-purple-50">
          {t("description")}
        </p>
      </div>
      <div className="gap-6 grid md:grid-cols-3 mt-14">
        {highlights.map((item) => (
          <article
            key={item.key}
            className="bg-academixPurpleDeep/65 p-6 border border-purple-200/25 rounded-xl text-center"
          >
            <div className="inline-flex justify-center items-center bg-academixPurple/10 mb-4 rounded-lg w-12 h-12 text-academixPurpleDark">
              <item.icon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-xl">
              {t(`highlights.${item.key}.title`)}
            </h3>
            <p className="mt-2 text-purple-100 text-sm">
              {t(`highlights.${item.key}.description`)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default AboutSection;
