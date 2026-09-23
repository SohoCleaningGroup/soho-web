import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/layout/AdminSidebar";
import { hasValidAdminSession } from "@/lib/security/admin-auth";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-[#060606] text-white">
      <AdminSidebar />

      <div className="lg:pl-72">
        <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
