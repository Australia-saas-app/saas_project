import React from "react";
import { Button } from "../ui/button";

interface ConfirmDeleteModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ message, onConfirm, onCancel, isSubmitting=false }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/20 bg-opacity-50">
      <div className="bg-white p-6 rounded shadow-md w-96">
        <p className="text-gray-800 mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <Button
          variant={'outline'}
            onClick={onCancel}
           
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
          variant={'destructive'}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
