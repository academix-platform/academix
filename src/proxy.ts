import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { routePermissions } from "./lib/settings";
import { NextResponse } from "next/server";

const isSignInRoute = createRouteMatcher(["/sign-in(.*)"]);

const matchers = Object.keys(routePermissions).map((r) => {
  return {
    matcher: createRouteMatcher(r),
    allowedRoles: routePermissions[r],
  };
});

type AllowedRole = (typeof matchers)[number]["allowedRoles"][number];

export default clerkMiddleware(async (auth, req) => {
  const { sessionClaims, userId } = await auth();

  const role = (sessionClaims?.metadata as { role?: AllowedRole })?.role;

  // Skip the sign-in page entirely for authenticated users.
  if (isSignInRoute(req) && userId) {
    return NextResponse.redirect(new URL(role ? `/${role}` : "/", req.url));
  }

  for (const { matcher, allowedRoles } of matchers) {
    if (matcher(req) && (!role || !allowedRoles.includes(role))) {
      return NextResponse.redirect(
        new URL(role ? `/${role}` : "/sign-in", req.url),
      );
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
