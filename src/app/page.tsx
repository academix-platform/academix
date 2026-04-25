import Link from "next/link";

const HomePage = () => {
  return (
    <main className="flex flex-col justify-center items-center gap-4 bg-lamaSkyLight px-4 min-h-screen">
      <h1 className="font-semibold text-gray-800 text-3xl">Welcome</h1>
      <p className="text-gray-600">This is the Academix portal.</p>
      <Link
        href="/sign-in"
        className="bg-academixPurpleDark hover:opacity-90 px-5 py-2 rounded-md text-white transition"
      >
        Log In
      </Link>
    </main>
  );
};

export default HomePage;
