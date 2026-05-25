"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const HomeNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { label: "Home", href: "#" },
    { label: "About", href: "#about" },
    { label: "Features", href: "#features" },
    { label: "Roles", href: "#roles" },
    { label: "How It Works", href: "#how-it-works" },
  ];

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Navbar */}
      <nav className="top-0 right-0 left-0 z-50 fixed backdrop-blur-sm">
        <div className="mx-auto px-12 lg:px-24 py-5">
          <div className="flex justify-between items-center">
            <a
              href="#"
              className="inline-flex justify-center items-center font-bold text-xl"
            >
              <h1 className="flex items-center gap-2 font-bold text-white text-xl">
                <Image
                  src="/logo-white.png"
                  alt="Academix logo"
                  className="w-[44px] h-[34px] rotate-[-15deg]"
                  width={40}
                  height={40}
                />
                ACADEMIX
              </h1>
            </a>

            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-slate-300 hover:text-white transition-colors duration-200"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/sign-in"
                className="text-slate-300 hover:text-white transition-colors duration-200"
              >
                Sign In
              </Link>
              <Link
                href="/school-signup"
                className="bg-academixPurpleDark hover:bg-academixPurpleDark/90 hover:shadow-[0_10px_25px_rgba(124,58,237,0.35)] px-4 py-2 rounded-md font-medium text-white transition-all duration-300"
              >
                Sign Up
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={toggleMenu}
              className="md:hidden text-white hover:text-slate-300 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="z-40 fixed inset-0 bg-black/50 transition-opacity duration-300"
          onClick={closeMenu}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-[#040b1a] border-l border-slate-800 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Close button */}
        <button
          onClick={closeMenu}
          className="top-4 right-4 absolute text-slate-300 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Sidebar content */}
        <div className="space-y-4 px-4 pt-16">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={closeMenu}
              className="block hover:bg-slate-800/50 px-4 py-3 rounded-lg text-slate-300 hover:text-white transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}

          <div className="space-y-3 pt-4 border-slate-800 border-t">
            <Link
              href="/sign-in"
              onClick={closeMenu}
              className="block hover:bg-slate-800/50 px-4 py-3 rounded-lg text-slate-300 hover:text-white transition-colors duration-200"
            >
              Sign In
            </Link>
            <Link
              href="/school-signup"
              onClick={closeMenu}
              className="block hover:bg-slate-800/50 px-4 py-3 rounded-lg text-slate-300 hover:text-white transition-colors duration-200"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default HomeNavbar;
