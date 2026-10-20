import mongoose, { Document, Model, Schema } from "mongoose";

export interface IDepartment extends Document {
  name: string;
  description?: string;
  headDoctorId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 100 },
    description: { type: String, maxlength: 500 },
    headDoctorId: { type: Schema.Types.ObjectId, ref: "Doctor" },
  },
  { timestamps: true }
);

export const Department: Model<IDepartment> =
  mongoose.models.Department || mongoose.model<IDepartment>("Department", DepartmentSchema);
