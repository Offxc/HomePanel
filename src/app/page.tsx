import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

export default async function Root() {
  const user = await getSessionUser();
  redirect(user ? "/today" : "/signin");
}
