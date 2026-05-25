import { BarChart3, Globe2, Shield } from "lucide-react";

const highlights = [
  {
    title: "Multilingual Support",
    description:
      "Optimized for English and Arabic with RTL-friendly layouts and localized content.",
    icon: Globe2,
  },
  {
    title: "Role-Based Access",
    description:
      "Secure dashboards and permissions for school admins, teachers, students, and guardians.",
    icon: Shield,
  },
  {
    title: "Real-Time Insights",
    description:
      "Track performance, attendance, and engagement with live dashboards and exports.",
    icon: BarChart3,
  },
];

const AboutSection = () => {
  return (
    <section id="about" className="mx-auto px-6 py-20 max-w-6xl">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-semibold text-3xl md:text-4xl tracking-tight">
          About Academix
        </h2>
        <p className="mt-4 text-slate-300">
          Academix connects every part of school administration into one unified
          system, from enrollment and attendance to assessments, grading, and
          communication.
        </p>
      </div>
      <div className="gap-6 grid md:grid-cols-3 mt-14">
        {highlights.map((item) => (
          <article
            key={item.title}
            className="bg-slate-900/50 p-6 border border-slate-800 rounded-xl text-center"
          >
            <div className="inline-flex justify-center items-center bg-academixPurple/10 mb-4 rounded-lg w-12 h-12 text-academixPurpleDark">
              <item.icon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-xl">{item.title}</h3>
            <p className="mt-2 text-slate-400 text-sm">{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default AboutSection;
