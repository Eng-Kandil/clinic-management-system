import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAppointment extends Document {
  _id: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  dateTime: Date;
  endTime: Date;
  type: "in-person" | "remote";
  status:
    | "scheduled"
    | "confirmed"
    | "in-progress"
    | "completed"
    | "cancelled"
    | "no-show";
  reason: string;
  notes?: string;
  cancelledBy?: mongoose.Types.ObjectId;
  cancelReason?: string;
  reminderSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    dateTime: { type: Date, required: [true, "Appointment date/time is required"] },
    endTime: { type: Date, required: [true, "End time is required"] },
    type: {
      type: String,
      enum: ["in-person", "remote"],
      required: true,
    },
    status: {
      type: String,
      enum: [
        "scheduled",
        "confirmed",
        "in-progress",
        "completed",
        "cancelled",
        "no-show",
      ],
      default: "scheduled",
    },
    reason: { type: String, required: [true, "Reason for appointment is required"] },
    notes: { type: String },
    cancelledBy: { type: Schema.Types.ObjectId, ref: "User" },
    cancelReason: {
      type: String,
      required: function (this: IAppointment) {
        return this.status === "cancelled";
      },
    },
    reminderSentAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Indexes
AppointmentSchema.index({ dateTime: 1 });
AppointmentSchema.index({ patientId: 1, dateTime: -1 });
AppointmentSchema.index({ doctorId: 1, dateTime: -1 });
AppointmentSchema.index({ status: 1 });
AppointmentSchema.index({ doctorId: 1, dateTime: 1 }, { unique: true });

export const Appointment: Model<IAppointment> =
  mongoose.models.Appointment ||
  mongoose.model<IAppointment>("Appointment", AppointmentSchema);
