import Image from "next/image";

const Footer = () => {
  return (
    <footer className="border-slate-800 border-t">
      <div className="flex sm:flex-row flex-col justify-between items-center gap-4 mx-auto px-24 py-8 text-slate-400 text-sm">
        <a href="#" className="flex items-center gap-2">
          <Image
            src="/logo-white.png"
            alt="Academix logo"
            className="w-[25px] h-[20px] rotate-[-15deg]"
            width={25}
            height={20}
          />
          <p className="font-semibold text-slate-200">Academix</p>
        </a>
        <p>© 2026 Academix. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
