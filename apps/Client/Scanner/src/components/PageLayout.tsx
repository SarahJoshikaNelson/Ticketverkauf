import type { ReactNode } from "react";

interface PageLayoutProps {
  children: ReactNode;
}

export default function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="min-h-screen w-screen flex flex-col justify-center items-center bg-gray-950 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full relative">
        {children}
      </div>
    </div>
  );
}
