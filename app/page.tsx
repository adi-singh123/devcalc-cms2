import { authenticated } from "@/lib/auth";
import Dashboard from "@/components/Dashboard";
import Login from "@/components/Login";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ login?: string }> }) {
  if (await authenticated()) return <Dashboard />;
  const { login } = await searchParams;
  const error = login === "invalid" ? "Incorrect password. Please try again." : login === "unavailable" ? "The CMS is temporarily unavailable. Please try again." : undefined;
  return <Login error={error} />;
}
