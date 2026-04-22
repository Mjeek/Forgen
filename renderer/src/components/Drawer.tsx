import { X } from "lucide-react";
import { ReactNode } from "react";

export function Drawer({
  open, onClose, title, width = 480, children, aside,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  width?: number;
  children: ReactNode;
  aside?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {aside && (
        <div className="relative w-72 bg-ink-950 border-l border-ink-800 p-5 overflow-y-auto shadow-drawer">
          {aside}
        </div>
      )}
      <div
        className="relative bg-ink-950 border-l border-ink-800 overflow-y-auto shadow-drawer"
        style={{ width }}
      >
        <div className="flex items-center justify-between p-4 border-b border-ink-800 sticky top-0 bg-ink-950 z-10">
          <div className="text-sm font-semibold">{title}</div>
          <button className="text-ink-400 hover:text-ink-100" onClick={onClose}><X size={18} /></button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
