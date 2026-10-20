/**
 * Database Seed Script
 * Run with: npm run seed  (or npx tsx src/scripts/seed.ts)
 * Run with: npm run seed -- --reset  to drop the DB first (non-production only)
 *
 * Creates sample users, patients, doctors, appointments, medical records,
 * prescriptions, invoices, subscriptions, audit logs, blood donors, requests,
 * consultations, AI diagnoses, and notifications.
 */

import mongoose from "mongoose";
import CryptoJS from "crypto-js";

// ─── Load environment variables ──────────────────────────────────────────────

import { config } from "dotenv";
config({ path: ".env.local" });

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/clinic-management";

// ─── Import models ───────────────────────────────────────────────────────────

// We need to import schema files to register models
import "../lib/db/models/User";
import "../lib/db/models/Patient";
import "../lib/db/models/Doctor";
import "../lib/db/models/Appointment";
import "../lib/db/models/MedicalRecord";
import "../lib/db/models/Prescription";
import "../lib/db/models/TreatmentTracking";
import "../lib/db/models/Invoice";
import "../lib/db/models/Subscription";
import "../lib/db/models/AuditLog";
import "../lib/db/models/BloodDonor";
import "../lib/db/models/BloodRequest";
import "../lib/db/models/Consultation";
import "../lib/db/models/AIDiagnosis";
import "../lib/db/models/Notification";

const User = mongoose.model("User");
const Patient = mongoose.model("Patient");
const Doctor = mongoose.model("Doctor");
const Appointment = mongoose.model("Appointment");
const MedicalRecord = mongoose.model("MedicalRecord");
const Prescription = mongoose.model("Prescription");
const TreatmentTracking = mongoose.model("TreatmentTracking");
const Invoice = mongoose.model("Invoice");
const Subscription = mongoose.model("Subscription");
const AuditLog = mongoose.model("AuditLog");
const BloodDonor = mongoose.model("BloodDonor");
const BloodRequest = mongoose.model("BloodRequest");
const Consultation = mongoose.model("Consultation");
const AIDiagnosis = mongoose.model("AIDiagnosis");
const Notification = mongoose.model("Notification");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function hoursFromNow(hours: number): Date {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d;
}

// ─── Main Seed ───────────────────────────────────────────────────────────────

async function seed() {
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI, {
    bufferCommands: false,
    maxPoolSize: 10,
  });
  console.log("✅ Connected to MongoDB");

  // ── --reset flag: drop entire database ────────────────────────────

  const shouldReset = process.argv.includes("--reset");
  if (shouldReset) {
    if (process.env.NODE_ENV === "production") {
      console.error("Cannot reset in production!");
      process.exit(1);
    }
    await mongoose.connection.dropDatabase();
    console.log("🗑️  Database dropped.");
  }

  // ── Clean all collections ──────────────────────────────────────────

  console.log("🧹 Cleaning existing data...");
  await Promise.all([
    User.deleteMany({}),
    Patient.deleteMany({}),
    Doctor.deleteMany({}),
    Appointment.deleteMany({}),
    MedicalRecord.deleteMany({}),
    Prescription.deleteMany({}),
    TreatmentTracking.deleteMany({}),
    Invoice.deleteMany({}),
    Subscription.deleteMany({}),
    AuditLog.deleteMany({}),
    BloodDonor.deleteMany({}),
    BloodRequest.deleteMany({}),
    Consultation.deleteMany({}),
    AIDiagnosis.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  const PASSWORD = "Password123!";

  // ══════════════════════════════════════════════════════════════════
  //  1. USERS
  // ══════════════════════════════════════════════════════════════════

  console.log("👤 Creating users...");

  const [
    adminUser,
    doctorUser1,
    doctorUser2,
    doctorUser3,
    patientUser1,
    patientUser2,
    patientUser3,
    securityUser,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    receptionistUser,
  ] = await User.create([
    {
      name: "John Admin",
      email: "admin@clinic.com",
      password: PASSWORD,
      role: "admin",
      phone: "+1-555-100-0001",
      isActive: true,
      lastLogin: new Date(),
    },
    {
      name: "Sarah Wilson",
      email: "dr.sarah@clinic.com",
      password: PASSWORD,
      role: "doctor",
      phone: "+1-555-200-0001",
      isActive: true,
      lastLogin: daysAgo(1),
    },
    {
      name: "Ahmed Hassan",
      email: "dr.ahmed@clinic.com",
      password: PASSWORD,
      role: "doctor",
      phone: "+1-555-200-0002",
      isActive: true,
      lastLogin: daysAgo(2),
    },
    {
      name: "Maria Garcia",
      email: "dr.maria@clinic.com",
      password: PASSWORD,
      role: "doctor",
      phone: "+1-555-200-0003",
      isActive: true,
      lastLogin: daysAgo(3),
    },
    {
      name: "Alice Johnson",
      email: "patient1@clinic.com",
      password: PASSWORD,
      role: "patient",
      phone: "+1-555-300-0001",
      isActive: true,
      lastLogin: daysAgo(1),
    },
    {
      name: "Bob Smith",
      email: "patient2@clinic.com",
      password: PASSWORD,
      role: "patient",
      phone: "+1-555-300-0002",
      isActive: true,
    },
    {
      name: "Carol Williams",
      email: "patient3@clinic.com",
      password: PASSWORD,
      role: "patient",
      phone: "+1-555-300-0003",
      isActive: true,
    },
    {
      name: "James Security",
      email: "security@clinic.com",
      password: PASSWORD,
      role: "security_officer",
      phone: "+1-555-400-0001",
      isActive: true,
      lastLogin: new Date(),
    },
    {
      name: "Receptionist Demo",
      email: "receptionist@clinic.com",
      password: PASSWORD,
      role: "receptionist",
      phone: "+1-555-500-0001",
      isActive: true,
      lastLogin: new Date(),
    },
  ]);

  console.log(`  ✅ Created ${9} users`);

  // ══════════════════════════════════════════════════════════════════
  //  2. PATIENTS
  // ══════════════════════════════════════════════════════════════════

  console.log("🏥 Creating patient records...");

  const [patient1, patient2, patient3] = await Patient.create([
    {
      userId: patientUser1._id,
      dateOfBirth: new Date("1990-03-15"),
      gender: "female",
      bloodType: "A+",
      allergies: ["Penicillin", "Pollen"],
      chronicConditions: ["Asthma"],
      emergencyContact: {
        name: "Tom Johnson",
        phone: "+1-555-300-0010",
        relation: "Spouse",
      },
      address: {
        street: "123 Main St",
        city: "New York",
        state: "NY",
        country: "USA",
        zipCode: "10001",
      },
      insuranceInfo: {
        provider: "BlueCross BlueShield",
        policyNumber: "BCBS-2024-001",
        expiryDate: daysFromNow(365),
      },
    },
    {
      userId: patientUser2._id,
      dateOfBirth: new Date("1985-07-22"),
      gender: "male",
      bloodType: "O+",
      allergies: [],
      chronicConditions: ["Hypertension"],
      emergencyContact: {
        name: "Linda Smith",
        phone: "+1-555-300-0020",
        relation: "Wife",
      },
      address: {
        street: "456 Oak Ave",
        city: "Los Angeles",
        state: "CA",
        country: "USA",
        zipCode: "90001",
      },
      insuranceInfo: {
        provider: "Aetna",
        policyNumber: "AET-2024-042",
        expiryDate: daysFromNow(180),
      },
    },
    {
      userId: patientUser3._id,
      dateOfBirth: new Date("1995-11-08"),
      gender: "female",
      bloodType: "B-",
      allergies: ["Latex"],
      chronicConditions: [],
      emergencyContact: {
        name: "Dave Williams",
        phone: "+1-555-300-0030",
        relation: "Father",
      },
      address: {
        street: "789 Pine Rd",
        city: "Chicago",
        state: "IL",
        country: "USA",
        zipCode: "60601",
      },
    },
  ]);

  console.log(`  ✅ Created ${3} patients`);

  // ══════════════════════════════════════════════════════════════════
  //  3. DOCTORS
  // ══════════════════════════════════════════════════════════════════

  console.log("🩺 Creating doctor records...");

  const [doctor1, doctor2, doctor3] = await Doctor.create([
    {
      userId: doctorUser1._id,
      specialization: "Cardiology",
      department: "Cardiology",
      licenseNumber: "MD-CARD-2024-001",
      bio: "Board-certified cardiologist with over 15 years of experience in cardiovascular medicine. Specializes in interventional cardiology and heart failure management.",
      experience: 15,
      consultationFee: 250,
      isAvailableForRemote: true,
      availableSlots: [
        { dayOfWeek: 1, startTime: "09:00", endTime: "12:00" },
        { dayOfWeek: 1, startTime: "14:00", endTime: "17:00" },
        { dayOfWeek: 2, startTime: "09:00", endTime: "12:00" },
        { dayOfWeek: 3, startTime: "09:00", endTime: "12:00" },
        { dayOfWeek: 3, startTime: "14:00", endTime: "17:00" },
        { dayOfWeek: 4, startTime: "09:00", endTime: "12:00" },
        { dayOfWeek: 5, startTime: "09:00", endTime: "13:00" },
      ],
    },
    {
      userId: doctorUser2._id,
      specialization: "Neurology",
      department: "Neurology",
      licenseNumber: "MD-NEUR-2024-002",
      bio: "Neurologist specializing in epilepsy and neurodegenerative disorders. Trained at Johns Hopkins with 10 years of clinical experience.",
      experience: 10,
      consultationFee: 300,
      isAvailableForRemote: true,
      availableSlots: [
        { dayOfWeek: 1, startTime: "10:00", endTime: "13:00" },
        { dayOfWeek: 2, startTime: "09:00", endTime: "12:00" },
        { dayOfWeek: 2, startTime: "14:00", endTime: "16:00" },
        { dayOfWeek: 4, startTime: "09:00", endTime: "12:00" },
        { dayOfWeek: 4, startTime: "14:00", endTime: "17:00" },
        { dayOfWeek: 5, startTime: "09:00", endTime: "12:00" },
      ],
    },
    {
      userId: doctorUser3._id,
      specialization: "Pediatrics",
      department: "Pediatrics",
      licenseNumber: "MD-PEDI-2024-003",
      bio: "Pediatrician with 8 years of experience in general and developmental pediatrics. Passionate about preventive care and child wellness.",
      experience: 8,
      consultationFee: 150,
      isAvailableForRemote: false,
      availableSlots: [
        { dayOfWeek: 1, startTime: "08:00", endTime: "12:00" },
        { dayOfWeek: 2, startTime: "08:00", endTime: "12:00" },
        { dayOfWeek: 3, startTime: "08:00", endTime: "12:00" },
        { dayOfWeek: 3, startTime: "13:00", endTime: "16:00" },
        { dayOfWeek: 4, startTime: "08:00", endTime: "12:00" },
        { dayOfWeek: 5, startTime: "08:00", endTime: "12:00" },
      ],
    },
  ]);

  console.log(`  ✅ Created ${3} doctors`);

  // ══════════════════════════════════════════════════════════════════
  //  4. APPOINTMENTS (10 sample)
  // ══════════════════════════════════════════════════════════════════

  console.log("📅 Creating appointments...");

  const appointments = await Appointment.create([
    {
      patientId: patient1._id,
      doctorId: doctor1._id,
      dateTime: daysFromNow(1),
      endTime: hoursFromNow(25),
      type: "in-person",
      status: "scheduled",
      reason: "Annual heart checkup",
      notes: "Patient has family history of heart disease",
    },
    {
      patientId: patient1._id,
      doctorId: doctor2._id,
      dateTime: daysFromNow(3),
      endTime: hoursFromNow(73),
      type: "remote",
      status: "confirmed",
      reason: "Follow-up on migraine treatment",
    },
    {
      patientId: patient2._id,
      doctorId: doctor1._id,
      dateTime: daysFromNow(2),
      endTime: hoursFromNow(49),
      type: "in-person",
      status: "scheduled",
      reason: "Blood pressure monitoring",
      notes: "Patient on new hypertension medication",
    },
    {
      patientId: patient2._id,
      doctorId: doctor3._id,
      dateTime: daysAgo(7),
      endTime: daysAgo(7),
      type: "in-person",
      status: "completed",
      reason: "General health assessment",
    },
    {
      patientId: patient3._id,
      doctorId: doctor1._id,
      dateTime: daysAgo(3),
      endTime: daysAgo(3),
      type: "remote",
      status: "completed",
      reason: "Heart palpitation consultation",
    },
    {
      patientId: patient3._id,
      doctorId: doctor2._id,
      dateTime: daysAgo(14),
      endTime: daysAgo(14),
      type: "in-person",
      status: "completed",
      reason: "Headache and dizziness evaluation",
    },
    {
      patientId: patient1._id,
      doctorId: doctor3._id,
      dateTime: daysAgo(1),
      endTime: daysAgo(1),
      type: "in-person",
      status: "no-show",
      reason: "Routine checkup",
    },
    {
      patientId: patient2._id,
      doctorId: doctor2._id,
      dateTime: daysFromNow(5),
      endTime: hoursFromNow(121),
      type: "remote",
      status: "scheduled",
      reason: "Sleep disorder consultation",
    },
    {
      patientId: patient3._id,
      doctorId: doctor3._id,
      dateTime: daysAgo(21),
      endTime: daysAgo(21),
      type: "in-person",
      status: "cancelled",
      reason: "Wellness checkup",
      cancelReason: "Patient rescheduled",
    },
    {
      patientId: patient1._id,
      doctorId: doctor1._id,
      dateTime: daysFromNow(10),
      endTime: hoursFromNow(241),
      type: "in-person",
      status: "scheduled",
      reason: "Stress test follow-up",
    },
  ]);

  console.log(`  ✅ Created ${appointments.length} appointments`);

  // ══════════════════════════════════════════════════════════════════
  //  5. MEDICAL RECORDS (5 sample)
  // ══════════════════════════════════════════════════════════════════

  console.log("📋 Creating medical records...");

  const medicalRecords = await MedicalRecord.create([
    {
      patientId: patient1._id,
      doctorId: doctor1._id,
      appointmentId: appointments[4]._id,
      visitDate: daysAgo(3),
      chiefComplaint: "Heart palpitations and occasional chest tightness",
      symptoms: ["Heart palpitations", "Chest tightness", "Shortness of breath"],
      diagnosis: "Premature ventricular contractions (PVCs)",
      vitals: {
        bloodPressure: "128/82",
        heartRate: 88,
        temperature: 98.6,
        weight: 145,
        height: 165,
        oxygenSaturation: 98,
        respiratoryRate: 16,
      },
      labResults: [
        {
          testName: "Complete Blood Count",
          result: "Normal",
          date: daysAgo(3),
          isAbnormal: false,
        },
        {
          testName: "Troponin",
          result: "0.01 ng/mL",
          unit: "ng/mL",
          normalRange: "< 0.04",
          date: daysAgo(3),
          isAbnormal: false,
        },
      ],
      treatmentPlan: "Monitor with Holter for 48 hours. Reduce caffeine intake. Follow-up in 2 weeks.",
      followUpDate: daysFromNow(14),
      isEncrypted: false,
    },
    {
      patientId: patient2._id,
      doctorId: doctor1._id,
      visitDate: daysAgo(10),
      chiefComplaint: "Elevated blood pressure readings at home",
      symptoms: ["Headache", "Elevated blood pressure", "Fatigue"],
      diagnosis: "Stage 1 Hypertension",
      vitals: {
        bloodPressure: "148/92",
        heartRate: 76,
        temperature: 98.4,
        weight: 190,
        height: 178,
        oxygenSaturation: 97,
        respiratoryRate: 18,
      },
      treatmentPlan: "Start Lisinopril 10mg daily. Dietary modifications (DASH diet). Exercise 30 min/day.",
      followUpDate: daysFromNow(30),
      isEncrypted: false,
    },
    {
      patientId: patient3._id,
      doctorId: doctor2._id,
      appointmentId: appointments[5]._id,
      visitDate: daysAgo(14),
      chiefComplaint: "Recurring headaches and episodes of dizziness",
      symptoms: ["Headache", "Dizziness", "Nausea", "Light sensitivity"],
      diagnosis: "Migraine with aura",
      vitals: {
        bloodPressure: "118/75",
        heartRate: 72,
        temperature: 98.6,
        weight: 130,
        height: 160,
        oxygenSaturation: 99,
        respiratoryRate: 14,
      },
      labResults: [
        {
          testName: "MRI Brain",
          result: "No structural abnormalities",
          date: daysAgo(14),
          isAbnormal: false,
        },
      ],
      treatmentPlan: "Sumatriptan 50mg PRN for acute episodes. Topiramate 25mg daily for prevention. Keep headache diary.",
      followUpDate: daysFromNow(28),
      isEncrypted: false,
    },
    {
      patientId: patient1._id,
      doctorId: doctor3._id,
      visitDate: daysAgo(30),
      chiefComplaint: "Routine wellness checkup",
      symptoms: [],
      diagnosis: "Healthy - no acute issues",
      vitals: {
        bloodPressure: "120/78",
        heartRate: 70,
        temperature: 98.6,
        weight: 144,
        height: 165,
        oxygenSaturation: 99,
        respiratoryRate: 14,
      },
      treatmentPlan: "Continue current medications. Annual labs in 6 months.",
      isEncrypted: false,
    },
    {
      patientId: patient2._id,
      doctorId: doctor3._id,
      appointmentId: appointments[3]._id,
      visitDate: daysAgo(7),
      chiefComplaint: "Persistent fatigue and weight gain",
      symptoms: ["Fatigue", "Weight gain", "Cold intolerance"],
      diagnosis: "Hypothyroidism (suspected)",
      vitals: {
        bloodPressure: "135/88",
        heartRate: 62,
        temperature: 97.8,
        weight: 195,
        height: 178,
        oxygenSaturation: 98,
        respiratoryRate: 16,
      },
      labResults: [
        {
          testName: "TSH",
          result: "8.5 mIU/L",
          unit: "mIU/L",
          normalRange: "0.4-4.0",
          date: daysAgo(7),
          isAbnormal: true,
        },
        {
          testName: "Free T4",
          result: "0.7 ng/dL",
          unit: "ng/dL",
          normalRange: "0.8-1.8",
          date: daysAgo(7),
          isAbnormal: true,
        },
      ],
      treatmentPlan: "Start Levothyroxine 50mcg daily. Recheck labs in 6 weeks. Refer to endocrinology.",
      followUpDate: daysFromNow(42),
      isEncrypted: false,
    },
  ]);

  console.log(`  ✅ Created ${medicalRecords.length} medical records`);

  // ══════════════════════════════════════════════════════════════════
  //  6. PRESCRIPTIONS (3 sample with treatment tracking)
  // ══════════════════════════════════════════════════════════════════

  console.log("💊 Creating prescriptions...");

  const prescriptions = await Prescription.create([
    {
      patientId: patient1._id,
      doctorId: doctor1._id,
      medicalRecordId: medicalRecords[0]._id,
      medications: [
        {
          name: "Metoprolol",
          dosage: "25mg",
          frequency: "Twice daily",
          duration: "30 days",
          instructions: "Take with food. Do not skip doses.",
          startDate: daysAgo(3),
          endDate: daysFromNow(27),
        },
      ],
      status: "active",
      notes: "Monitor heart rate. If resting HR < 60, contact doctor.",
    },
    {
      patientId: patient2._id,
      doctorId: doctor1._id,
      medicalRecordId: medicalRecords[1]._id,
      medications: [
        {
          name: "Lisinopril",
          dosage: "10mg",
          frequency: "Once daily",
          duration: "90 days",
          instructions: "Take in the morning. Avoid potassium supplements.",
          startDate: daysAgo(10),
          endDate: daysFromNow(80),
        },
        {
          name: "Hydrochlorothiazide",
          dosage: "12.5mg",
          frequency: "Once daily",
          duration: "90 days",
          instructions: "Take in the morning with Lisinopril.",
          startDate: daysAgo(10),
          endDate: daysFromNow(80),
        },
      ],
      status: "active",
      notes: "Patient should monitor blood pressure daily at home.",
    },
    {
      patientId: patient3._id,
      doctorId: doctor2._id,
      medicalRecordId: medicalRecords[2]._id,
      medications: [
        {
          name: "Sumatriptan",
          dosage: "50mg",
          frequency: "As needed",
          duration: "90 days",
          instructions: "Take at onset of migraine. Max 2 doses per day.",
          startDate: daysAgo(14),
          endDate: daysFromNow(76),
        },
        {
          name: "Topiramate",
          dosage: "25mg",
          frequency: "Once daily at bedtime",
          duration: "90 days",
          instructions: "Take at bedtime. Increase to 50mg after 2 weeks if tolerated.",
          startDate: daysAgo(14),
          endDate: daysFromNow(76),
        },
      ],
      status: "active",
      notes: "Patient should maintain a headache diary.",
    },
  ]);

  // Link prescriptions to medical records
  await MedicalRecord.findByIdAndUpdate(medicalRecords[0]._id, {
    $push: { prescriptions: prescriptions[0]._id },
  });
  await MedicalRecord.findByIdAndUpdate(medicalRecords[1]._id, {
    $push: { prescriptions: prescriptions[1]._id },
  });
  await MedicalRecord.findByIdAndUpdate(medicalRecords[2]._id, {
    $push: { prescriptions: prescriptions[2]._id },
  });

  console.log(`  ✅ Created ${prescriptions.length} prescriptions`);

  // ── Treatment tracking entries ──────────────────────────────────────

  console.log("💉 Creating treatment tracking entries...");

  const trackingEntries = await TreatmentTracking.create([
    {
      patientId: patient1._id,
      prescriptionId: prescriptions[0]._id,
      medicationName: "Metoprolol",
      dosage: "25mg",
      scheduledTime: daysAgo(2),
      takenAt: daysAgo(2),
      status: "taken",
    },
    {
      patientId: patient1._id,
      prescriptionId: prescriptions[0]._id,
      medicationName: "Metoprolol",
      dosage: "25mg",
      scheduledTime: daysAgo(1),
      takenAt: daysAgo(1),
      status: "taken",
    },
    {
      patientId: patient1._id,
      prescriptionId: prescriptions[0]._id,
      medicationName: "Metoprolol",
      dosage: "25mg",
      scheduledTime: new Date(),
      status: "pending",
    },
    {
      patientId: patient2._id,
      prescriptionId: prescriptions[1]._id,
      medicationName: "Lisinopril",
      dosage: "10mg",
      scheduledTime: daysAgo(1),
      status: "missed",
      notes: "Patient forgot morning dose",
    },
    {
      patientId: patient2._id,
      prescriptionId: prescriptions[1]._id,
      medicationName: "Lisinopril",
      dosage: "10mg",
      scheduledTime: new Date(),
      status: "pending",
    },
    {
      patientId: patient3._id,
      prescriptionId: prescriptions[2]._id,
      medicationName: "Topiramate",
      dosage: "25mg",
      scheduledTime: daysAgo(1),
      takenAt: daysAgo(1),
      status: "taken",
    },
  ]);

  console.log(`  ✅ Created ${trackingEntries.length} treatment tracking entries`);

  // ══════════════════════════════════════════════════════════════════
  //  7. INVOICES (2 sample)
  // ══════════════════════════════════════════════════════════════════

  console.log("💵 Creating invoices...");

  const invoices = await Invoice.create([
    {
      invoiceNumber: `INV-${new Date().getFullYear()}-0001`,
      patientId: patient1._id,
      appointmentId: appointments[4]._id,
      items: [
        {
          description: "Cardiology Consultation",
          quantity: 1,
          unitPrice: 250,
          total: 250,
        },
        {
          description: "ECG / Holter Monitor",
          quantity: 1,
          unitPrice: 150,
          total: 150,
        },
        {
          description: "Blood Work (CBC + Troponin)",
          quantity: 1,
          unitPrice: 85,
          total: 85,
        },
      ],
      subtotal: 485,
      tax: 0,
      discount: 0,
      total: 485,
      status: "paid",
      paymentMethod: "mock_insurance",
      paidAt: daysAgo(2),
      dueDate: daysFromNow(28),
    },
    {
      invoiceNumber: `INV-${new Date().getFullYear()}-0002`,
      patientId: patient2._id,
      appointmentId: appointments[3]._id,
      items: [
        {
          description: "General Health Assessment",
          quantity: 1,
          unitPrice: 150,
          total: 150,
        },
        {
          description: "Thyroid Panel (TSH + Free T4)",
          quantity: 1,
          unitPrice: 120,
          total: 120,
        },
      ],
      subtotal: 270,
      tax: 0,
      discount: 0,
      total: 270,
      status: "pending",
      dueDate: daysFromNow(14),
    },
  ]);

  console.log(`  ✅ Created ${invoices.length} invoices`);

  // ══════════════════════════════════════════════════════════════════
  //  8. SUBSCRIPTIONS (3 sample: free, basic, premium)
  // ══════════════════════════════════════════════════════════════════

  console.log("🔔 Creating subscriptions...");

  const subscriptions = await Subscription.create([
    {
      patientId: patient1._id,
      plan: "premium",
      price: 49.99,
      features: [
        "Unlimited consultations",
        "AI diagnosis",
        "Priority scheduling",
        "Blood bridge alerts",
        "Treatment tracking",
        "Video consultations",
      ],
      startDate: daysAgo(30),
      endDate: daysFromNow(335),
      isActive: true,
      autoRenew: true,
      paymentHistory: [
        {
          amount: 49.99,
          date: daysAgo(30),
          method: "mock_credit_card",
          transactionId: "TXN-PREM-001",
        },
      ],
    },
    {
      patientId: patient2._id,
      plan: "basic",
      price: 19.99,
      features: [
        "5 consultations/month",
        "AI diagnosis",
        "Standard scheduling",
        "Treatment tracking",
      ],
      startDate: daysAgo(15),
      endDate: daysFromNow(350),
      isActive: true,
      autoRenew: false,
      paymentHistory: [
        {
          amount: 19.99,
          date: daysAgo(15),
          method: "mock_debit_card",
          transactionId: "TXN-BASIC-001",
        },
      ],
    },
    {
      patientId: patient3._id,
      plan: "free",
      price: 0,
      features: ["2 consultations/month", "Basic scheduling"],
      startDate: daysAgo(60),
      endDate: daysFromNow(305),
      isActive: true,
      autoRenew: false,
      paymentHistory: [],
    },
  ]);

  console.log(`  ✅ Created ${subscriptions.length} subscriptions`);

  // ══════════════════════════════════════════════════════════════════
  //  9. AUDIT LOGS (5 sample)
  // ══════════════════════════════════════════════════════════════════

  console.log("📝 Creating audit logs...");

  let previousHash = "GENESIS";

  const auditActions = [
    {
      userId: adminUser._id,
      action: "USER_LOGIN",
      resource: "Auth",
      details: "Admin logged in successfully",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120",
      severity: "info" as const,
    },
    {
      userId: doctorUser1._id,
      action: "MEDICAL_RECORD_CREATE",
      resource: "MedicalRecord",
      resourceId: medicalRecords[0]._id,
      details: "Dr. Sarah Wilson created medical record for patient Alice Johnson",
      ipAddress: "192.168.1.105",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X) Safari/17",
      severity: "info" as const,
    },
    {
      userId: patientUser1._id,
      action: "PASSWORD_CHANGE",
      resource: "User",
      resourceId: patientUser1._id,
      details: "Patient Alice Johnson changed their password",
      ipAddress: "10.0.0.42",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17) Mobile Safari",
      severity: "warning" as const,
    },
    {
      userId: securityUser._id,
      action: "SUSPICIOUS_ACCESS_ATTEMPT",
      resource: "Auth",
      details: "Multiple failed login attempts detected from IP 203.0.113.50",
      ipAddress: "203.0.113.50",
      userAgent: "Unknown",
      severity: "critical" as const,
      metadata: { failedAttempts: 5, blockedIp: "203.0.113.50" },
    },
    {
      userId: adminUser._id,
      action: "USER_ROLE_UPDATE",
      resource: "User",
      resourceId: doctorUser3._id,
      details: "Admin updated role permissions for Dr. Maria Garcia",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120",
      severity: "warning" as const,
    },
  ];

  for (const action of auditActions) {
    const data = `${action.userId}|${action.action}|${action.resource}|${action.details}|${action.ipAddress}|${Date.now()}`;
    const currentHash = CryptoJS.SHA256(data).toString();

    await AuditLog.create({
      ...action,
      currentHash,
      previousHash,
    });

    previousHash = currentHash;
  }

  console.log(`  ✅ Created ${auditActions.length} audit logs`);

  // ══════════════════════════════════════════════════════════════════
  //  10. BLOOD DONORS (2) & BLOOD REQUEST (1)
  // ══════════════════════════════════════════════════════════════════

  console.log("🩸 Creating blood donors and requests...");

  const donors = await BloodDonor.create([
    {
      userId: patientUser1._id,
      bloodType: "A+",
      isAvailable: true,
      lastDonationDate: daysAgo(120),
      nextEligibleDate: daysFromNow(0),
      location: {
        type: "Point",
        coordinates: [-73.9857, 40.7484], // NYC
        address: "123 Main St, New York, NY",
      },
      healthConditions: ["Asthma"],
      donationCount: 3,
    },
    {
      userId: patientUser2._id,
      bloodType: "O+",
      isAvailable: true,
      lastDonationDate: daysAgo(90),
      nextEligibleDate: daysAgo(4),
      location: {
        type: "Point",
        coordinates: [-118.2437, 34.0522], // LA
        address: "456 Oak Ave, Los Angeles, CA",
      },
      healthConditions: [],
      donationCount: 5,
    },
  ]);

  const bloodRequests = await BloodRequest.create([
    {
      requestedBy: doctorUser1._id,
      patientId: patient1._id,
      bloodType: "A+",
      unitsNeeded: 2,
      urgency: "urgent",
      status: "open",
      hospital: "City General Hospital",
      location: {
        type: "Point",
        coordinates: [-73.9712, 40.7831], // NYC hospital area
        address: "500 Hospital Ave, New York, NY",
      },
      respondedDonors: [
        {
          donorId: donors[0]._id,
          status: "pending",
          respondedAt: new Date(),
        },
      ],
      unitsFulfilled: 0,
      deadline: daysFromNow(3),
      notes: "Needed for scheduled cardiac surgery",
    },
  ]);

  console.log(`  ✅ Created ${donors.length} blood donors`);
  console.log(`  ✅ Created ${bloodRequests.length} blood requests`);

  // ══════════════════════════════════════════════════════════════════
  //  11. CONSULTATIONS (10 sample)
  // ══════════════════════════════════════════════════════════════════

  console.log("💬 Creating consultations...");

  const consultations = await Consultation.create([
    {
      patientId: patient1._id,
      doctorId: doctor1._id,
      appointmentId: appointments[0]._id,
      type: "chat",
      status: "ended",
      startedAt: daysAgo(3),
      endedAt: daysAgo(3),
      duration: 25,
      messages: [
        {
          senderId: patientUser1._id,
          content: "Good morning, Doctor. I've been feeling chest tightness.",
          type: "text",
          timestamp: daysAgo(3),
        },
        {
          senderId: doctorUser1._id,
          content: "I see. Let's schedule a detailed checkup. Any other symptoms?",
          type: "text",
          timestamp: daysAgo(3),
        },
      ],
      summary: "Patient reported chest tightness. Scheduled for ECG monitoring.",
    },
    {
      patientId: patient2._id,
      doctorId: doctor1._id,
      appointmentId: appointments[2]._id,
      type: "voice",
      status: "ended",
      startedAt: daysAgo(5),
      endedAt: daysAgo(5),
      duration: 15,
      messages: [],
      voiceCallData: {
        duration: 15,
        initiatedBy: patientUser2._id,
        quality: "good",
      },
      summary: "Discussed blood pressure readings. Medication adjustment recommended.",
    },
    {
      patientId: patient3._id,
      doctorId: doctor2._id,
      appointmentId: appointments[5]._id,
      type: "chat",
      status: "ended",
      startedAt: daysAgo(14),
      endedAt: daysAgo(14),
      duration: 30,
      messages: [
        {
          senderId: patientUser3._id,
          content: "The migraines are getting worse, especially in the morning.",
          type: "text",
          timestamp: daysAgo(14),
        },
        {
          senderId: doctorUser2._id,
          content: "I'll adjust your Topiramate dosage. Please keep the headache diary.",
          type: "text",
          timestamp: daysAgo(14),
        },
      ],
      summary: "Migraine follow-up. Topiramate dosage adjusted.",
    },
    {
      patientId: patient1._id,
      doctorId: doctor2._id,
      type: "chat",
      status: "active",
      startedAt: new Date(),
      messages: [
        {
          senderId: patientUser1._id,
          content: "Hello Doctor, I have some questions about my medication.",
          type: "text",
          timestamp: new Date(),
        },
      ],
    },
    {
      patientId: patient2._id,
      doctorId: doctor3._id,
      type: "voice",
      status: "waiting",
      messages: [],
    },
    {
      patientId: patient3._id,
      doctorId: doctor1._id,
      appointmentId: appointments[4]._id,
      type: "chat",
      status: "ended",
      startedAt: daysAgo(4),
      endedAt: daysAgo(4),
      duration: 20,
      messages: [
        {
          senderId: patientUser3._id,
          content: "The palpitations have reduced since starting Metoprolol.",
          type: "text",
          timestamp: daysAgo(4),
        },
        {
          senderId: doctorUser1._id,
          content: "Great news. Continue the medication and monitor your heart rate.",
          type: "text",
          timestamp: daysAgo(4),
        },
      ],
      summary: "Palpitations improving on Metoprolol. Continue current plan.",
    },
    {
      patientId: patient1._id,
      doctorId: doctor3._id,
      type: "chat",
      status: "ended",
      startedAt: daysAgo(10),
      endedAt: daysAgo(10),
      duration: 12,
      messages: [
        {
          senderId: patientUser1._id,
          content: "I missed my appointment. Can we do a quick check-in?",
          type: "text",
          timestamp: daysAgo(10),
        },
      ],
      summary: "Brief check-in after missed appointment. Patient reports feeling well.",
    },
    {
      patientId: patient2._id,
      doctorId: doctor2._id,
      appointmentId: appointments[7]._id,
      type: "voice",
      status: "ended",
      startedAt: daysAgo(2),
      endedAt: daysAgo(2),
      duration: 40,
      messages: [],
      voiceCallData: {
        duration: 40,
        initiatedBy: doctorUser2._id,
        quality: "fair",
      },
      summary: "Sleep disorder consultation. Referred for polysomnography.",
    },
    {
      patientId: patient3._id,
      doctorId: doctor3._id,
      type: "chat",
      status: "ended",
      startedAt: daysAgo(20),
      endedAt: daysAgo(20),
      duration: 8,
      messages: [
        {
          senderId: doctorUser3._id,
          content: "Just checking in on your wellness. Any concerns?",
          type: "text",
          timestamp: daysAgo(20),
        },
        {
          senderId: patientUser3._id,
          content: "Feeling good overall, thank you!",
          type: "text",
          timestamp: daysAgo(20),
        },
      ],
      summary: "Routine wellness check-in. Patient reports good health.",
    },
    {
      patientId: patient1._id,
      doctorId: doctor1._id,
      type: "chat",
      status: "waiting",
      messages: [],
    },
  ]);

  console.log(`  ✅ Created ${consultations.length} consultations`);

  // ══════════════════════════════════════════════════════════════════
  //  12. AI DIAGNOSES (10 sample)
  // ══════════════════════════════════════════════════════════════════

  console.log("🤖 Creating AI diagnoses...");

  const aiDiagnoses = await AIDiagnosis.create([
    {
      patientId: patientUser1._id,
      symptoms: ["Chest tightness", "Shortness of breath", "Fatigue"],
      additionalInfo: "Symptoms worsen with physical activity",
      patientAge: 34,
      patientGender: "female",
      result: {
        conditions: [
          { name: "Angina Pectoris", probability: 0.65, description: "Chest pain due to reduced blood flow to the heart." },
          { name: "Asthma exacerbation", probability: 0.25, description: "Worsening of pre-existing asthma." },
        ],
        recommendations: ["Seek immediate cardiology evaluation", "Avoid strenuous activity", "Take prescribed inhaler if available"],
        urgencyLevel: "high",
        disclaimer: "This is an AI-generated assessment and does not replace professional medical advice.",
      },
      status: "reviewed",
      reviewedBy: doctorUser1._id,
      doctorNotes: "Patient seen. Holter monitor ordered.",
    },
    {
      patientId: patientUser2._id,
      symptoms: ["Persistent headache", "Elevated blood pressure", "Blurred vision"],
      additionalInfo: "BP reading 165/100 at home",
      patientAge: 40,
      patientGender: "male",
      result: {
        conditions: [
          { name: "Hypertensive crisis", probability: 0.7, description: "Severely elevated blood pressure requiring urgent attention." },
          { name: "Tension headache", probability: 0.2, description: "Common headache type related to stress or posture." },
        ],
        recommendations: ["Seek urgent medical attention", "Do not stop antihypertensive medications", "Reduce sodium intake"],
        urgencyLevel: "emergency",
        disclaimer: "This is an AI-generated assessment and does not replace professional medical advice.",
      },
      status: "reviewed",
      reviewedBy: doctorUser1._id,
      doctorNotes: "BP medication adjusted. Follow-up in 1 week.",
    },
    {
      patientId: patientUser3._id,
      symptoms: ["Recurring migraine", "Nausea", "Light sensitivity"],
      patientAge: 29,
      patientGender: "female",
      result: {
        conditions: [
          { name: "Migraine with aura", probability: 0.8, description: "Recurring headaches often preceded by sensory disturbances." },
          { name: "Cluster headache", probability: 0.1, description: "Severe headaches occurring in cyclical patterns." },
        ],
        recommendations: ["Take prescribed sumatriptan at onset", "Rest in a dark quiet room", "Keep headache diary"],
        urgencyLevel: "medium",
        disclaimer: "This is an AI-generated assessment and does not replace professional medical advice.",
      },
      status: "completed",
    },
    {
      patientId: patientUser1._id,
      symptoms: ["Fatigue", "Cold intolerance", "Weight gain"],
      patientAge: 34,
      patientGender: "female",
      result: {
        conditions: [
          { name: "Hypothyroidism", probability: 0.72, description: "Underactive thyroid gland producing insufficient thyroid hormone." },
          { name: "Anemia", probability: 0.18, description: "Deficiency of red blood cells or hemoglobin." },
        ],
        recommendations: ["Get TSH and Free T4 blood tests", "Consult endocrinologist", "Monitor energy levels"],
        urgencyLevel: "medium",
        disclaimer: "This is an AI-generated assessment and does not replace professional medical advice.",
      },
      status: "reviewed",
      reviewedBy: doctorUser3._id,
      doctorNotes: "TSH confirmed elevated. Levothyroxine started.",
    },
    {
      patientId: patientUser2._id,
      symptoms: ["Insomnia", "Daytime sleepiness", "Snoring"],
      additionalInfo: "Partner reports patient stops breathing during sleep",
      patientAge: 40,
      patientGender: "male",
      result: {
        conditions: [
          { name: "Obstructive Sleep Apnea", probability: 0.85, description: "Repeated episodes of partial or complete airway obstruction during sleep." },
          { name: "Insomnia disorder", probability: 0.1, description: "Difficulty falling or staying asleep." },
        ],
        recommendations: ["Polysomnography (sleep study) recommended", "Avoid alcohol before bedtime", "Consider positional therapy"],
        urgencyLevel: "medium",
        disclaimer: "This is an AI-generated assessment and does not replace professional medical advice.",
      },
      status: "completed",
    },
    {
      patientId: patientUser3._id,
      symptoms: ["Skin rash", "Itching", "Swelling"],
      additionalInfo: "Started after wearing latex gloves",
      patientAge: 29,
      patientGender: "female",
      result: {
        conditions: [
          { name: "Latex allergy", probability: 0.9, description: "Allergic reaction to natural rubber latex." },
          { name: "Contact dermatitis", probability: 0.08, description: "Skin inflammation caused by contact with an allergen." },
        ],
        recommendations: ["Avoid latex products immediately", "Take antihistamine", "Consult allergist for testing"],
        urgencyLevel: "medium",
        disclaimer: "This is an AI-generated assessment and does not replace professional medical advice.",
      },
      status: "dismissed",
    },
    {
      patientId: patientUser1._id,
      symptoms: ["Heart palpitations", "Dizziness", "Lightheadedness"],
      patientAge: 34,
      patientGender: "female",
      result: {
        conditions: [
          { name: "Premature ventricular contractions", probability: 0.6, description: "Extra, abnormal heartbeats originating in the ventricles." },
          { name: "Anxiety disorder", probability: 0.3, description: "Excessive worry causing physical symptoms." },
        ],
        recommendations: ["Reduce caffeine intake", "Monitor heart rate", "See cardiologist if symptoms persist"],
        urgencyLevel: "low",
        disclaimer: "This is an AI-generated assessment and does not replace professional medical advice.",
      },
      status: "reviewed",
      reviewedBy: doctorUser1._id,
      doctorNotes: "PVCs confirmed on Holter. Benign. Lifestyle modifications advised.",
    },
    {
      patientId: patientUser2._id,
      symptoms: ["Lower back pain", "Stiffness", "Pain after sitting"],
      additionalInfo: "Works at a desk for 8+ hours daily",
      patientAge: 40,
      patientGender: "male",
      result: {
        conditions: [
          { name: "Lumbar muscle strain", probability: 0.65, description: "Stretching or tearing of the muscles and tendons in the lower back." },
          { name: "Lumbar disc herniation", probability: 0.25, description: "Displacement of disc material beyond the disc space." },
        ],
        recommendations: ["Physical therapy", "Ergonomic workstation setup", "Core strengthening exercises"],
        urgencyLevel: "low",
        disclaimer: "This is an AI-generated assessment and does not replace professional medical advice.",
      },
      status: "completed",
    },
    {
      patientId: patientUser3._id,
      symptoms: ["Sore throat", "Fever", "Swollen lymph nodes"],
      patientAge: 29,
      patientGender: "female",
      result: {
        conditions: [
          { name: "Streptococcal pharyngitis", probability: 0.6, description: "Bacterial throat infection caused by Streptococcus." },
          { name: "Infectious mononucleosis", probability: 0.25, description: "Viral infection often called the 'kissing disease'." },
        ],
        recommendations: ["Rapid strep test", "Rest and hydration", "See doctor if fever exceeds 39°C"],
        urgencyLevel: "medium",
        disclaimer: "This is an AI-generated assessment and does not replace professional medical advice.",
      },
      status: "completed",
    },
    {
      patientId: patientUser1._id,
      symptoms: ["Wheezing", "Shortness of breath", "Coughing at night"],
      additionalInfo: "Known asthma patient, pollen season",
      patientAge: 34,
      patientGender: "female",
      result: {
        conditions: [
          { name: "Asthma exacerbation", probability: 0.88, description: "Worsening of asthma symptoms due to triggers." },
          { name: "Allergic bronchitis", probability: 0.1, description: "Inflammation of the bronchial tubes due to allergens." },
        ],
        recommendations: ["Use rescue inhaler immediately", "Avoid known triggers", "Contact doctor if not improving in 24 hours"],
        urgencyLevel: "high",
        disclaimer: "This is an AI-generated assessment and does not replace professional medical advice.",
      },
      status: "reviewed",
      reviewedBy: doctorUser1._id,
      doctorNotes: "Asthma action plan reviewed. Increased inhaled corticosteroid dose.",
    },
  ]);

  console.log(`  ✅ Created ${aiDiagnoses.length} AI diagnoses`);

  // ══════════════════════════════════════════════════════════════════
  //  13. NOTIFICATIONS (5 per demo user)
  // ══════════════════════════════════════════════════════════════════

  console.log("🔔 Creating notifications...");

  const demoUsers = [adminUser, patientUser1, patientUser2, patientUser3, doctorUser1];

  const notificationTemplates = [
    {
      type: "appointment" as const,
      title: "Upcoming Appointment Reminder",
      body: "You have an appointment scheduled for tomorrow. Please confirm your attendance.",
      link: "/appointments",
    },
    {
      type: "prescription" as const,
      title: "Prescription Ready",
      body: "Your prescription has been updated. Please review your medication schedule.",
      link: "/prescriptions",
    },
    {
      type: "billing" as const,
      title: "Invoice Generated",
      body: "A new invoice has been created for your recent visit. Payment is due in 14 days.",
      link: "/invoices",
    },
    {
      type: "system" as const,
      title: "System Maintenance Notice",
      body: "Scheduled maintenance will occur tonight from 2:00 AM to 4:00 AM. Services may be briefly unavailable.",
      link: null,
    },
    {
      type: "chat" as const,
      title: "New Message from Doctor",
      body: "You have a new message in your consultation. Tap to view.",
      link: "/consultations",
    },
  ];

  const notificationDocs = demoUsers.flatMap((user, userIdx) =>
    notificationTemplates.map((tmpl, tmplIdx) => ({
      userId: user._id,
      type: tmpl.type,
      title: tmpl.title,
      body: tmpl.body,
      ...(tmpl.link ? { link: tmpl.link } : {}),
      // Stagger creation times; mark some as read
      createdAt: daysAgo(userIdx + tmplIdx),
      ...(tmplIdx < 2 ? { readAt: daysAgo(userIdx) } : {}),
    }))
  );

  const notifications = await Notification.insertMany(notificationDocs);

  console.log(`  ✅ Created ${notifications.length} notifications`);

  // ══════════════════════════════════════════════════════════════════
  //  SUMMARY
  // ══════════════════════════════════════════════════════════════════

  console.log("\n══════════════════════════════════════════════");
  console.log("  🎉 Database seeded successfully!");
  console.log("══════════════════════════════════════════════");
  console.log("\n📋 Summary:");
  console.log(`   Users:              8`);
  console.log(`   Patients:           3`);
  console.log(`   Doctors:            3`);
  console.log(`   Appointments:       ${appointments.length}`);
  console.log(`   Medical Records:    ${medicalRecords.length}`);
  console.log(`   Prescriptions:      ${prescriptions.length}`);
  console.log(`   Treatment Tracking: ${trackingEntries.length}`);
  console.log(`   Invoices:           ${invoices.length}`);
  console.log(`   Subscriptions:      ${subscriptions.length}`);
  console.log(`   Audit Logs:         ${auditActions.length}`);
  console.log(`   Blood Donors:       ${donors.length}`);
  console.log(`   Blood Requests:     ${bloodRequests.length}`);
  console.log(`   Consultations:      ${consultations.length}`);
  console.log(`   AI Diagnoses:       ${aiDiagnoses.length}`);
  console.log(`   Notifications:      ${notifications.length}`);
  console.log("\n🔑 Login credentials (all users):");
  console.log(`   Password: ${PASSWORD}`);
  console.log("\n📧 User emails:");
  console.log("   admin@clinic.com       (Admin)");
  console.log("   dr.sarah@clinic.com    (Doctor - Cardiology)");
  console.log("   dr.ahmed@clinic.com    (Doctor - Neurology)");
  console.log("   dr.maria@clinic.com    (Doctor - Pediatrics)");
  console.log("   patient1@clinic.com    (Patient - Alice Johnson)");
  console.log("   patient2@clinic.com    (Patient - Bob Smith)");
  console.log("   patient3@clinic.com    (Patient - Carol Williams)");
  console.log("   security@clinic.com    (Security Officer)");
  console.log("");

  await mongoose.disconnect();
  console.log("🔌 Disconnected from MongoDB");
  process.exit(0);
}

// ─── Run ─────────────────────────────────────────────────────────────────────

seed().catch((error) => {
  console.error("❌ Seed failed:", error);
  mongoose.disconnect();
  process.exit(1);
});
