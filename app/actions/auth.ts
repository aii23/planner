"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function login(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const password = formData.get("password") as string;

  if (!password) {
    return { error: "Password is required" };
  }

  if (password !== process.env.AUTH_GATE_PASSWORD) {
    return { error: "Invalid password" };
  }

  const cookieStore = await cookies();
  cookieStore.set("AUTH_PASSWORD", "authenticated", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  redirect("/backlog");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("AUTH_PASSWORD");
  redirect("/login");
}
