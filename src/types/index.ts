// ============================================================
// Shared TypeScript types for the Clinic Management System
// These are frontend-facing interfaces (NOT mongoose documents)
// ============================================================

// ── Roles ────────────────────────────────────────────────────
export type Role = "admin" | "doctor" | "patient" | "security_officer";

// ── User ─────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
}

// ── Patient ──────────────────────────────────────────────────
export interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface Address {
  street?: string;
  city: string;
  state?: string;
  country: string;
  zipCode?: string;
}

export interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  expiryDate?: string;
}

export interface Patient {
  id: string;
  userId: string;
  user?: User;
  dateOfBirth: string;
  gender: string;
  bloodType?: string;
  allergies: string[];
  chronicConditions: string[];
  emergencyContact: EmergencyContact;
  address: Address;
  insuranceInfo?: InsuranceInfo;
  createdAt: string;
}

// ── Doctor ───────────────────────────────────────────────────
export interface TimeSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface Doctor {
  id: string;
  userId: string;
  user?: User;
  specialization: string;
  department: string;
  licenseNumber: string;
  bio?: string;
  experience: number;
  consultationFee: number;
  availableSlots: TimeSlot[];
  isAvailableForRemote: boolean;
}

// ── Appointment ──────────────────────────────────────────────
export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "in-progress"
  | "completed"
  | "cancelled"
  | "no-show";

export interface Appointment {
  id: string;
  patientId: string;
  patient?: Patient;
  doctorId: string;
  doctor?: Doctor;
  dateTime: string;
  endTime: string;
  type: "in-person" | "remote";
  status: AppointmentStatus;
  reason: string;
  notes?: string;
  cancelReason?: string;
  createdAt: string;
}

// ── Medical Record ───────────────────────────────────────────
export interface AIDiagnosis {
  conditions: Array<{
    name: string;
    probability: number;
    description: string;
  }>;
  suggestedDepartment: string;
  confidence: number;
}

export interface Vitals {
  bloodPressure?: string;
  heartRate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  oxygenSaturation?: number;
  respiratoryRate?: number;
}

export interface LabResult {
  testName: string;
  result: string;
  unit?: string;
  normalRange?: string;
  date: string;
  isAbnormal?: boolean;
}

export interface Attachment {
  filename: string;
  url: string;
  type: string;
  uploadedAt: string;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  doctor?: Doctor;
  appointmentId?: string;
  visitDate: string;
  chiefComplaint: string;
  symptoms: string[];
  diagnosis: string;
  aiDiagnosisSuggestion?: AIDiagnosis;
  vitals?: Vitals;
  labResults?: LabResult[];
  prescriptions: string[];
  treatmentPlan?: string;
  followUpDate?: string;
  attachments?: Attachment[];
  createdAt: string;
}

// ── Prescription ─────────────────────────────────────────────
export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  startDate: string;
  endDate: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  medicalRecordId: string;
  medications: Medication[];
  status: "active" | "completed" | "cancelled";
  notes?: string;
  createdAt: string;
}

// ── Treatment Tracking ───────────────────────────────────────
export interface TreatmentEntry {
  id: string;
  patientId: string;
  prescriptionId: string;
  medicationName: string;
  dosage: string;
  scheduledTime: string;
  takenAt?: string;
  status: "pending" | "taken" | "missed" | "skipped";
  notes?: string;
}

// ── Consultation ─────────────────────────────────────────────
export interface ChatMessage {
  senderId: string;
  content: string;
  type: "text" | "image" | "file";
  fileUrl?: string;
  timestamp: string;
}

export interface Consultation {
  id: string;
  patientId: string;
  patient?: Patient;
  doctorId: string;
  doctor?: Doctor;
  type: "chat" | "voice" | "video";
  status: "waiting" | "active" | "ended";
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  messages: ChatMessage[];
  summary?: string;
  createdAt: string;
}

// ── Blood Bridge ─────────────────────────────────────────────
export interface GeoLocation {
  type: "Point";
  coordinates: [number, number];
  address?: string;
}

export interface BloodDonor {
  id: string;
  userId: string;
  user?: User;
  bloodType: string;
  isAvailable: boolean;
  lastDonationDate?: string;
  nextEligibleDate?: string;
  location: GeoLocation;
  donationCount: number;
}

export interface DonorResponse {
  donorId: string;
  status: "pending" | "accepted" | "declined" | "donated";
  respondedAt: string;
}

export interface BloodRequest {
  id: string;
  requestedBy: string;
  bloodType: string;
  unitsNeeded: number;
  urgency: "routine" | "urgent" | "emergency";
  status: "open" | "partially_fulfilled" | "fulfilled" | "cancelled";
  hospital: string;
  location: GeoLocation;
  respondedDonors: DonorResponse[];
  unitsFulfilled: number;
  deadline?: string;
  createdAt: string;
}

// ── Billing ──────────────────────────────────────────────────
export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount?: number;
  total: number;
  status: "pending" | "paid" | "overdue" | "cancelled" | "refunded";
  paymentMethod?: string;
  paidAt?: string;
  dueDate: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  patientId: string;
  plan: "free" | "basic" | "premium";
  price: number;
  features: string[];
  startDate: string;
  endDate: string;
  isActive: boolean;
  autoRenew: boolean;
}

// ── Audit Log ────────────────────────────────────────────────
export interface AuditLogEntry {
  id: string;
  userId: string;
  user?: User;
  action: string;
  resource: string;
  resourceId?: string;
  details: string;
  ipAddress: string;
  severity: "info" | "warning" | "critical";
  createdAt: string;
}

// ── API Response ─────────────────────────────────────────────
export interface ApiResponse<T> {
  status: "success" | "error";
  message?: string;
  data?: T;
  errors?: unknown;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ── AI Diagnosis (standalone module) ─────────────────────────
export interface DiagnosisCondition {
  name: string;
  probability: number;
  description: string;
}

export interface DiagnosisResult {
  conditions: DiagnosisCondition[];
  recommendations: string[];
  urgencyLevel: "low" | "medium" | "high" | "emergency";
  disclaimer: string;
}

export interface AIDiagnosisRecord {
  id: string;
  patientId: string;
  symptoms: string[];
  additionalInfo?: string;
  patientAge?: number;
  patientGender?: string;
  result: DiagnosisResult;
  status: "pending" | "completed" | "reviewed" | "dismissed";
  reviewedBy?: string;
  doctorNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Dashboard Stats ──────────────────────────────────────────
export interface DashboardStats {
  totalPatients: number;
  totalDoctors: number;
  todayAppointments: number;
  pendingConsultations: number;
  revenue: number;
  activeSubscriptions: number;
}
