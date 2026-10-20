"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { Star, Loader2 } from "lucide-react";

interface RatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultationId: string;
  doctorName: string;
  onSubmit: (rating: number, feedback: string) => Promise<void>;
}

export default function RatingDialog({
  open,
  onOpenChange,
  doctorName,
  onSubmit,
}: RatingDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;

    setSubmitting(true);
    try {
      await onSubmit(rating, feedback);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;

  const ratingLabels: Record<number, string> = {
    1: "Poor",
    2: "Fair",
    3: "Good",
    4: "Very Good",
    5: "Excellent",
  };

  if (submitted) {
    return (
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title="Thank you!"
        description="Your feedback helps us improve."
      >
        <div className="flex flex-col items-center py-4">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-sm text-slate-600">
            You rated this consultation {rating}/5
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Rate your consultation"
      description={`How was your experience with Dr. ${doctorName}?`}
    >
      <div className="space-y-5">
        {/* Star rating */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="rounded-md p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Star
                  className={`h-8 w-8 transition-colors ${
                    star <= displayRating
                      ? "fill-amber-400 text-amber-400"
                      : "fill-slate-200 text-slate-200"
                  }`}
                />
              </button>
            ))}
          </div>
          {displayRating > 0 && (
            <span className="text-sm font-medium text-slate-700">
              {ratingLabels[displayRating]}
            </span>
          )}
        </div>

        {/* Feedback textarea */}
        <Textarea
          label="Feedback (optional)"
          placeholder="Tell us about your experience..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={3}
          maxLength={500}
        />

        {feedback.length > 0 && (
          <p className="text-right text-xs text-slate-400">
            {feedback.length}/500
          </p>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            loading={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Rating"
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
