import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { routePermissions } from "./lib/settings";
import { NextResponse } from "next/server";

type AllowedRole = string;

const isSignInRoute = createRouteMatcher(["/sign-in(.*)"]);
const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/api/webhooks(.*)"]);

const matchers = (
  Object.entries(routePermissions) as [string, AllowedRole[]][]
).map(([route, allowedRoles]) => ({
  matcher: createRouteMatcher([route]),
  allowedRoles,
}));

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  const role =
    (sessionClaims?.metadata as { role?: AllowedRole } | undefined)?.role ??
    null;

  const isSignIn = isSignInRoute(req);
  const isPublic = isPublicRoute(req);

  // ✅ 1. If already signed in, don't stay on /sign-in
  if (isSignIn && userId) {
    const redirectUrl =
      req.nextUrl.searchParams.get("redirect_url") || (role ? `/${role}` : "/");

    return NextResponse.redirect(new URL(redirectUrl, req.url));
  }

  // ✅ 2. Allow public routes always
  if (isPublic) {
    return NextResponse.next();
  }

  // ✅ 3. If user not ready yet → DON'T redirect immediately (fixes your bug)
  if (!userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  // ✅ 4. Role-based protection
  for (const { matcher, allowedRoles } of matchers) {
    if (matcher(req)) {
      if (!role || !allowedRoles.includes(role)) {
        const dest = role ? `/${role}` : "/unauthorized";
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
  ],
};
