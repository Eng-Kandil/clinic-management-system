import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IInvoice extends Document {
  _id: mongoose.Types.ObjectId;
  invoiceNumber: string;
  patientId: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  consultationId?: mongoose.Types.ObjectId;
  items: IInvoiceItem[];
  subtotal: number;
  tax: number;
  discount?: number;
  total: number;
  status: "pending" | "paid" | "overdue" | "cancelled" | "refunded";
  paymentMethod?:
    | "mock_credit_card"
    | "mock_debit_card"
    | "mock_insurance"
    | "mock_cash"
    | "demo_card"
    | "demo_cash";
  paidAt?: Date;
  dueDate: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },
    consultationId: {
      type: Schema.Types.ObjectId,
      ref: "Consultation",
    },
    items: {
      type: [InvoiceItemSchema],
      validate: {
        validator: (v: IInvoiceItem[]) => v.length > 0,
        message: "At least one item is required",
      },
    },
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0, default: 0 },
    discount: { type: Number, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "paid", "overdue", "cancelled", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: [
        "mock_credit_card",
        "mock_debit_card",
        "mock_insurance",
        "mock_cash",
      ],
    },
    paidAt: { type: Date },
    dueDate: { type: Date, required: [true, "Due date is required"] },
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes
InvoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ patientId: 1, createdAt: -1 });
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ dueDate: 1, status: 1 });

// Pre-save: auto-generate invoice number
InvoiceSchema.pre("save", async function () {
  if (this.isNew && !this.invoiceNumber) {
    const year = new Date().getFullYear();
    const InvoiceModel = this.constructor as Model<IInvoice>;
    const lastInvoice = await InvoiceModel.findOne(
      { invoiceNumber: { $regex: `^INV-${year}-` } },
      { invoiceNumber: 1 },
      { sort: { invoiceNumber: -1 } }
    );

    let nextNumber = 1;
    if (lastInvoice?.invoiceNumber) {
      const parts = lastInvoice.invoiceNumber.split("-");
      nextNumber = parseInt(parts[2] ?? "0", 10) + 1;
    }

    this.invoiceNumber = `INV-${year}-${String(nextNumber).padStart(4, "0")}`;
  }
});

export const Invoice: Model<IInvoice> =
  mongoose.models.Invoice ||
  mongoose.model<IInvoice>("Invoice", InvoiceSchema);
