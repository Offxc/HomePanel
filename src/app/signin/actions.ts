"use server";
import { signIn } from "@/auth";

export async function startDiscord() {
  await signIn("discord", { redirectTo: "/today" });
}
