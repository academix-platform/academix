import Image from "next/image";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Clock,
  Droplet,
  GraduationCap,
  Hash,
  Mail,
  MapPin,
  Phone,
  School,
  User,
  Users,
  Activity,
  BookOpen,
  AtSign,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

const ProfilePage = async () => {
  const t = await getTranslations("profile");
  const rolesT = await getTranslations("roles");
  const sidebarT = await getTranslations("sidebar.items");
  const locale = await getLocale();
  const user = await requireAuth();

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);

  if (user.role === "admin") {
    const profile = await prisma.admin.findUnique({
      where: { id: user.userId },
      include: { school: true },
    });

    if (!profile) return <div className="p-6">{t("notFound")}</div>;

    return (
      <ProfileShell
        breadcrumbLabel={sidebarT("profile")}
        image={null}
        name={profile.username}
        roleLabel={rolesT("admin")}
        avatarAlt={t("avatarAlt")}
        subtitle={profile.school.name}
      >
        <ProfileSection icon={School} title={t("sections.schoolInfo")}>
          <Info
            icon={AtSign}
            title={t("fields.adminUsername")}
            value={profile.username}
            fallback={t("notProvided")}
          />
          <Info
            icon={School}
            title={t("fields.schoolName")}
            value={profile.school.name}
            fallback={t("notProvided")}
          />
          <Info
            icon={Hash}
            title={t("fields.schoolId")}
            value={String(profile.school.id)}
            fallback={t("notProvided")}
          />
          <Info
            icon={Calendar}
            title={t("fields.createdAt")}
            value={formatDate(profile.school.createdAt)}
            fallback={t("notProvided")}
          />
          <Info
            icon={Clock}
            title={t("fields.updatedAt")}
            value={formatDate(profile.school.updatedAt)}
            fallback={t("notProvided")}
          />
        </ProfileSection>
      </ProfileShell>
    );
  }

  if (user.role === "teacher") {
    const profile = await prisma.teacher.findUnique({
      where: { id: user.userId },
      include: { school: true, subjects: true, classes: true },
    });

    if (!profile) return <div className="p-6">{t("notFound")}</div>;

    return (
      <ProfileShell
        breadcrumbLabel={sidebarT("profile")}
        image={profile.img}
        name={profile.name}
        roleLabel={rolesT("teacher")}
        avatarAlt={t("avatarAlt")}
        subtitle={profile.school.name}
      >
        <ProfileSection icon={User} title={t("sections.personalInfo")}>
          <Info icon={User} title={t("fields.name")} value={profile.name} fallback={t("notProvided")} />
          <Info icon={AtSign} title={t("fields.username")} value={`@${profile.username}`} fallback={t("notProvided")} />
          <Info icon={Mail} title={t("fields.email")} value={profile.email} fallback={t("notProvided")} />
          <Info icon={Phone} title={t("fields.phone")} value={profile.phone} isPhone fallback={t("notProvided")} />
          <Info icon={MapPin} title={t("fields.address")} value={profile.address} fallback={t("notProvided")} />
          <Info icon={Droplet} title={t("fields.bloodType")} value={profile.bloodType} fallback={t("notProvided")} />
          <Info icon={User} title={t("fields.gender")} value={profile.sex} fallback={t("notProvided")} />
          <Info
            icon={Calendar}
            title={t("fields.birthday")}
            value={profile.birthday ? formatDate(profile.birthday) : undefined}
            fallback={t("notProvided")}
          />
        </ProfileSection>

        <ProfileSection icon={School} title={t("sections.schoolInfo")}>
          <Info icon={School} title={t("fields.school")} value={profile.school.name} fallback={t("notProvided")} />
          <Info
            icon={BookOpen}
            title={t("fields.subjects")}
            value={profile.subjects.map((s) => s.name).join(", ")}
            fallback={t("notProvided")}
          />
          <Info
            icon={School}
            title={t("fields.classes")}
            value={profile.classes.map((c) => c.name).join(", ")}
            fallback={t("notProvided")}
          />
        </ProfileSection>
      </ProfileShell>
    );
  }

  if (user.role === "student") {
    const profile = await prisma.student.findUnique({
      where: { id: user.userId },
      include: { school: true, grade: true, class: true, parent: true },
    });

    if (!profile) return <div className="p-6">{t("notFound")}</div>;

    return (
      <ProfileShell
        breadcrumbLabel={sidebarT("profile")}
        image={profile.img}
        name={profile.name}
        roleLabel={rolesT("student")}
        avatarAlt={t("avatarAlt")}
        subtitle={profile.class ? `${profile.school.name} • Class ${profile.class.name}` : profile.school.name}
      >
        <ProfileSection icon={User} title={t("sections.personalInfo")}>
          <Info icon={User} title={t("fields.name")} value={profile.name} fallback={t("notProvided")} />
          <Info icon={AtSign} title={t("fields.username")} value={`@${profile.username}`} fallback={t("notProvided")} />
          <Info icon={Mail} title={t("fields.email")} value={profile.email} fallback={t("notProvided")} />
          <Info icon={Phone} title={t("fields.phone")} value={profile.phone} isPhone fallback={t("notProvided")} />
          <Info icon={MapPin} title={t("fields.address")} value={profile.address} fallback={t("notProvided")} />
          <Info icon={Droplet} title={t("fields.bloodType")} value={profile.bloodType} fallback={t("notProvided")} />
          <Info icon={User} title={t("fields.gender")} value={profile.sex} fallback={t("notProvided")} />
          <Info
            icon={Calendar}
            title={t("fields.birthday")}
            value={profile.birthday ? formatDate(profile.birthday) : undefined}
            fallback={t("notProvided")}
          />
          <Info icon={Users} title={t("fields.parent")} value={profile.parent?.name} fallback={t("notProvided")} />
        </ProfileSection>

        <ProfileSection icon={School} title={t("sections.schoolInfo")}>
          <Info icon={School} title={t("fields.school")} value={profile.school.name} fallback={t("notProvided")} />
          <Info icon={GraduationCap} title={t("fields.grade")} value={profile.grade?.level} fallback={t("notProvided")} />
          <Info icon={School} title={t("fields.class")} value={profile.class?.name} fallback={t("notProvided")} />
          <Info icon={Activity} title={t("fields.status")} value={profile.status} fallback={t("notProvided")} />
        </ProfileSection>
      </ProfileShell>
    );
  }

  const profile = await prisma.parent.findUnique({
    where: { id: user.userId },
    include: { school: true, students: true },
  });

  if (!profile) return <div className="p-6">{t("notFound")}</div>;

  return (
    <ProfileShell
      breadcrumbLabel={sidebarT("profile")}
      image={null}
      name={profile.name}
      roleLabel={rolesT("parent")}
      avatarAlt={t("avatarAlt")}
      subtitle={profile.school.name}
    >
      <ProfileSection icon={User} title={t("sections.personalInfo")}>
        <Info icon={User} title={t("fields.name")} value={profile.name} fallback={t("notProvided")} />
        <Info icon={AtSign} title={t("fields.username")} value={`@${profile.username}`} fallback={t("notProvided")} />
        <Info icon={Mail} title={t("fields.email")} value={profile.email} fallback={t("notProvided")} />
        <Info icon={Phone} title={t("fields.phone")} value={profile.phone} isPhone fallback={t("notProvided")} />
        <Info icon={MapPin} title={t("fields.address")} value={profile.address} fallback={t("notProvided")} />
      </ProfileSection>

      <ProfileSection icon={School} title={t("sections.schoolInfo")}>
        <Info icon={School} title={t("fields.school")} value={profile.school.name} fallback={t("notProvided")} />
        <Info
          icon={Users}
          title={t("fields.children")}
          value={profile.students.map((s) => s.name).join(", ")}
          fallback={t("notProvided")}
        />
      </ProfileSection>
    </ProfileShell>
  );
};

const ProfileShell = ({
  breadcrumbLabel,
  image,
  name,
  roleLabel,
  avatarAlt,
  subtitle,
  children,
}: {
  breadcrumbLabel: string;
  image: string | null;
  name: string;
  roleLabel: string;
  avatarAlt: string;
  subtitle?: string;
  children: React.ReactNode;
}) => {
  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumbs
        items={[
          { label: breadcrumbLabel, isCurrent: true },
        ]}
      />

      {/* Hero Profile Card */}
      <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-surface border border-outline/80 rounded-2xl p-6 md:p-8 shadow-2xs overflow-hidden bg-gradient-to-br from-brandPurple-50/40 via-surface to-surface dark:from-brandPurple-950/20 dark:via-surface dark:to-surface">
        <div className="relative shrink-0">
          <Image
            src={image || "/avatar.png"}
            alt={avatarAlt}
            width={112}
            height={112}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-outline/80 shadow-xs"
          />
        </div>

        <div className="flex-1 flex flex-col justify-between gap-3 min-w-0 w-full text-center sm:text-start">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h1 className="font-bold text-2xl sm:text-3xl text-content-primary tracking-tight truncate">
                {name}
              </h1>
              <Badge variant="primary" size="md">
                {roleLabel}
              </Badge>
            </div>
            {subtitle && (
              <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-content-muted">
                <School className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{subtitle}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Details Sections */}
      <div className="space-y-8">
        {children}
      </div>
    </div>
  );
};

const ProfileSection = ({
  icon: Icon,
  title,
  children,
}: {
  icon?: React.ElementType;
  title: string;
  children: React.ReactNode;
}) => {
  return (
    <section className="space-y-3.5">
      <div className="flex items-center gap-2 px-1">
        {Icon && (
          <div className="w-6 h-6 rounded-md flex items-center justify-center bg-brandPurple-50 dark:bg-brandPurple-950/50 text-brandPurple-600 dark:text-brandPurple-400 border border-brandPurple-100 dark:border-brandPurple-900/40 shrink-0">
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
        <h2 className="text-xs sm:text-sm font-bold text-content-primary uppercase tracking-wider">
          {title}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {children}
      </div>
    </section>
  );
};

const Info = ({
  icon: Icon,
  title,
  value,
  fallback,
  isPhone = false,
}: {
  icon: React.ElementType;
  title: string;
  value?: React.ReactNode;
  fallback: string;
  isPhone?: boolean;
}) => {
  return (
    <div className="bg-surface border border-outline/80 rounded-2xl p-5 shadow-2xs hover:border-brandPurple-200 dark:hover:border-brandPurple-800 transition-all flex flex-col justify-between gap-2.5">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-brandPurple-50 dark:bg-brandPurple-950/50 text-brandPurple-600 dark:text-brandPurple-400 border border-brandPurple-100 dark:border-brandPurple-900/40 shrink-0">
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-content-muted truncate">
          {title}
        </span>
      </div>

      <p
        className={cn(
          "font-bold text-base sm:text-lg text-content-primary tracking-tight break-words",
          !value && "text-content-muted font-normal text-sm"
        )}
        dir={isPhone ? "ltr" : undefined}
      >
        {value || fallback}
      </p>
    </div>
  );
};

export default ProfilePage;
