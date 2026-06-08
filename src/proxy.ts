import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { routePermissions } from "./lib/settings";
import { getRoleHome, type UserRole } from "./lib/utils";

const isSignInRoute = createRouteMatcher(["/sign-in(.*)"]);
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/api/webhooks(.*)",
  "/school-signup(.*)",
  "/api/cron(.*)",
]);

const matchers = (
  Object.entries(routePermissions) as [string, UserRole[]][]
).map(([route, allowedRoles]) => ({
  matcher: createRouteMatcher([route]),
  allowedRoles,
}));

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  // تحديد أن مسارات الـ API والـ Cron لا تحتاج لفحص Clerk
  const isCronRoute = createRouteMatcher(['/api/cron(.*)']);

  // إذا كان الطلب لمسار الكرون، اتركه يمر دون أي تدخل من Clerk
  if (isCronRoute(req)) {
    return;
  }
  const role =
    (sessionClaims?.metadata as { role?: UserRole } | undefined)?.role ?? null;

  const isSignIn = isSignInRoute(req);
  const isPublic = isPublicRoute(req);
  const isRoot = req.nextUrl.pathname === "/";

  const shouldUsePostLogin =
    role === "admin" ||
    role === "teacher" ||
    role === "student" ||
    role === "parent";

  if (
    role === "superAdmin" &&
    (req.nextUrl.pathname.startsWith("/list/") ||
      req.nextUrl.pathname.startsWith("/settings"))
  ) {
    return NextResponse.redirect(new URL("/super-admin", req.url));
  }

  if (isSignIn && userId) {
    const redirectUrl = req.nextUrl.searchParams.get("redirect_url");
    if (redirectUrl) {
      return NextResponse.redirect(new URL(redirectUrl, req.url));
    }

    if (role) {
      const destination = shouldUsePostLogin
        ? "/post-login"
        : getRoleHome(role);
      return NextResponse.redirect(new URL(destination, req.url));
    }

    // Keep user on /sign-in loading view until role is available.
    return NextResponse.next();
  }

  if (isRoot && userId) {
    if (role) {
      const destination = shouldUsePostLogin
        ? "/post-login"
        : getRoleHome(role);
      return NextResponse.redirect(new URL(destination, req.url));
    }
    return NextResponse.redirect(new URL("/post-login", req.url));
  }

  if (isPublic) {
    return NextResponse.next();
  }

  if (!userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  for (const { matcher, allowedRoles } of matchers) {
    if (matcher(req)) {
      if (!role || !allowedRoles.includes(role)) {
        const dest = role ? getRoleHome(role) : "/unauthorized";
        return NextResponse.redirect(new URL(dest, req.url));
      }
      break;
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
  ],
};
