import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { auth } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await auth.getUser();
    if (error) throw error;
    if (!data.user) throw redirect({ to: "/" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
