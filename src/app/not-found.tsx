import Link from "next/link";
import { Activity, ArrowLeft, LayoutDashboard } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      {/* Logo */}
      <Link href="/" className="mb-12 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold text-slate-900">ClinicOS</span>
      </Link>

      {/* SVG Illustration */}
      <div className="mb-8">
        <svg
          width="280"
          height="200"
          viewBox="0 0 280 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-blue-600"
        >
          {/* Background circle */}
          <circle cx="140" cy="100" r="80" fill="#EFF6FF" />
          <circle cx="140" cy="100" r="60" fill="#DBEAFE" />

          {/* 404 Text */}
          <text
            x="140"
            y="90"
            textAnchor="middle"
            className="fill-blue-600"
            fontSize="48"
            fontWeight="800"
            fontFamily="system-ui, sans-serif"
          >
            404
          </text>

          {/* Stethoscope simplified icon */}
          <path
            d="M110 115 Q110 135 130 135 Q150 135 150 115"
            stroke="#2563EB"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="130" cy="138" r="5" fill="#2563EB" />

          {/* Decorative dots */}
          <circle cx="60" cy="50" r="3" fill="#BFDBFE" />
          <circle cx="220" cy="60" r="4" fill="#BFDBFE" />
          <circle cx="50" cy="140" r="2.5" fill="#BFDBFE" />
          <circle cx="230" cy="130" r="3.5" fill="#BFDBFE" />
          <circle cx="80" cy="170" r="2" fill="#DBEAFE" />
          <circle cx="200" cy="170" r="2.5" fill="#DBEAFE" />

          {/* Pulse line */}
          <polyline
            points="30,100 70,100 85,70 100,130 115,100 160,100 175,70 190,130 205,100 250,100"
            stroke="#93C5FD"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.4"
          />
        </svg>
      </div>

      {/* Content */}
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Page Not Found
      </h1>
      <p className="mt-3 max-w-md text-center text-sm leading-relaxed text-slate-500">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Check the URL or navigate back to a familiar place.
      </p>

      {/* Buttons */}
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors duration-200 hover:bg-blue-700"
        >
          <LayoutDashboard className="h-4 w-4" />
          Go to Dashboard
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors duration-200 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Home
        </Link>
      </div>
    </div>
  );
}
