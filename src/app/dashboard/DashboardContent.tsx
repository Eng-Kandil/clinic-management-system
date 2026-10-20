"use client";

import { PatientDashboard } from "@/components/dashboard/PatientDashboard";
import { DoctorDashboard } from "@/components/dashboard/DoctorDashboard";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { SecurityDashboard } from "@/components/dashboard/SecurityDashboard";
import { ReceptionistDashboard } from "@/components/dashboard/ReceptionistDashboard";

interface DashboardContentProps {
  role: "admin" | "doctor" | "patient" | "security_officer" | "receptionist";
  userName: string;
}

export function DashboardContent({ role, userName }: DashboardContentProps) {
  switch (role) {
    case "admin":
      return <AdminDashboard userName={userName} />;
    case "doctor":
      return <DoctorDashboard userName={userName} />;
    case "security_officer":
      return <SecurityDashboard userName={userName} />;
    case "receptionist":
      return <ReceptionistDashboard userName={userName} />;
    case "patient":
    default:
      return <PatientDashboard userName={userName} />;
  }
}
