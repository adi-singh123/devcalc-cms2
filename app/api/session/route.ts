import { authenticated, clearSession, COOKIE, isSecureConnection, passwordValid, sameOrigin, setSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  return Response.json({ authenticated: await authenticated() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const isForm = request.headers.get("content-type")?.includes("application/x-www-form-urlencoded") ?? false;
  const browserOrigin = request.headers.get("origin");

  if (!(await sameOrigin(request))) {
    if (isForm) {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  let password = "";
  if (isForm) {
    const formData = await request.formData().catch(() => new FormData());
    password = String(formData.get("password") ?? "");
  } else {
    const body = await request.json().catch(() => null);
    password = typeof body?.password === "string" ? body.password : "";
  }

  const reply = (error: string, status: number, reason: string) => {
    if (isForm) {
      return NextResponse.redirect(new URL(`/?login=${reason}`, browserOrigin ?? request.url), 303);
    }
    return NextResponse.json({ error }, { status });
  };

  if (!password || password.length > 512) {
    return reply("Invalid credentials", 401, "invalid");
  }

  try {
    if (!passwordValid(password)) {
      return reply("Invalid credentials", 401, "invalid");
    }

    // Verify database is accessible
    await db().execute("SELECT 1 FROM blog_posts LIMIT 1");

    // Establish session cookie
    const sessionValue = await setSession(request);
    const secure = isSecureConnection(request);

    if (isForm) {
      const redirectRes = NextResponse.redirect(new URL("/", browserOrigin ?? request.url), 303);
      redirectRes.cookies.set(COOKIE, sessionValue, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: 12 * 3600,
      });
      return redirectRes;
    }

    const jsonRes = NextResponse.json({ ok: true });
    jsonRes.cookies.set(COOKIE, sessionValue, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 12 * 3600,
    });
    return jsonRes;
  } catch (error) {
    console.error("CMS login configuration or database error:", error);
    return reply("CMS configuration or database is unavailable", 503, "unavailable");
  }
}

export async function DELETE(request: Request) {
  if (!(await sameOrigin(request))) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  await clearSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE);
  return res;
}
