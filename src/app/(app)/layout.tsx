import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return <>{children}</>;
}
