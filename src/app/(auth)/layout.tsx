import { Activity } from "lucide-react";

export const metadata = {
  title: "ClinicOS - Sign In",
  description: "Sign in to your ClinicOS account",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-blue-100/40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-indigo-100/40 blur-3xl" />
      </div>

      {/* Logo */}
      <div className="relative flex items-center gap-2.5 mb-8">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <span className="text-2xl font-bold text-slate-900">ClinicOS</span>
      </div>

      {/* Content */}
      <div className="relative w-full max-w-md">
        {children}
      </div>

      {/* Footer */}
      <p className="relative mt-8 text-sm text-slate-500">
        &copy; {new Date().getFullYear()} ClinicOS. All rights reserved.
      </p>
    </div>
  );
}
