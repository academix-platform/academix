import Image from "next/image";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const ProfilePage = async () => {
  const user = await requireAuth();

  if (user.role === "admin") {
    const profile = await prisma.admin.findUnique({
      where: { id: user.userId },
      include: { school: true },
    });

    if (!profile) return <div className="p-6">Profile not found</div>;

    return (
      <ProfileLayout image={null} name={profile.username}>
        <Info title="Admin Username" value={profile.username} />
        <Info title="School Name" value={profile.school.name} />
        <Info title="School ID" value={profile.school.id} />
        <Info
          title="Created At"
          value={profile.school.createdAt.toLocaleDateString()}
        />
        <Info
          title="Updated At"
          value={profile.school.updatedAt.toLocaleDateString()}
        />
      </ProfileLayout>
    );
  }

  if (user.role === "teacher") {
    const profile = await prisma.teacher.findUnique({
      where: { id: user.userId },
      include: { school: true, subjects: true, classes: true },
    });

    if (!profile) return <div className="p-6">Profile not found</div>;

    return (
      <ProfileLayout image={profile.img} name={profile.name}>
        <Info title="Name" value={profile.name} />
        <Info title="Username" value={profile.username} />
        <Info title="Email" value={profile.email} />
        <Info title="Phone" value={profile.phone} />
        <Info title="Address" value={profile.address} />
        <Info title="Blood Type" value={profile.bloodType} />
        <Info title="Gender" value={profile.sex} />
        <Info
          title="Birthday"
          value={profile.birthday.toLocaleDateString()}
        />
        <Info
          title="Subjects"
          value={profile.subjects.map((s) => s.name).join(", ")}
        />
        <Info
          title="Classes"
          value={profile.classes.map((c) => c.name).join(", ")}
        />
        <Info title="School" value={profile.school.name} />
      </ProfileLayout>
    );
  }

  if (user.role === "student") {
    const profile = await prisma.student.findUnique({
      where: { id: user.userId },
      include: { school: true, grade: true, class: true, parent: true },
    });

    if (!profile) return <div className="p-6">Profile not found</div>;

    return (
      <ProfileLayout image={profile.img} name={profile.name}>
        <Info title="Name" value={profile.name} />
        <Info title="Username" value={profile.username} />
        <Info title="Email" value={profile.email} />
        <Info title="Phone" value={profile.phone} />
        <Info title="Address" value={profile.address} />
        <Info title="Blood Type" value={profile.bloodType} />
        <Info title="Gender" value={profile.sex} />
        <Info
          title="Birthday"
          value={profile.birthday.toLocaleDateString()}
        />
        <Info title="Grade" value={profile.grade.level} />
        <Info title="Class" value={profile.class.name} />
        <Info title="Status" value={profile.status} />
        <Info title="Parent" value={profile.parent?.name} />
        <Info title="School" value={profile.school.name} />
      </ProfileLayout>
    );
  }

  const profile = await prisma.parent.findUnique({
    where: { id: user.userId },
    include: { school: true, students: true },
  });

  if (!profile) return <div className="p-6">Profile not found</div>;

  return (
    <ProfileLayout image={null} name={profile.name}>
      <Info title="Name" value={profile.name} />
      <Info title="Username" value={profile.username} />
      <Info title="Email" value={profile.email} />
      <Info title="Phone" value={profile.phone} />
      <Info title="Address" value={profile.address} />
      <Info
        title="Children"
        value={profile.students.map((s) => s.name).join(", ")}
      />
      <Info title="School" value={profile.school.name} />
    </ProfileLayout>
  );
};

const ProfileLayout = ({
  image,
  name,
  children,
}: {
  image: string | null;
  name: string;
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
              alt="Profile"
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
}: {
  title: string;
  value?: React.ReactNode;
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
        {value || "Not provided"}
      </p>
    </div>
  );
};

export default ProfilePage;