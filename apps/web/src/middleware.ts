import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/design-preview") && process.env.NODE_ENV === "production") {
    return NextResponse.rewrite(new URL("/404", request.url));
  }
  return await updateSession(request);
}

export const config = {
  // Run on all routes except static assets and image optimisation.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
