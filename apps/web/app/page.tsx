import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

interface AccessTokenPayload {
  userId: string;
  username: string;
  email: string | null;
  platformRole?: "USER" | "ADMIN";
}
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured for Next.js");
  }
  return new TextEncoder().encode(secret);
}
export default async function RootPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    redirect("/login");
  }

  let destination = "/login";

  try {
    const { payload } = await jwtVerify(accessToken, getJwtSecret(), {
      algorithms: ["HS512"],
    });

    destination = payload.platformRole === "ADMIN" ? "/admin" : "/dashboard";
  } catch {
    destination = "/login";
  }

  redirect(destination);
}
