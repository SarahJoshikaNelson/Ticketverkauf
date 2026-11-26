import type { ReactNode } from "react";

interface IconCircleProps {
  children: ReactNode;
  variant: "info" | "error" | "success" | "warning";
}

const variantStyles = {
  info: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  error: "bg-red-500/20 text-red-400 border border-red-500/30",
  success: "bg-green-500/20 text-green-400 border border-green-500/30",
  warning: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
};

export default function IconCircle({ children, variant }: IconCircleProps) {
  return (
    <div
      className={`flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4 ${variantStyles[variant]}`}
    >
      {children}
    </div>
  );
}
