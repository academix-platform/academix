"use client";

import { role } from "@/lib/data";
import {
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageCircle,
  School,
  Settings,
  User,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type MenuItem = {
  icon: LucideIcon;
  label: string;
  href: string;
  visible: string[];
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

export const menuItems: MenuSection[] = [
  {
    title: "MENU",
    items: [
      {
        icon: LayoutDashboard,
        label: "Dashboard",
        href: `/${role}`,
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: GraduationCap,
        label: "Teachers",
        href: "/list/teachers",
        visible: ["admin", "teacher"],
      },
      {
        icon: User,
        label: "Students",
        href: "/list/students",
        visible: ["admin", "teacher"],
      },
      {
        icon: UsersRound,
        label: "Parents",
        href: "/list/parents",
        visible: ["admin", "teacher"],
      },
      {
        icon: BookOpen,
        label: "Subjects",
        href: "/list/subjects",
        visible: ["admin"],
      },
      {
        icon: School,
        label: "Classes",
        href: "/list/classes",
        visible: ["admin", "teacher"],
      },
      {
        icon: ClipboardList,
        label: "Lessons",
        href: "/list/lessons",
        visible: ["admin", "teacher"],
      },
      {
        icon: FileText,
        label: "Exams",
        href: "/list/exams",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: ClipboardCheck,
        label: "Assignments",
        href: "/list/assignments",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: BarChart3,
        label: "Results",
        href: "/list/results",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: CheckCircle,
        label: "Attendance",
        href: "/list/attendance",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: Calendar,
        label: "Events",
        href: "/list/events",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: MessageCircle,
        label: "Messages",
        href: "/list/messages",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: Megaphone,
        label: "Announcements",
        href: "/list/announcements",
        visible: ["admin", "teacher", "student", "parent"],
      },
    ],
  },
  {
    title: "OTHER",
    items: [
      {
        icon: User,
        label: "Profile",
        href: "/profile",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: Settings,
        label: "Settings",
        href: "/settings",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: LogOut,
        label: "Logout",
        href: "/logout",
        visible: ["admin", "teacher", "student", "parent"],
      },
    ],
  },
];

const Menu = () => {
  const pathname = usePathname();

  return (
    <div className="mt-4 text-sm">
      {menuItems.map((section) => (
        <div key={section.title} className="flex flex-col gap-2">
          <span className="hidden lg:block my-4 font-light text-gray-400">
            {section.title}
          </span>

          {section.items.map((item) => {
            if (!item.visible.includes(role)) return null;

            const isActive =
              item.href === `/${role}`
                ? pathname === `/${role}`
                : pathname.startsWith(item.href);

            return (
              <Link
                href={item.href}
                key={item.label}
                className={`
                  relative group flex items-center justify-center lg:justify-start gap-4 py-2 md:px-2 rounded-md
                  transition-colors duration-200
                  ${
                    isActive
                      ? "bg-academixPurpleLight"
                      : "text-gray-500 hover:bg-academixSkyLight"
                  }
                `}
              >
                {isActive && (
                  <span className="top-0 left-0 absolute bg-academixPurpleDark rounded-r w-1 h-full" />
                )}

                <item.icon
                  size={20}
                  className={`
                    w-5 h-5 transition-colors
                    ${
                      isActive
                        ? "text-academixPurpleDark"
                        : "text-gray-500 group-hover:text-academixPurpleDark"
                    }
                  `}
                />

                <span
                  className={`
                    hidden lg:block transition-colors
                    ${
                      isActive
                        ? "text-academixPurpleDark font-medium"
                        : "text-gray-500 group-hover:text-academixPurpleDark"
                    }
                  `}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default Menu;
