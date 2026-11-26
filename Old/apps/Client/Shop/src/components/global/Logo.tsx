import React, { useState } from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => {
  const [loading, setLoading] = useState(true);
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center p-0.5">
          <div className="h-full w-full border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      <img
        src="/logo3.png"
        alt="Logo"
        onLoad={() => setLoading(false)}
        className={`h-full w-full object-contain transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  );
};
