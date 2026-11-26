import React, { useState } from 'react';

interface ProductImageProps {
  src: string;
  title: string;
}

export const ProductImage: React.FC<ProductImageProps> = ({ src, title }) => {
  const [loading, setLoading] = useState(true);

  return (
    <div className="relative h-full w-full">
      {loading && (
        <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={title}
        onLoad={() => setLoading(false)}
        className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-110 ${loading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  );
};
