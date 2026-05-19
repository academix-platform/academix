import SchoolSignupForm from "@/components/SchoolSignupForm";

export default function SchoolSignupPage() {
  return (
    <div className="flex justify-center items-center bg-lamaSkyLight p-4 min-h-screen">
      <div className="bg-white shadow-xl p-8 rounded-xl w-full max-w-md">
        <SchoolSignupForm />
      </div>
    </div>
  );
}
