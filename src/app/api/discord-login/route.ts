import { signIn } from "@/auth";

export async function POST() {
  await signIn("discord", { redirectTo: "/today" });
}
