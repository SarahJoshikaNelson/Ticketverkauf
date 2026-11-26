import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Layers, Upload, QrCode, Type, Image, Database, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { useTicketDesigner } from './TicketDesignerContext';
import { DesignElement, DesignElementFillers, DesignElementTypes } from '@/hooks/useDesigns';
import { getContrastingColor } from '@/utils/qrCodeColors';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;

interface ToolsPanelProps {
  designName: string;
  setDesignName: (name: string) => void;
}

export const ToolsPanel: React.FC<ToolsPanelProps> = ({ designName, setDesignName }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    updateCurrentPage,
    getCurrentElements,
  } = useTicketDesigner();

  const currentElements = getCurrentElements();

  // Check if QR code already exists
  const hasQRCode = currentElements.some(el => el.type === DesignElementTypes.QR);

  const addElement = (type: DesignElement['type']) => {
    // Prevent adding more than one QR code
    if (type === DesignElementTypes.QR && hasQRCode) {
      toast.error('Es kann nur ein QR-Code pro Ticket hinzugefügt werden');
      return;
    }

    // Calculate next z-index
    const maxZIndex = currentElements.length > 0 
      ? Math.max(...currentElements.map(el => el.zIndex || 0))
      : 0;

    // Default colors for QR code
    const qrBgColor = '#ffffff';
    const qrFgColor = getContrastingColor(qrBgColor);
    
    const newElement: DesignElement = {
      id: `${type}-${Date.now()}`,
      type,
      filler: DesignElementFillers.CODE, // Default filler, will be ignored by API for most types
      x: 50,
      y: 200 + currentElements.length * 40,
      width: type === DesignElementTypes.QR ? 80 : type === DesignElementTypes.IMAGE ? 120 : type === DesignElementTypes.BLUR ? 100 : 150,
      height: type === DesignElementTypes.QR ? 80 : type === DesignElementTypes.IMAGE ? 80 : type === DesignElementTypes.BLUR ? 60 : 30,
      content: type === DesignElementTypes.TEXT ? 'Neuer Text' : type === DesignElementTypes.FIELD ? 'Feldname' : '',
      fontSize: 12,
      fontWeight: 'normal',
      color: type === DesignElementTypes.QR ? qrFgColor : '#000000',
      visible: true,
      isDynamic: type === DesignElementTypes.QR || type === DesignElementTypes.FIELD,
      zIndex: maxZIndex + 1,
      // Blur element default values
      opacity: type === DesignElementTypes.BLUR ? 50 : 100,
      borderRadius: type === DesignElementTypes.BLUR ? 8 : 0,
      blurIntensity: type === DesignElementTypes.BLUR ? 8 : 0,
      backgroundColor: type === DesignElementTypes.QR ? qrBgColor : type === DesignElementTypes.BLUR ? '#ffffff' : '#000000',
      layer: 0,
      rotation: 0,
      imageData: ''
    };
    
    updateCurrentPage([...currentElements, newElement]);
  };

  const handleImageUpload = (file: File) => {
    try {
      if (!file) {
        toast.error('Keine Datei ausgewählt');
        return;
      }

      // More specific file type validation
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        toast.error('Unsupported file type. Please use JPG, PNG, GIF, or WebP');
        return;
      }


      // Show loading toast
      const loadingToast = toast.loading('Bild wird verarbeitet...');

      const reader = new FileReader();
      
      reader.onerror = () => {
        toast.dismiss(loadingToast);
        toast.error('Fehler beim Lesen der Bilddatei');
      };
      
      reader.onload = (e) => {
        try {
          const imageData = e.target?.result as string;
          
          if (!imageData || typeof imageData !== 'string' || !imageData.startsWith('data:image/')) {
            toast.dismiss(loadingToast);
            toast.error('Fehler beim Verarbeiten der Bilddatei');
            return;
          }
          
          // Validate the base64 data
          try {
            const base64Data = imageData.split(',')[1];
            if (!base64Data || base64Data.length === 0) {
              throw new Error('Invalid base64 data');
            }
            // Test if it's valid base64
            atob(base64Data);
          } catch (base64Error) {
            toast.dismiss(loadingToast);
            toast.error('Ungültige Bilddaten');
            return;
          }

          // Use original image data without compression or resizing
          // Calculate next z-index
          const maxZIndex = currentElements.length > 0 
            ? Math.max(...currentElements.map(el => el.zIndex || 0))
            : 0;

          const newElement: DesignElement = {
            id: `image-${Date.now()}`,
            type: DesignElementTypes.IMAGE,
            filler: DesignElementFillers.CODE,
            x: 50,
            y: 200 + currentElements.length * 40,
            width: 120,
            height: 80,
            content: '',
            imageData: imageData,
            visible: true,
            zIndex: maxZIndex + 1,
            fontSize: 12,
            fontWeight: 'normal',
            color: '#000000',
            isDynamic: false,
            layer: 0,
            rotation: 0,
            opacity: 100,
            borderRadius: 0,
            blurIntensity: 0,
            backgroundColor: '#000000'
          };
          
          updateCurrentPage([...currentElements, newElement]);
          toast.dismiss(loadingToast);
          toast.success('Bild erfolgreich hinzugefügt');
        } catch (error) {
          console.error('Error processing image:', error);
          toast.dismiss(loadingToast);
          toast.error('Fehler beim Verarbeiten der Bilddatei');
        }
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Fehler beim Hochladen der Bilddatei');
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Design Info */}
      <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm transition-colors duration-300">
        <CardHeader className="pb-3 lg:pb-4">
          <CardTitle className="flex items-center gap-2 text-base lg:text-lg text-gray-900 dark:text-gray-100">
            <Layers className="w-4 h-4 lg:w-5 lg:h-5 text-blue-500 dark:text-blue-400" />
            Design-Informationen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 lg:space-y-4">
          <div>
            <Label htmlFor="design-name" className="text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300">
              Design-Name
            </Label>
            <Input
              id="design-name"
              value={designName}
              onChange={(e) => setDesignName(e.target.value)}
              placeholder="Mein Ticket Design"
              className="mt-1 text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
            />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-2 rounded border dark:border-gray-700">
            Canvas: {CANVAS_WIDTH} × {CANVAS_HEIGHT}px
          </div>
        </CardContent>
      </Card>

      {/* Add Elements */}
      <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm transition-colors duration-300">
        <CardHeader className="pb-3 lg:pb-4">
          <CardTitle className="flex items-center gap-2 text-base lg:text-lg text-gray-900 dark:text-gray-100">
            <Upload className="w-4 h-4 lg:w-5 lg:h-5 text-green-500 dark:text-green-400" />
            Elemente hinzufügen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 lg:space-y-3">
          <Button 
            variant="outline" 
            size="sm"
            className="w-full justify-start gap-2 text-xs lg:text-sm border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300" 
            onClick={() => addElement(DesignElementTypes.QR)}
            disabled={hasQRCode}
          >
            <QrCode className="w-3 h-3 lg:w-4 lg:h-4 text-blue-500 dark:text-blue-400" />
            QR Code {hasQRCode && '(bereits vorhanden)'}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="w-full justify-start gap-2 text-xs lg:text-sm border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors duration-300" 
            onClick={() => addElement(DesignElementTypes.TEXT)}
          >
            <Type className="w-3 h-3 lg:w-4 lg:h-4 text-purple-500 dark:text-purple-400" />
            Text
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="w-full justify-start gap-2 text-xs lg:text-sm border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors duration-300" 
            onClick={() => addElement(DesignElementTypes.FIELD)}
          >
            <Database className="w-3 h-3 lg:w-4 lg:h-4 text-indigo-500 dark:text-indigo-400" />
            Datenfeld
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="w-full justify-start gap-2 text-xs lg:text-sm border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors duration-300" 
            onClick={() => addElement(DesignElementTypes.BLUR)}
          >
            <Circle className="w-3 h-3 lg:w-4 lg:h-4 text-gray-500 dark:text-gray-400" />
            Blur Block
          </Button>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={(e) => {
                try {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleImageUpload(file);
                  }
                } catch (error) {
                  console.error('Error handling file selection:', error);
                  toast.error('Fehler bei der Dateiauswahl');
                } finally {
                  // Always reset the input value to allow selecting the same file again
                  if (e.target) {
                    e.target.value = '';
                  }
                }
              }}
            />
            <Button 
              variant="outline" 
              size="sm"
              className="w-full justify-start gap-2 text-xs lg:text-sm border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors duration-300" 
              onClick={() => {
                try {
                  fileInputRef.current?.click();
                } catch (error) {
                  console.error('Error opening file dialog:', error);
                  toast.error('Fehler beim Öffnen der Dateiauswahl');
                }
              }}
            >
              <Image className="w-3 h-3 lg:w-4 lg:h-4 text-orange-500 dark:text-orange-400" />
              Bild hochladen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 