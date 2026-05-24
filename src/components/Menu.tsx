"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import {
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle,
  ClipboardCheck,
  ClipboardList,
  Layers,
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
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { NavigationLink } from "./NavigationLink";
import { getRoleHome } from "@/lib/utils";

type MenuItem = {
  icon: LucideIcon;
  label: string;
  href: string | ((role: string) => string);
  shouldPrefetch?: boolean;
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
        href: (role) => getRoleHome(role as Parameters<typeof getRoleHome>[0]),
        shouldPrefetch: true,
        visible: ["admin", "teacher", "student", "parent", "superAdmin"],
      },
      {
        icon: School,
        label: "Schools",
        href: "/super-admin",
        visible: [],
      },
      {
        icon: GraduationCap,
        label: "Teachers",
        href: "/list/teachers",
        shouldPrefetch: true,
        visible: ["admin"],
      },
      {
        icon: User,
        label: "Students",
        href: "/list/students",
        shouldPrefetch: true,
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
        visible: ["admin", "student", "teacher", "parent"],
      },
      {
        icon: School,
        label: "Classes",
        href: "/list/classes",
        visible: ["admin", "teacher"],
      },
      {
        icon: Layers,
        label: "Grades",
        href: "/list/grades",
        visible: ["admin"],
      },
      {
        icon: ClipboardList,
        label: "Schedules",
        href: "/list/lessons",
        shouldPrefetch: true,
        visible: ["admin"],
      },
      {
        icon: FileText,
        label: "Exams",
        href: "/list/exams",
        shouldPrefetch: true,
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: ClipboardCheck,
        label: "Assignments",
        href: "/list/assignments",
        shouldPrefetch: true,
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: BarChart3,
        label: "Results",
        href: "/list/results",
        shouldPrefetch: true,
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: CheckCircle,
        label: "Attendance",
        href: "/list/attendance",
        visible: ["admin", "teacher"],
      },
      {
        icon: Calendar,
        label: "Events",
        href: "/list/events",
        shouldPrefetch: true,
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
        shouldPrefetch: true,
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
        visible: ["admin"],
      },
      {
        icon: LogOut,
        label: "Logout",
        href: "/sign-in",
        visible: ["admin", "teacher", "student", "parent", "superAdmin"],
      },
    ],
  },
];

type AuthUser = {
  userId: string;
  role: string | null;
  schoolId: number;
} | null;

const Menu = ({ authUser }: { authUser: AuthUser }) => {
  const { signOut } = useClerk();
  const { user, isLoaded } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const fallbackRole = authUser?.role ?? null;

  const role =
    (isLoaded &&
      ((user?.publicMetadata as { role?: string } | undefined)?.role ??
        null)) ||
    fallbackRole;

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ redirectUrl: "/sign-in" }).catch(() => {
      setIsSigningOut(false);
    });
  };

  const resolvedMenuItems = useMemo(
    () =>
      menuItems.map((section) => ({
        ...section,
        items: section.items.map((item) => ({
          ...item,
          href:
            typeof item.href === "function"
              ? role
                ? item.href(role)
                : "#"
              : item.href,
        })),
      })),
    [role],
  );

  const visibleItems = useMemo(
    () =>
      resolvedMenuItems
        .flatMap((section) => section.items)
        .filter((item) => role && item.visible.includes(role)),
    [resolvedMenuItems, role],
  );

  useEffect(() => {
    const keyRoutes = visibleItems
      .filter((item) => item.shouldPrefetch && item.href !== pathname)
      .map((item) => item.href)
      .slice(0, 6);

    if (keyRoutes.length === 0) return;

    const prefetchRoutes = () => {
      keyRoutes.forEach((href) => router.prefetch(href));
    };

    if ("requestIdleCallback" in window) {
      const idleCallbackId = window.requestIdleCallback(prefetchRoutes);

      return () => window.cancelIdleCallback(idleCallbackId);
    }

    const timeoutId = setTimeout(prefetchRoutes, 300);

    return () => clearTimeout(timeoutId);
  }, [pathname, router, visibleItems]);

  if (!role) {
    return <div className="mt-4 text-sm" />;
  }
  return (
    <div className="mt-4 text-sm">
      {resolvedMenuItems.map((section) => (
        <div key={section.title} className="flex flex-col gap-2">
          <span className="hidden lg:block my-4 font-light text-gray-400">
            {section.title}
          </span>

          {section.items.map((item) => {
            if (!item.visible.includes(role)) return null;

            if (item.label === "Logout") {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="group relative flex justify-center lg:justify-start items-center gap-4 hover:bg-academixSkyLight disabled:opacity-70 md:px-2 py-2 rounded-md w-full text-gray-500 text-left transition-colors duration-200"
                >
                  <item.icon
                    size={20}
                    className="w-5 h-5 text-gray-500 group-hover:text-academixPurpleDark transition-colors"
                  />

                  <span className="hidden lg:block text-gray-500 group-hover:text-academixPurpleDark transition-colors">
                    {isSigningOut ? "Signing out..." : item.label}
                  </span>
                </button>
              );
            }

            const isActive =
              item.href === `/${role}`
                ? pathname === `/${role}`
                : pathname.startsWith(item.href);

            return (
              <NavigationLink
                href={item.href}
                key={item.label}
                prefetch={item.shouldPrefetch ?? true}
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
              </NavigationLink>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default Menu;
