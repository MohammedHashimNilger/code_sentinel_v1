import { useEffect } from "react";
import { IconX } from "@tabler/icons-react";

const Modal = ({ title, onClose, children }) => {
  // Close on Escape - standard dialog behavior people expect.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 z-50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-surface border border-line rounded-lg w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="text-parchment font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-parchment" aria-label="Close">
            <IconX size={20} stroke={1.75} />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
