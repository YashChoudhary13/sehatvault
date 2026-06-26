import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { clientEnv } from "@/lib/env";

// Paths reachable without a session. Everything else requires auth (ADR-019 email OTP).
// "/" is the public marketing landing; the authenticated dashboard lives at "/home".
const PUBLIC_PATHS = ["/login", "/api/auth/callback"];
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

function isPublic(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

function unauthenticatedApiResponse(): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: "unauthenticated",
        message: "Authentication required",
        details: null,
      },
    },
    {
      status: 401,
      headers: NO_STORE_HEADERS,
    },
  );
}

/**
 * Refreshes the Supabase session on every request and enforces route protection:
 * unauthenticated API requests receive a 401 JSON response; page routes still redirect to /login.
 * Authenticated users are kept out of /login.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL ?? "",
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() validates the JWT with the auth server and refreshes if needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (!user && !isPublic(path)) {
    if (isApiPath(path)) {
      return unauthenticatedApiResponse();
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return response;
}
