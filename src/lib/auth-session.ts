import { headers } from "next/headers";
import { connection } from "next/server";

import { auth } from "@/lib/auth";

export async function getAuthSession() {
  await connection();
  return auth.api.getSession({ headers: await headers() });
}
