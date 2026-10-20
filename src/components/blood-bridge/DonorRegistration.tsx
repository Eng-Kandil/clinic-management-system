"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import BloodTypeSelector from "./BloodTypeSelector";
import {
  Droplet,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Shield,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  AlertCircle,
  Heart,
} from "lucide-react";

interface DonorFormData {
  bloodType: string;
  address: string;
  contactPhone: string;
  contactPreference: "email" | "phone" | "both";
  medicalConditions: string;
  isAvailable: boolean;
  lastDonationDate: string;
  weight: string;
  dateOfBirth: string;
}

interface DonorRegistrationProps {
  existingDonor?: {
    _id: string;
    bloodType: string;
    isAvailable: boolean;
    lastDonationDate?: string;
    nextEligibleDate?: string;
    location?: { address?: string };
    healthConditions?: string[];
    donationCount: number;
  } | null;
  onSubmit: (data: DonorFormData) => Promise<void>;
  onUpdate?: (data: Partial<DonorFormData>) => Promise<void>;
  loading?: boolean;
}

export default function DonorRegistration({
  existingDonor,
  onSubmit,
  onUpdate,
  loading = false,
}: DonorRegistrationProps) {
  const [formData, setFormData] = useState<DonorFormData>({
    bloodType: existingDonor?.bloodType || "",
    address: existingDonor?.location?.address || "",
    contactPhone: "",
    contactPreference: "both",
    medicalConditions: existingDonor?.healthConditions?.join(", ") || "",
    isAvailable: existingDonor?.isAvailable ?? true,
    lastDonationDate: existingDonor?.lastDonationDate
      ? new Date(existingDonor.lastDonationDate).toISOString().split("T")[0]!
      : "",
    weight: "",
    dateOfBirth: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check 56-day eligibility
  function getEligibilityInfo(): {
    isEligible: boolean;
    nextDate: string | null;
    daysRemaining: number;
  } {
    const dateToCheck =
      formData.lastDonationDate || existingDonor?.lastDonationDate;
    if (!dateToCheck) return { isEligible: true, nextDate: null, daysRemaining: 0 };

    const lastDate = new Date(dateToCheck);
    const nextEligible = new Date(lastDate);
    nextEligible.setDate(nextEligible.getDate() + 56);
    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil(
        (nextEligible.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
    );

    return {
      isEligible: now >= nextEligible,
      nextDate: nextEligible.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      daysRemaining,
    };
  }

  const eligibility = getEligibilityInfo();

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!formData.bloodType) newErrors.bloodType = "Please select a blood type";
    if (!existingDonor) {
      if (!formData.dateOfBirth)
        newErrors.dateOfBirth = "Date of birth is required";
      if (!formData.weight) newErrors.weight = "Weight is required";
      else if (parseFloat(formData.weight) < 50)
        newErrors.weight = "Minimum weight is 50 kg";
      if (!formData.contactPhone)
        newErrors.contactPhone = "Phone number is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    if (existingDonor && onUpdate) {
      await onUpdate(formData);
    } else {
      await onSubmit(formData);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Registration status banner */}
      {existingDonor && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600">
            <CheckCircle2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800">
              Registered Blood Donor
            </p>
            <p className="text-xs text-green-600">
              Blood type {existingDonor.bloodType} &middot;{" "}
              {existingDonor.donationCount} donation
              {existingDonor.donationCount !== 1 ? "s" : ""} &middot;{" "}
              {existingDonor.isAvailable ? "Available" : "Unavailable"}
            </p>
          </div>
        </div>
      )}

      {/* Blood Type Selection */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          <Droplet className="mr-1.5 inline h-4 w-4 text-red-500" />
          Blood Type *
        </label>
        <BloodTypeSelector
          value={formData.bloodType}
          onChange={(type) =>
            setFormData((prev) => ({ ...prev, bloodType: type }))
          }
          showCompatibility
        />
        {errors.bloodType && (
          <p className="mt-1.5 text-xs text-red-600">{errors.bloodType}</p>
        )}
      </div>

      {/* Location / Address */}
      <Input
        label="Location / City"
        placeholder="Enter your city or area"
        value={formData.address}
        onChange={(e) =>
          setFormData((prev) => ({ ...prev, address: e.target.value }))
        }
        icon={<MapPin className="h-4 w-4" />}
      />

      {/* Contact fields — only for new registrations */}
      {!existingDonor && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Date of Birth *"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  dateOfBirth: e.target.value,
                }))
              }
              error={errors.dateOfBirth}
              icon={<Calendar className="h-4 w-4" />}
            />
            <Input
              label="Weight (kg) *"
              type="number"
              placeholder="e.g. 65"
              min={0}
              value={formData.weight}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, weight: e.target.value }))
              }
              error={errors.weight}
            />
          </div>

          <Input
            label="Contact Phone *"
            placeholder="+1 (555) 123-4567"
            value={formData.contactPhone}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                contactPhone: e.target.value,
              }))
            }
            error={errors.contactPhone}
            icon={<Phone className="h-4 w-4" />}
          />

          {/* Contact Preference */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Contact Preference
            </label>
            <div className="flex gap-3">
              {(["email", "phone", "both"] as const).map((pref) => (
                <button
                  key={pref}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      contactPreference: pref,
                    }))
                  }
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                    formData.contactPreference === pref
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {pref === "email" && <Mail className="h-4 w-4" />}
                  {pref === "phone" && <Phone className="h-4 w-4" />}
                  {pref === "both" && <Heart className="h-4 w-4" />}
                  {pref.charAt(0).toUpperCase() + pref.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Last Donation Date */}
      <Input
        label="Last Donation Date"
        type="date"
        value={formData.lastDonationDate}
        onChange={(e) =>
          setFormData((prev) => ({
            ...prev,
            lastDonationDate: e.target.value,
          }))
        }
        icon={<Calendar className="h-4 w-4" />}
      />

      {/* Eligibility status */}
      {formData.lastDonationDate && (
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg border p-3",
            eligibility.isEligible
              ? "border-green-200 bg-green-50"
              : "border-amber-200 bg-amber-50"
          )}
        >
          {eligibility.isEligible ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  Eligible to donate
                </p>
                <p className="text-xs text-green-600">
                  56+ days since your last donation
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Not yet eligible
                </p>
                <p className="text-xs text-amber-600">
                  {eligibility.daysRemaining} day
                  {eligibility.daysRemaining !== 1 ? "s" : ""} remaining. Next
                  eligible: {eligibility.nextDate}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Medical Conditions */}
      <Textarea
        label="Health Conditions (optional)"
        placeholder="List any relevant health conditions, separated by commas"
        value={formData.medicalConditions}
        onChange={(e) =>
          setFormData((prev) => ({
            ...prev,
            medicalConditions: e.target.value,
          }))
        }
      />

      {/* Medical Clearance Notice */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
        <Shield className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800">
            Medical Clearance
          </p>
          <p className="text-xs text-blue-600">
            All donors undergo a medical screening before donation. Please
            ensure you meet the basic eligibility criteria: 18+ years old,
            50+ kg, and in good general health.
          </p>
        </div>
      </div>

      {/* Availability Toggle */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <p className="text-sm font-medium text-slate-700">
            Available for Donation
          </p>
          <p className="text-xs text-slate-500">
            Turn on to be matched with blood requests
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setFormData((prev) => ({
              ...prev,
              isAvailable: !prev.isAvailable,
            }))
          }
          className="shrink-0"
        >
          {formData.isAvailable ? (
            <ToggleRight className="h-8 w-8 text-red-600" />
          ) : (
            <ToggleLeft className="h-8 w-8 text-slate-400" />
          )}
        </button>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        loading={loading}
        className="w-full bg-red-600 hover:bg-red-700"
        size="lg"
      >
        <Droplet className="mr-2 h-4 w-4 fill-current" />
        {existingDonor ? "Update Donor Profile" : "Register as Blood Donor"}
      </Button>
    </form>
  );
}
