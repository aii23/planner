"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signToken } from "@/lib/auth";

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

  const issued = Date.now().toString();
  const token = signToken(issued);

  const cookieStore = await cookies();
  cookieStore.set("AUTH_PASSWORD", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/backlog");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("AUTH_PASSWORD");
  redirect("/login");
}
