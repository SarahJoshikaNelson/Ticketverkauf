import React from 'react';
import QRCode from 'react-qr-code';
import { Badge } from '@/components/ui/badge';
import { Image, Database, Circle } from 'lucide-react';
import { DesignElement, DesignElementTypes } from '@/hooks/useDesigns';
import { getContrastingColor } from '@/utils/qrCodeColors';

interface ElementRendererProps {
  element: DesignElement;
}

export const ElementRenderer: React.FC<ElementRendererProps> = ({ element }) => {
  // Apply visibility styling
  const visibilityStyle = element.visible === false ? { opacity: 0.3, filter: 'grayscale(100%)' } : {};

  switch (element.type) {
    case DesignElementTypes.QR:
      const bgColor = element.backgroundColor || '#ffffff';
      const fgColor = getContrastingColor(bgColor);
      
      return (
        <div 
          className="w-full h-full flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded shadow-sm transition-colors duration-300"
          style={{
            backgroundColor: bgColor,
            ...visibilityStyle
          }}
        >
          <QRCode 
            value={element.content || 'QR Code'} 
            size={Math.min(element.width - 8, element.height - 8)}
            fgColor={fgColor}
            bgColor={bgColor}
            className="pointer-events-none select-none"
          />
        </div>
      );

    case DesignElementTypes.TEXT:
      return (
        <div 
          className="w-full h-full flex items-center justify-center p-1 bg-transparent transition-colors duration-300 pointer-events-none select-none"
          style={{
            fontSize: `${element.fontSize || 12}px`,
            fontWeight: element.fontWeight || 'normal',
            color: element.color || '#000000',
            ...visibilityStyle
          }}
        >
          <span className="text-center leading-tight whitespace-nowrap">
            {element.content || 'Text'}
          </span>
        </div>
      );

    case DesignElementTypes.FIELD:
      return (
        <div 
          className="w-full h-full flex items-center justify-center p-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded transition-colors duration-300 pointer-events-none select-none"
          style={{
            fontSize: `${element.fontSize || 12}px`,
            fontWeight: element.fontWeight || 'normal',
            color: element.color || '#1e40af',
            ...visibilityStyle
          }}
        >
          <div className="flex items-center gap-1">
            <span className="text-center whitespace-nowrap" style={{ fontSize: `${element.fontSize || 12}px` }}>
              {element.content || 'Datenfeld'}
            </span>
          </div>
        </div>
      );

    case DesignElementTypes.IMAGE:
      return (
        <div 
          className="w-full h-full flex items-center justify-center transition-colors duration-300 overflow-hidden"
          style={visibilityStyle}
        >
          {element.imageData ? (
            <img
              src={element.imageData}
              alt="Uploaded content"
              className="w-full h-full object-cover pointer-events-none select-none"
              draggable={false}
              onError={(e) => {
                console.error('Image failed to load:', element.imageData?.substring(0, 50) + '...');
                // Hide the broken image and show placeholder
                (e.target as HTMLImageElement).style.display = 'none';
              }}
              onLoad={() => {
                // Image loaded successfully
                console.log('Image loaded successfully');
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-1 text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 w-full h-full">
              <Image className="w-6 h-6" />
              <span className="text-xs">Bild</span>
            </div>
          )}
        </div>
      );

    case DesignElementTypes.BLUR:
      const blurIntensity = element.blurIntensity ?? 8;
      const backgroundColor = element.backgroundColor || '#ffffff';
      const opacity = (element.opacity || 50) / 100;
      
      // Convert hex color to rgba
      const hexToRgba = (hex: string, alpha: number) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      };

      return (
        <div
          className="w-full h-full flex items-center justify-center transition-colors duration-300 pointer-events-none select-none relative overflow-hidden"
          style={{
            borderRadius: `${element.borderRadius || 0}px`,
            ...visibilityStyle
          }}
        >
          {/* Checkerboard background to show transparency */}
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(45deg, #cccccc 25%, transparent 25%),
                linear-gradient(-45deg, #cccccc 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #cccccc 75%),
                linear-gradient(-45deg, transparent 75%, #cccccc 75%)
              `,
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
            }}
          />
          {/* Blur overlay with proper opacity */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: hexToRgba(backgroundColor, opacity),
              borderRadius: `${element.borderRadius || 0}px`,
              backdropFilter: blurIntensity > 0 ? `blur(${blurIntensity}px)` : 'none',
            }}
          />
          {/* Label */}
          <div className="relative z-10 text-gray-500 dark:text-gray-400 text-center">
            <Circle className="w-6 h-6 mx-auto mb-1" />
            <span className="text-xs">{blurIntensity > 0 ? 'Blur' : 'Block'}</span>
          </div>
        </div>
      );

    default:
      return (
        <div 
          className="w-full h-full flex items-center justify-center bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded transition-colors duration-300 pointer-events-none select-none"
          style={visibilityStyle}
        >
          <div className="flex flex-col items-center justify-center gap-1 text-red-500 dark:text-red-400">
            <Circle className="w-6 h-6" />
            <span className="text-xs">Unbekannt</span>
          </div>
        </div>
      );
  }
}; 