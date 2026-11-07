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
  MessageSquare,
  School,
  Settings,
  User,
  UsersRound,
  Archive,
  Bell,
  type LucideIcon,
  Percent,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { NavigationLink } from "./NavigationLink";
import { getRoleHome } from "@/lib/utils";
import { useTranslations } from "next-intl";

type MenuItem = {
  icon: LucideIcon;
  labelKey: string;
  href: string | ((role: string) => string);
  shouldPrefetch?: boolean;
  visible: string[];
};

type MenuSection = {
  titleKey: string;
  items: MenuItem[];
};

export const menuItems: MenuSection[] = [
  {
    titleKey: "main",
    items: [
      {
        icon: LayoutDashboard,
        labelKey: "dashboard",
        href: (role) => getRoleHome(role as Parameters<typeof getRoleHome>[0]),
        shouldPrefetch: true,
        visible: ["admin", "teacher", "student", "parent", "superAdmin"],
      },
      {
        icon: School,
        labelKey: "schools",
        href: "/super-admin",
        visible: [],
      },
      {
        icon: GraduationCap,
        labelKey: "teachers",
        href: "/list/teachers",
        shouldPrefetch: true,
        visible: ["admin"],
      },
      {
        icon: User,
        labelKey: "students",
        href: "/list/students",
        shouldPrefetch: true,
        visible: ["admin", "teacher"],
      },
      {
        icon: UsersRound,
        labelKey: "parents",
        href: "/list/parents",
        visible: ["admin", "teacher"],
      },
      {
        icon: BookOpen,
        labelKey: "subjects",
        href: "/list/subjects",
        visible: ["admin", "student", "teacher", "parent"],
      },
      {
        icon: School,
        labelKey: "classes",
        href: "/list/classes",
        visible: ["admin", "teacher"],
      },
      {
        icon: Layers,
        labelKey: "grades",
        href: "/list/grades",
        visible: ["admin"],
      },
      {
        icon: ClipboardList,
        labelKey: "schedules",
        href: "/list/lessons",
        shouldPrefetch: true,
        visible: ["admin"],
      },
      {
        icon: FileText,
        labelKey: "exams",
        href: "/list/exams",
        shouldPrefetch: true,
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: ClipboardCheck,
        labelKey: "assignments",
        href: "/list/assignments",
        shouldPrefetch: true,
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: BarChart3,
        labelKey: "results",
        href: "/list/results",
        shouldPrefetch: true,
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: Percent,
        labelKey: "finalResults",
        href: "/list/final-results",
        shouldPrefetch: true,
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: CheckCircle,
        labelKey: "attendance",
        href: "/list/attendance",
        visible: ["admin", "teacher"],
      },
      {
        icon: Calendar,
        labelKey: "events",
        href: "/list/events",
        shouldPrefetch: true,
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: MessageCircle,
        labelKey: "messages",
        href: "/list/messages",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: Megaphone,
        labelKey: "announcements",
        href: "/list/announcements",
        shouldPrefetch: true,
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: Bell,
        labelKey: "notifications",
        href: "/list/notifications",
        shouldPrefetch: true,
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: Archive,
        labelKey: "archive",
        href: "/archive",
        visible: ["admin"],
      },
      {
        icon: MessageSquare,
        labelKey: "feedback",
        href: "/feedback",
        visible: ["student", "parent"],
      },
      {
        icon: MessageSquare,
        labelKey: "feedbacks",
        href: "/admin/feedbacks",
        visible: ["admin"],
      },
    ],
  },
  {
    titleKey: "other",
    items: [
      {
        icon: User,
        labelKey: "profile",
        href: "/profile",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: Settings,
        labelKey: "settings",
        href: "/settings",
        visible: ["admin"],
      },
      {
        icon: LogOut,
        labelKey: "logout",
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

const Menu = ({
  authUser,
  collapsed = false,
  onNavigate,
}: {
  authUser: AuthUser;
  collapsed?: boolean;
  onNavigate?: () => void;
}) => {
  const t = useTranslations("sidebar");
  const actionsT = useTranslations("actions");
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
    return <div className="mt-2 text-sm" />;
  }

  return (
    <nav aria-label="Sidebar Navigation" className="flex flex-col gap-4 text-sm">
      {resolvedMenuItems.map((section) => (
        <div key={section.titleKey} className="flex flex-col gap-1">
          <span
            className={`block px-2.5 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-content-muted select-none ${
              collapsed ? "lg:hidden" : ""
            }`}
          >
            {t(`sections.${section.titleKey}`)}
          </span>

          {section.items.map((item) => {
            if (!item.visible.includes(role)) return null;

            const label = t(`items.${item.labelKey}`);

            if (item.labelKey === "logout") {
              return (
                <button
                  key={item.labelKey}
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  title={collapsed ? label : undefined}
                  className={`
                    group relative flex items-center ${collapsed ? "lg:justify-center p-2.5" : "justify-start px-3 py-2 gap-3"}
                    w-full rounded-xl text-sm font-medium transition-all duration-150 text-content-secondary hover:text-rose-600 hover:bg-rose-50/80
                    disabled:opacity-60 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500
                  `}
                >
                  <item.icon
                    size={18}
                    className="w-[18px] h-[18px] shrink-0 text-content-muted group-hover:text-rose-600 transition-colors duration-150"
                  />

                  <span
                    className={`
                      truncate transition-colors duration-150
                      ${collapsed ? "lg:hidden" : "block"}
                    `}
                  >
                    {isSigningOut ? actionsT("signingOut") : label}
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
                key={item.labelKey}
                prefetch={item.shouldPrefetch ?? true}
                onClick={onNavigate}
                title={collapsed ? label : undefined}
                className={`
                  relative group flex items-center ${collapsed ? "lg:justify-center p-2.5" : "justify-start px-3 py-2 gap-3"}
                  rounded-xl text-sm font-medium transition-all duration-150 active:scale-[0.98]
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandPurple-500 focus-visible:ring-offset-1
                  ${
                    isActive
                      ? "bg-brandPurple-50 text-brandPurple-700 font-semibold border border-brandPurple-200/80 shadow-2xs"
                      : "text-content-secondary hover:text-content-primary hover:bg-surface-muted"
                  }
                `}
              >
                <item.icon
                  size={18}
                  className={`
                    w-[18px] h-[18px] shrink-0 transition-colors duration-150
                    ${
                      isActive
                        ? "text-brandPurple-600"
                        : "text-content-muted group-hover:text-content-primary"
                    }
                  `}
                />

                <span
                  className={`
                    truncate transition-colors duration-150
                    ${collapsed ? "lg:hidden" : "block"}
                  `}
                >
                  {label}
                </span>
              </NavigationLink>
            );
          })}
        </div>
      ))}
    </nav>
  );
};

export default Menu;