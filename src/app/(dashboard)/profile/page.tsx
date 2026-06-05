import Image from "next/image";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

const ProfilePage = async () => {
  const t = await getTranslations("profile");
  const user = await requireAuth();

  if (user.role === "admin") {
    const profile = await prisma.admin.findUnique({
      where: { id: user.userId },
      include: { school: true },
    });

    if (!profile) return <div className="p-6">{t("notFound")}</div>;

    return (
      <ProfileLayout image={null} name={profile.username} avatarAlt={t("avatarAlt")}>
        <Info title={t("fields.adminUsername")} value={profile.username} fallback={t("notProvided")} />
        <Info title={t("fields.schoolName")} value={profile.school.name} fallback={t("notProvided")} />
        <Info title={t("fields.schoolId")} value={profile.school.id} fallback={t("notProvided")} />
        <Info
          title={t("fields.createdAt")}
          value={profile.school.createdAt.toLocaleDateString()}
          fallback={t("notProvided")}
        />
        <Info
          title={t("fields.updatedAt")}
          value={profile.school.updatedAt.toLocaleDateString()}
          fallback={t("notProvided")}
        />
      </ProfileLayout>
    );
  }

  if (user.role === "teacher") {
    const profile = await prisma.teacher.findUnique({
      where: { id: user.userId },
      include: { school: true, subjects: true, classes: true },
    });

    if (!profile) return <div className="p-6">{t("notFound")}</div>;

    return (
      <ProfileLayout image={profile.img} name={profile.name} avatarAlt={t("avatarAlt")}>
        <Info title={t("fields.name")} value={profile.name} fallback={t("notProvided")} />
        <Info title={t("fields.username")} value={profile.username} fallback={t("notProvided")} />
        <Info title={t("fields.email")} value={profile.email} fallback={t("notProvided")} />
        <Info title={t("fields.phone")} value={profile.phone} fallback={t("notProvided")} />
        <Info title={t("fields.address")} value={profile.address} fallback={t("notProvided")} />
        <Info title={t("fields.bloodType")} value={profile.bloodType} fallback={t("notProvided")} />
        <Info title={t("fields.gender")} value={profile.sex} fallback={t("notProvided")} />
        <Info
          title={t("fields.birthday")}
          value={profile.birthday.toLocaleDateString()}
          fallback={t("notProvided")}
        />
        <Info
          title={t("fields.subjects")}
          value={profile.subjects.map((s) => s.name).join(", ")}
          fallback={t("notProvided")}
        />
        <Info
          title={t("fields.classes")}
          value={profile.classes.map((c) => c.name).join(", ")}
          fallback={t("notProvided")}
        />
        <Info title={t("fields.school")} value={profile.school.name} fallback={t("notProvided")} />
      </ProfileLayout>
    );
  }

  if (user.role === "student") {
    const profile = await prisma.student.findUnique({
      where: { id: user.userId },
      include: { school: true, grade: true, class: true, parent: true },
    });

    if (!profile) return <div className="p-6">{t("notFound")}</div>;

    return (
      <ProfileLayout image={profile.img} name={profile.name} avatarAlt={t("avatarAlt")}>
        <Info title={t("fields.name")} value={profile.name} fallback={t("notProvided")} />
        <Info title={t("fields.username")} value={profile.username} fallback={t("notProvided")} />
        <Info title={t("fields.email")} value={profile.email} fallback={t("notProvided")} />
        <Info title={t("fields.phone")} value={profile.phone} fallback={t("notProvided")} />
        <Info title={t("fields.address")} value={profile.address} fallback={t("notProvided")} />
        <Info title={t("fields.bloodType")} value={profile.bloodType} fallback={t("notProvided")} />
        <Info title={t("fields.gender")} value={profile.sex} fallback={t("notProvided")} />
        <Info
          title={t("fields.birthday")}
          value={profile.birthday.toLocaleDateString()}
          fallback={t("notProvided")}
        />
        <Info title={t("fields.grade")} value={profile.grade.level} fallback={t("notProvided")} />
        <Info title={t("fields.class")} value={profile.class.name} fallback={t("notProvided")} />
        <Info title={t("fields.status")} value={profile.status} fallback={t("notProvided")} />
        <Info title={t("fields.parent")} value={profile.parent?.name} fallback={t("notProvided")} />
        <Info title={t("fields.school")} value={profile.school.name} fallback={t("notProvided")} />
      </ProfileLayout>
    );
  }

  const profile = await prisma.parent.findUnique({
    where: { id: user.userId },
    include: { school: true, students: true },
  });

  if (!profile) return <div className="p-6">{t("notFound")}</div>;

  return (
    <ProfileLayout image={null} name={profile.name} avatarAlt={t("avatarAlt")}>
      <Info title={t("fields.name")} value={profile.name} fallback={t("notProvided")} />
      <Info title={t("fields.username")} value={profile.username} fallback={t("notProvided")} />
      <Info title={t("fields.email")} value={profile.email} fallback={t("notProvided")} />
      <Info title={t("fields.phone")} value={profile.phone} fallback={t("notProvided")} />
      <Info title={t("fields.address")} value={profile.address} fallback={t("notProvided")} />
      <Info
        title={t("fields.children")}
        value={profile.students.map((s) => s.name).join(", ")}
        fallback={t("notProvided")}
      />
      <Info title={t("fields.school")} value={profile.school.name} fallback={t("notProvided")} />
    </ProfileLayout>
  );
};

const ProfileLayout = ({
  image,
  name,
  avatarAlt,
  children,
}: {
  image: string | null;
  name: string;
  avatarAlt: string;
  children: React.ReactNode;
}) => {
  return (
    <div className="p-4 md:p-8 bg-[#f4f7fb] min-h-screen">
      <div className="max-w-6xl mx-auto bg-white rounded-[32px] shadow-[0_10px_60px_rgba(0,0,0,0.08)] overflow-hidden border border-gray-100">

        {/* Banner */}
       <div className="h-44 bg-gradient-to-r from-[#7c3aed] via-[#7c3aed] to-[#c026d3]" />

        <div className="px-6 md:px-10 pb-10">
          <div className="flex flex-col items-center -mt-24">

            <Image
              src={image || "/avatar.png"}
              alt={avatarAlt}
              width={170}
              height={170}
              className="
                rounded-full
                object-cover
                border-[6px]
                border-white
                shadow-[0_20px_60px_rgba(0,0,0,0.18)]
                ring-4
                ring-blue-100
              "
            />

            <h2
              className="
                  mt-5
    text-2xl
    font-extrabold
    text-center
    bg-gradient-to-r
    from-violet-600
    via-fuchsia-500
    to-pink-500
    bg-clip-text
    text-transparent
              "
            >
              {name}
            </h2>
          </div>

          <div className="mt-10">
            

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Info = ({
  title,
  value,
  fallback,
}: {
  title: string;
  value?: React.ReactNode;
  fallback: string;
}) => {
  return (
    <div
      className="
        bg-white
        hover:-translate-y-1
        transition-all
        duration-300
        border
        border-gray-200
        rounded-2xl
        p-5
        shadow-sm
        hover:shadow-xl
      "
    >
      <p className="text-sm text-gray-500 font-medium">
        {title}
      </p>

      <p className="text-base font-semibold text-gray-800 mt-2 break-words">
        {value || fallback}
      </p>
    </div>
  );
};

export default ProfilePage;
