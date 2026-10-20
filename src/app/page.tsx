import Link from "next/link";
import {
  Activity,
  Brain,
  Calendar,
  FileText,
  Pill,
  Video,
  Droplets,
  ArrowRight,
  UserPlus,
  CalendarCheck,
  HeartPulse,
  Users,
  Stethoscope,
  Cpu,
  Clock,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Diagnosis",
    description:
      "AI-powered preliminary diagnosis and symptom analysis to help doctors make faster, more accurate decisions.",
  },
  {
    icon: Calendar,
    title: "Appointment Booking",
    description:
      "Easy online scheduling with real-time availability. Book, reschedule, or cancel appointments in seconds.",
  },
  {
    icon: FileText,
    title: "Electronic Medical Records",
    description:
      "Secure digital health records accessible anytime. Complete patient history at your fingertips.",
  },
  {
    icon: Pill,
    title: "Treatment Tracking",
    description:
      "Monitor medication adherence and treatment progress with smart reminders and analytics.",
  },
  {
    icon: Video,
    title: "Remote Consultation",
    description:
      "Chat and voice consultations with certified doctors from the comfort of your home.",
  },
  {
    icon: Droplets,
    title: "Blood Bridge",
    description:
      "Community-driven blood donation network connecting donors with patients in need.",
  },
];

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Register",
    description: "Create your account in under a minute with just your basic information.",
  },
  {
    icon: CalendarCheck,
    step: "02",
    title: "Book",
    description: "Browse available doctors, choose a time slot, and confirm your appointment.",
  },
  {
    icon: HeartPulse,
    step: "03",
    title: "Get Care",
    description: "Visit the clinic or connect remotely. Your health journey starts here.",
  },
];

const stats = [
  { icon: Users, value: "1,000+", label: "Patients" },
  { icon: Stethoscope, value: "50+", label: "Doctors" },
  { icon: Cpu, value: "AI-Powered", label: "Diagnosis" },
  { icon: Clock, value: "24/7", label: "Access" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* ------------------------------------------------------------------ */}
      {/* Navigation */}
      {/* ------------------------------------------------------------------ */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 cursor-pointer">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">ClinicOS</span>
          </Link>

          {/* Center Links — hidden on small screens */}
          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="cursor-pointer text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="cursor-pointer text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
            >
              How It Works
            </a>
            <a
              href="#stats"
              className="cursor-pointer text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
            >
              About
            </a>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-100"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-blue-700"
            >
              Register
            </Link>
          </div>
        </div>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Hero */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 py-24 sm:py-32">
        {/* Decorative Circles */}
        <div className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-[400px] w-[400px] rounded-full bg-white/5" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Intelligent Clinic{" "}
              <span className="text-blue-200">Management System</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-blue-100">
              A modern, AI-powered platform that streamlines healthcare delivery.
              From appointment booking to remote consultations, manage your entire
              clinic in one place.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/register"
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-blue-700 shadow-lg transition-colors duration-200 hover:bg-blue-50"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/10"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Features */}
      {/* ------------------------------------------------------------------ */}
      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Everything you need to manage healthcare
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Comprehensive tools designed for clinics, doctors, and patients alike.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-colors duration-200 group-hover:bg-blue-600 group-hover:text-white">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* How It Works */}
      {/* ------------------------------------------------------------------ */}
      <section id="how-it-works" className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Getting started is simple. Three easy steps to better healthcare.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.step} className="relative text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <step.icon className="h-7 w-7" />
                </div>
                <span className="mt-4 block text-xs font-bold uppercase tracking-widest text-blue-600">
                  Step {step.step}
                </span>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Stats */}
      {/* ------------------------------------------------------------------ */}
      <section id="stats" className="bg-slate-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center rounded-xl border border-slate-200 bg-white py-10 shadow-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <stat.icon className="h-6 w-6" />
                </div>
                <span className="mt-4 text-3xl font-extrabold text-slate-900">
                  {stat.value}
                </span>
                <span className="mt-1 text-sm text-slate-500">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* CTA */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to get started?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-blue-100">
            Join thousands of patients and healthcare providers already using
            ClinicOS to transform their healthcare experience.
          </p>
          <div className="mt-8">
            <Link
              href="/register"
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-8 py-3.5 text-sm font-semibold text-blue-700 shadow-lg transition-colors duration-200 hover:bg-blue-50"
            >
              Sign Up Now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Footer */}
      {/* ------------------------------------------------------------------ */}
      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            {/* Brand */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <Activity className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-slate-900">ClinicOS</span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <a
                href="#features"
                className="cursor-pointer transition-colors duration-200 hover:text-slate-700"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="cursor-pointer transition-colors duration-200 hover:text-slate-700"
              >
                How It Works
              </a>
              <Link
                href="/login"
                className="cursor-pointer transition-colors duration-200 hover:text-slate-700"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="cursor-pointer transition-colors duration-200 hover:text-slate-700"
              >
                Register
              </Link>
            </div>

            {/* Copyright */}
            <p className="text-sm text-slate-400">
              &copy; {new Date().getFullYear()} ClinicOS. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
