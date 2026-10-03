"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

export type DeleteScrapTypeModalProps = {
  isOpen: boolean;
  scrapTypeName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function DeleteScrapTypeModal({
  isOpen,
  scrapTypeName,
  isDeleting,
  onConfirm,
  onClose,
}: DeleteScrapTypeModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  // Auto-focus the cancel button when modal opens for safety against accidental enter key
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backgroundColor: "rgba(12, 41, 38, 0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-scrap-type-title"
        aria-describedby="delete-scrap-type-desc"
        style={{
          background: "#ffffff",
          borderRadius: "10px",
          width: "100%",
          maxWidth: "440px",
          border: "1px solid #e4ebe8",
          boxShadow: "0 16px 36px rgba(18, 60, 55, 0.16)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #edf1f0",
            backgroundColor: "#fafcfb",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                backgroundColor: "#fdf2f0",
                color: "#b45e4d",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={17} />
            </div>
            <h3
              id="delete-scrap-type-title"
              style={{
                margin: 0,
                color: "#163a35",
                fontSize: "15px",
                fontWeight: 700,
                letterSpacing: "-0.2px",
              }}
            >
              Delete Scrap Type?
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            style={{
              border: 0,
              background: "transparent",
              color: "#788984",
              cursor: isDeleting ? "not-allowed" : "pointer",
              padding: "6px",
              display: "grid",
              placeItems: "center",
              borderRadius: "6px",
            }}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px" }}>
          <p
            id="delete-scrap-type-desc"
            style={{
              margin: 0,
              color: "#23463f",
              fontSize: "13px",
              lineHeight: 1.5,
            }}
          >
            Are you sure you want to delete{" "}
            <strong style={{ color: "#163a35", wordBreak: "break-word" }}>
              &ldquo;{scrapTypeName}&rdquo;
            </strong>
            ?
          </p>

          <p
            style={{
              margin: "10px 0 0",
              color: "#b45e4d",
              fontSize: "12px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            This action cannot be undone.
          </p>

          <div
            style={{
              marginTop: "14px",
              padding: "10px 12px",
              borderRadius: "6px",
              backgroundColor: "#f7faf8",
              border: "1px solid #e7eee9",
              fontSize: "11px",
              color: "#6b807a",
              lineHeight: 1.4,
            }}
          >
            Note: Scrap types that are being used by existing purchase or sale records,
            or that have active stock on hand, are protected and cannot be deleted.
          </div>
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: "14px 20px",
            backgroundColor: "#fafcfb",
            borderTop: "1px solid #edf1f0",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            style={{
              padding: "8px 16px",
              border: "1px solid #dfe8e4",
              borderRadius: "6px",
              backgroundColor: "#ffffff",
              color: "#45665d",
              fontSize: "12px",
              fontWeight: 600,
              cursor: isDeleting ? "not-allowed" : "pointer",
              transition: "background-color 0.15s ease",
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              padding: "8px 18px",
              border: 0,
              borderRadius: "6px",
              backgroundColor: isDeleting ? "#d88d80" : "#b45e4d",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: 700,
              cursor: isDeleting ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              transition: "background-color 0.15s ease",
            }}
          >
            <Trash2 size={13} aria-hidden="true" />
            <span>{isDeleting ? "Deleting..." : "Delete"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
