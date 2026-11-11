import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { IoClose } from "react-icons/io5";

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md"
}) => {
  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    "2xl": "max-w-6xl",
    full: "max-w-full m-4"
  };

  const modalLayout = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      {/* Overlay click to close */}
      <div className="absolute inset-0" onClick={onClose}></div>

      {/* Modal Container */}
      <div
        className={`relative w-full ${sizeClasses[size]} bg-white rounded-xl shadow-2xl border border-slate-100 flex flex-col max-h-[calc(100vh-80px)] overflow-hidden z-10`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            tabIndex={-1}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <IoClose className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-grow">{children}</div>
      </div>
    </div>
  );

  return createPortal(modalLayout, document.body);
};
