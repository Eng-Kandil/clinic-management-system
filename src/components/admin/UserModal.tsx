"use client";

import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Specialties
// ---------------------------------------------------------------------------
// Keep this list aligned with the department list used by the appointment
// booking wizard (src/app/dashboard/appointments/new) so that a newly created
// doctor's specialization matches a bookable department.

export const DOCTOR_SPECIALTIES = [
  "General Medicine",
  "Cardiology",
  "Dermatology",
  "Orthopedics",
  "Pediatrics",
  "Neurology",
  "Ophthalmology",
  "ENT",
  "Dentistry",
  "Psychiatry",
  "Gynecology",
  "Urology",
] as const;

const specialtyOptions = DOCTOR_SPECIALTIES.map((s) => ({ label: s, value: s }));

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const baseSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  role: z.enum(["admin", "doctor", "patient", "security_officer"], {
    message: "Role is required",
  }),
  isActive: z.boolean(),
  // Doctor-only fields. Optional at the type level; conditionally required via
  // superRefine below when role === "doctor".
  specialization: z.string().optional(),
  consultationFee: z.coerce
    .number({ message: "Fee must be a number" })
    .min(0, "Fee cannot be negative")
    .optional(),
});

function requireDoctorFields(
  data: { role: string; specialization?: string; consultationFee?: number },
  ctx: z.RefinementCtx
) {
  if (data.role === "doctor") {
    if (!data.specialization || data.specialization.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["specialization"],
        message: "Specialty is required for doctors",
      });
    }
    if (data.consultationFee === undefined || Number.isNaN(data.consultationFee)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["consultationFee"],
        message: "Consultation fee is required for doctors",
      });
    }
  }
}

const createSchema = baseSchema
  .extend({
    password: z.string().min(8, "Password must be at least 8 characters"),
  })
  .superRefine(requireDoctorFields);

const editSchema = baseSchema.superRefine(requireDoctorFields);

export type CreateUserFormData = z.infer<typeof createSchema>;
export type EditUserFormData = z.infer<typeof editSchema>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserModalUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: "admin" | "doctor" | "patient" | "security_officer";
  isActive: boolean;
  specialization?: string;
  consultationFee?: number;
}

interface UserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  user?: UserModalUser | null;
  onSubmit: (data: CreateUserFormData | EditUserFormData) => Promise<void>;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UserModal({
  open,
  onOpenChange,
  mode,
  user,
  onSubmit,
  loading = false,
}: UserModalProps) {
  const isCreate = mode === "create";
  const schema = isCreate ? createSchema : editSchema;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateUserFormData>({
    // The form always uses the create-shape (password optional in edit mode is
    // handled by stripping at submit). Cast through unknown because the shared
    // resolver returns a union when schema is conditional.
    resolver: zodResolver(schema) as unknown as Resolver<CreateUserFormData>,
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "patient",
      isActive: true,
      password: "",
      specialization: "",
      consultationFee: undefined,
    },
  });

  const selectedRole = watch("role");
  const isDoctor = selectedRole === "doctor";

  // Reset form when opening/closing or switching user
  useEffect(() => {
    if (open && mode === "edit" && user) {
      reset({
        name: user.name,
        email: user.email,
        phone: user.phone ?? "",
        role: user.role,
        isActive: user.isActive,
        password: "",
        specialization: user.specialization ?? "",
        consultationFee: user.consultationFee,
      });
    } else if (open && mode === "create") {
      reset({
        name: "",
        email: "",
        phone: "",
        role: "patient",
        isActive: true,
        password: "",
        specialization: "",
        consultationFee: undefined,
      });
    }
  }, [open, mode, user, reset]);

  async function handleFormSubmit(data: CreateUserFormData) {
    // Strip doctor-only fields when the selected role is not a doctor so we
    // never send a stray specialization/fee for a patient or admin.
    const payload: CreateUserFormData = { ...data };
    if (data.role !== "doctor") {
      delete (payload as Partial<CreateUserFormData>).specialization;
      delete (payload as Partial<CreateUserFormData>).consultationFee;
    }

    if (!isCreate) {
      // Strip password for edit mode
      const { password: _pw, ...editData } = payload;
      await onSubmit(editData);
    } else {
      await onSubmit(payload);
    }
  }

  const roleOptions = [
    { label: "Patient", value: "patient" },
    { label: "Doctor", value: "doctor" },
    { label: "Admin", value: "admin" },
    { label: "Security Officer", value: "security_officer" },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isCreate ? "Create New User" : "Edit User"}
      description={
        isCreate
          ? "Fill in the details to create a new user account."
          : `Editing ${user?.name ?? "user"}'s profile.`
      }
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
        {/* Name + Email row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Full Name"
            placeholder="John Doe"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            label="Email"
            type="email"
            placeholder="user@clinic.com"
            error={errors.email?.message}
            disabled={mode === "edit"}
            {...register("email")}
          />
        </div>

        {/* Phone + Role row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Phone"
            placeholder="+90 234 567 8900"
            error={errors.phone?.message}
            {...register("phone")}
          />
          <Select
            label="Role"
            options={roleOptions}
            error={errors.role?.message}
            {...register("role")}
          />
        </div>

        {/* Doctor-only fields */}
        {isDoctor && (
          <div className="grid grid-cols-1 gap-4 rounded-lg border border-blue-100 bg-blue-50/50 p-4 sm:grid-cols-2">
            <Select
              label="Specialty"
              placeholder="Select a specialty"
              options={specialtyOptions}
              error={errors.specialization?.message}
              {...register("specialization")}
            />
            <Input
              label="Consultation Fee (₺)"
              type="number"
              min={0}
              step="1"
              placeholder="e.g. 250"
              error={errors.consultationFee?.message}
              {...register("consultationFee")}
            />
            <p className="text-xs text-slate-500 sm:col-span-2">
              A doctor profile is created automatically. The department is derived
              from the specialty and a license number is generated.
            </p>
          </div>
        )}

        {/* Password (create only) */}
        {isCreate && (
          <Input
            label="Password"
            type="password"
            placeholder="Min 8 characters"
            error={errors.password?.message}
            {...register("password")}
          />
        )}

        {/* Active toggle */}
        <div className="flex items-center gap-3">
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              {...register("isActive")}
            />
            <div className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-blue-300" />
          </label>
          <span className="text-sm font-medium text-slate-700">Account Active</span>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isCreate ? "Create User" : "Save Changes"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
