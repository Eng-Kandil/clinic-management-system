// Models
export { User } from "./User";
export { Patient } from "./Patient";
export { Doctor } from "./Doctor";
export { Appointment } from "./Appointment";
export { MedicalRecord } from "./MedicalRecord";
export { Prescription } from "./Prescription";
export { TreatmentTracking } from "./TreatmentTracking";
export { Consultation } from "./Consultation";
export { BloodDonor } from "./BloodDonor";
export { BloodRequest } from "./BloodRequest";
export { Invoice } from "./Invoice";
export { Subscription } from "./Subscription";
export { AuditLog } from "./AuditLog";

// Interfaces
export type { IUser } from "./User";
export type { IPatient, IEmergencyContact, IAddress, IInsuranceInfo } from "./Patient";
export type { IDoctor, IAvailableSlot } from "./Doctor";
export type { IAppointment } from "./Appointment";
export type {
  IMedicalRecord,
  ILabResult,
  ILabResultRef,
  IVitals,
  IAttachment,
  IAIDiagnosisSuggestion,
} from "./MedicalRecord";
export type { IPrescription, IMedication } from "./Prescription";
export type { ITreatmentTracking } from "./TreatmentTracking";
export type {
  IConsultation,
  IConsultationMessage,
  IVoiceCallData,
} from "./Consultation";
export type { IBloodDonor, IBloodDonorLocation } from "./BloodDonor";
export type {
  IBloodRequest,
  IRespondedDonor,
  IBloodRequestLocation,
} from "./BloodRequest";
export type { IInvoice, IInvoiceItem } from "./Invoice";
export type { ISubscription, IPaymentHistoryEntry } from "./Subscription";
export type { IAuditLog } from "./AuditLog";
export { AIDiagnosisModel } from "./AIDiagnosis";
export type {
  IAIDiagnosis,
  IDiagnosisResult,
  ICondition,
} from "./AIDiagnosis";
export { Notification } from "./Notification";
export { Payment } from "./Payment";
export { Slot } from "./Slot";
export { Message } from "./Message";
export { Rating } from "./Rating";
export { Department } from "./Department";
export { ChatSession } from "./ChatSession";
export { AIRateLimit } from "./AIRateLimit";
export { AIUsage } from "./AIUsage";
export { NotificationPreference } from "./NotificationPreference";
export { FileUpload } from "./FileUpload";
export { PasswordResetToken } from "./PasswordResetToken";
export { Settings } from "./Settings";

// New model interfaces
export type { INotification } from "./Notification";
export type { IPayment } from "./Payment";
export type { ISlot } from "./Slot";
export type { IMessage } from "./Message";
export type { IRating } from "./Rating";
export type { IDepartment } from "./Department";
export type { IChatSession } from "./ChatSession";
export type { IAIRateLimit } from "./AIRateLimit";
export type { IAIUsage } from "./AIUsage";
export type { INotificationPreference } from "./NotificationPreference";
export type { IFileUpload } from "./FileUpload";
export type { IPasswordResetToken } from "./PasswordResetToken";
export type { ISettings } from "./Settings";
