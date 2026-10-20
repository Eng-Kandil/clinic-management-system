import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface IAddress {
  street?: string;
  city: string;
  state?: string;
  country: string;
  zipCode?: string;
}

export interface IInsuranceInfo {
  provider: string;
  policyNumber: string;
  expiryDate?: Date;
}

export interface IPatient extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  dateOfBirth: Date;
  gender: "male" | "female" | "other";
  bloodType?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
  allergies: string[];
  chronicConditions: string[];
  emergencyContact: IEmergencyContact;
  address: IAddress;
  insuranceInfo?: IInsuranceInfo;
  createdAt: Date;
  updatedAt: Date;
}

const EmergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    relation: { type: String, required: true },
  },
  { _id: false }
);

const AddressSchema = new Schema<IAddress>(
  {
    street: { type: String },
    city: { type: String, required: true },
    state: { type: String },
    country: { type: String, required: true },
    zipCode: { type: String },
  },
  { _id: false }
);

const InsuranceInfoSchema = new Schema<IInsuranceInfo>(
  {
    provider: { type: String, required: true },
    policyNumber: { type: String, required: true },
    expiryDate: { type: Date },
  },
  { _id: false }
);

const PatientSchema = new Schema<IPatient>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    dateOfBirth: { type: Date, required: true },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },
    bloodType: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    allergies: [{ type: String, trim: true }],
    chronicConditions: [{ type: String, trim: true }],
    emergencyContact: {
      type: EmergencyContactSchema,
      required: true,
    },
    address: {
      type: AddressSchema,
      required: true,
    },
    insuranceInfo: InsuranceInfoSchema,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
PatientSchema.index({ userId: 1 }, { unique: true });
PatientSchema.index({ bloodType: 1 });

// Virtual: populate user
PatientSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

export const Patient: Model<IPatient> =
  mongoose.models.Patient || mongoose.model<IPatient>("Patient", PatientSchema);
