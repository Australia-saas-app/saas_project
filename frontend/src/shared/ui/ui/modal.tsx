"use client";

import { AnimatePresence, motion } from "framer-motion";
import React, { ReactNode, useEffect } from "react";

/**
 * Reusable Modal component for displaying overlay dialogs
 * 
 * @example
 * // Basic usage
 * <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Item">
 *   <form>...</form>
 * </Modal>
 * 
 * @example
 * // With custom size and footer
 * <Modal 
 *   isOpen={isOpen} 
 *   onClose={handleClose}
 *   title="Confirm Action"
 *   size="sm"
 *   showCloseButton={false}
 * >
 *   <p>Are you sure?</p>
 * </Modal>
 * 
 * @example
 * // Large modal with no close on overlay
 * <Modal 
 *   isOpen={isOpen} 
 *   onClose={handleClose}
 *   title="Edit Details"
 *   size="lg"
 *   closeOnOverlayClick={false}
 * >
 *   <YourFormComponent />
 * </Modal>
 */

interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Function to call when modal should close */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal content */
  children: ReactNode;
  /** Size of the modal - default is 'md' */
  size?: "sm" | "md" | "lg" | "xl" | "full";
  /** Whether clicking overlay closes modal - default is true */
  closeOnOverlayClick?: boolean;
  /** Whether to show close button - default is true */
  showCloseButton?: boolean;
  /** Additional CSS classes for modal content */
  className?: string;
  /** Additional CSS classes for modal container */
  containerClassName?: string;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-full mx-4",
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  closeOnOverlayClick = true,
  showCloseButton = true,
  className = "",
  containerClassName = "",
}) => {
  // Handle ESC key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
          onClick={handleOverlayClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl w-[95vw] sm:w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col overflow-hidden ${containerClassName}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-6 overflow-y-auto flex-1 custom-scrollbar ${className}`}>
              {/* Header */}
              {(title || showCloseButton) && (
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                  {title && <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{title}</h2>}
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className="p-2 bg-gray-100/50 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 rounded-full transition-all duration-200 ml-auto focus:outline-none focus:ring-2 focus:ring-primary/50 active:scale-95"
                      aria-label="Close modal"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="text-gray-700 dark:text-gray-300">{children}</div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
