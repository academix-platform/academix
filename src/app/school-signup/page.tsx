import SchoolSignupForm from "@/components/SchoolSignupForm";

export default function SchoolSignupPage() {
  return (
    <div className="flex justify-center items-center bg-lamaSkyLight p-4 min-h-screen">
      <div className="bg-white shadow-xl p-8 rounded-xl w-full max-w-md">
        <h1 className="mb-2 font-bold text-2xl">School Signup</h1>
        <p className="mb-6 text-gray-600 text-sm">
          Register your school admin account. Your request will stay pending until a super admin approves it.
        </p>
        <SchoolSignupForm />
      </div>
    </div>
  );
}
