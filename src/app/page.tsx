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
    <div className="min-h-screen bg-canvas text-content-primary selection:bg-brandPurple-100 selection:text-brandPurple-900">
      <HomeNavbar />
      <main>
        <HeroSection />
        <AboutSection />
        <FeaturesSection />
        <RolesSection />
        <HowItWorksSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;
