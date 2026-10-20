import Link from "next/link";
import { MailCheck } from "lucide-react";

export default function VerifyEmailIndexPage() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center">
      <div className="flex justify-center mb-4">
        <MailCheck className="h-12 w-12 text-blue-500" />
      </div>
      <h1 className="text-xl font-bold text-slate-900 mb-2">
        Verify your email
      </h1>
      <p className="text-sm text-slate-500 mb-6">
        We&apos;ve sent a verification link to your email address. Click the
        link in that email to activate your account. The link expires in 24
        hours.
      </p>
      <p className="text-xs text-slate-400 mb-6">
        Didn&apos;t get the email? Check your spam folder, or request a new
        verification link from the sign-in screen.
      </p>
      <Link
        href="/login"
        className="text-sm font-medium text-blue-600 transition-colors duration-200 hover:text-blue-700"
      >
        Back to sign in
      </Link>
    </div>
  );
}
