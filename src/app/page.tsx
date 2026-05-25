import HeroSection from "@/components/home/HeroSection";
import AboutSection from "@/components/home/AboutSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import RolesSection from "@/components/home/RolesSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import CtaSection from "@/components/home/CtaSection";
import Footer from "@/components/home/Footer";
import HomeNavbar from "@/components/home/HomeNavbar";

const HomePage = () => {
  return (
    <main className="bg-[#061026] overflow-x-hidden text-white">
      <div className="relative flex flex-col items-center bg-[rgba(124,58,237,0.15)]">
        <HomeNavbar />
        <HeroSection />
        <div className="custom-shape-divider-bottom-1779710312">
          <svg
            data-name="Layer 1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path
              d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
              className="shape-fill"
            ></path>
          </svg>
        </div>
      </div>
      <AboutSection />
      <FeaturesSection />
      <RolesSection />
      <HowItWorksSection />
      <CtaSection />
      <Footer />
    </main>
  );
};

export default HomePage;
