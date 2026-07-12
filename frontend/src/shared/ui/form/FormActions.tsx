"use client";

import React from "react";
import { Button } from "../ui/button";


/**
 * Reusable form action buttons component for Add/Update and Cancel operations
 * 
 * @example
 * // Basic usage with Add button
 * <FormActions submitLabel="Add Branch" onCancel={() => form.reset()} />
 * 
 * @example
 * // Update button without cancel
 * <FormActions submitLabel="Update" showCancel={false} />
 * 
 * @example
 * // With loading state
 * <FormActions 
 *   submitLabel="Save" 
 *   isSubmitting={isLoading}
 *   onCancel={() => router.back()}
 * />
 */
interface FormActionsProps {
  /** Function to call when cancel button is clicked */
  onCancel?: () => void;
  /** Label for the submit button (default: "Submit") */
  submitLabel?: string;
  /** Label for the cancel button (default: "Cancel") */
  cancelLabel?: string;
  /** Whether the form is currently submitting (shows "Processing..." on submit button) */
  isSubmitting?: boolean;
  /** Whether to show the cancel button (default: true) */
  showCancel?: boolean;
  /** Additional CSS classes for the wrapper div */
  className?: string;
}

export const FormActions: React.FC<FormActionsProps> = ({
  onCancel,
  submitLabel = "Submit",
  cancelLabel = "Cancel",
  isSubmitting = false,
  showCancel = true,
  className = "",
}) => {
  return (
    <div className={`flex justify-end gap-4 ${className}`}>
      {showCancel && (
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
         
        >
          {cancelLabel}
        </Button>
      )}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="cursor-pointer whitespace-nowrap px-8 py-2 rounded-md text-nowrap"
      >
        {isSubmitting ? "Processing..." : submitLabel}
      </Button>
    </div>
  );
};
