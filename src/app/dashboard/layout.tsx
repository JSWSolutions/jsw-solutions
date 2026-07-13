// Minimal wrapper for everything under /dashboard.
// The sidebar chrome lives in the (app) route group so the login page
// can render full-screen without it.
export const metadata = {
  title: "JSW Solutions — Company Dashboard",
};

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
