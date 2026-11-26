import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Database,
  Trash2,
  Settings,
  Palette,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useTicketDesigner } from "./TicketDesignerContext";
import {
  DesignElement,
  DesignElementTypes,
  DesignElementFillers,
} from "@/hooks/useDesigns";
import { getContrastingColor } from "@/utils/qrCodeColors";

export const ElementPropertiesPanel: React.FC = () => {
  const {
    selectedElement,
    updateElement,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    getCurrentElements,
  } = useTicketDesigner();

  if (!selectedElement) {
    return (
      <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm transition-colors duration-300">
        <CardHeader className="pb-3 lg:pb-4">
          <CardTitle className="flex items-center gap-2 text-base lg:text-lg text-gray-900 dark:text-gray-100">
            <Settings className="w-4 h-4 lg:w-5 lg:h-5 text-gray-500 dark:text-gray-400" />
            Eigenschaften
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400 text-center py-6 lg:py-8">
            Wählen Sie ein Element aus, um seine Eigenschaften zu bearbeiten
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleUpdate = (field: string, value: any) => {
    // Only update content when the field is 'filler' (for FIELD elements)
    // For all other fields (fontSize, color, x, y, width, height, etc.), just update the field directly
    if (field === "filler") {
      let content = "";
      switch (value) {
        case DesignElementFillers.CODE:
          content = "292dac65-f236-4a6c-8074-2d996efcca60";
          break;
        case DesignElementFillers.DATE:
          content = new Date().toLocaleDateString("de-DE");
          break;
        case DesignElementFillers.TIME:
          content = new Date().toLocaleTimeString("de-DE");
          break;
        case DesignElementFillers.NAME:
          content = "Max Mustermann";
          break;
        case DesignElementFillers.ORDERNUMBER:
          content = "12345";
          break;
        default:
          content = selectedElement.content || "";
          break;
      }
      updateElement(selectedElement.id, { [field]: value, content: content });
    } else {
      // For all other fields, just update the field without touching content
      updateElement(selectedElement.id, { [field]: value });
    }
  };

  const handleLayerAction = (action: string) => {
    switch (action) {
      case "front":
        bringToFront(selectedElement.id);
        break;
      case "back":
        sendToBack(selectedElement.id);
        break;
      case "forward":
        bringForward(selectedElement.id);
        break;
      case "backward":
        sendBackward(selectedElement.id);
        break;
    }
  };

  // Calculate layer position
  const sortedElements = getCurrentElements().sort(
    (a, b) => (a.zIndex || 0) - (b.zIndex || 0)
  );
  const layerPosition =
    sortedElements.findIndex((el) => el.id === selectedElement.id) + 1;

  return (
    <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm transition-colors duration-300">
      <CardHeader className="pb-3 lg:pb-4">
        <CardTitle className="flex items-center gap-2 text-base lg:text-lg text-gray-900 dark:text-gray-100">
          <Settings className="w-4 h-4 lg:w-5 lg:h-5 text-blue-500 dark:text-blue-400" />
          Element bearbeiten
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 lg:space-y-6">
        {/* Element Info */}
        <div>
          <Label className="text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300">
            Element Typ
          </Label>
          <div className="mt-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-md text-xs lg:text-sm text-gray-700 dark:text-gray-300 border dark:border-gray-700">
            {selectedElement.type === DesignElementTypes.QR && "QR Code"}
            {selectedElement.type === DesignElementTypes.TEXT && "Text"}
            {selectedElement.type === DesignElementTypes.IMAGE && "Bild"}
            {selectedElement.type === DesignElementTypes.FIELD && "Datenfeld"}
            {selectedElement.type === DesignElementTypes.BLUR && "Blur Block"}
          </div>
        </div>

        {/* Filler Selection for FIELD elements */}
        {selectedElement.type === DesignElementTypes.FIELD && (
          <div>
            <Label className="text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300">
              Datenfeld Typ
            </Label>
            <Select
              value={selectedElement.filler}
              onValueChange={(value) =>
                handleUpdate("filler", value as DesignElementFillers)
              }
            >
              <SelectTrigger className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DesignElementFillers.CODE}>Code</SelectItem>
                <SelectItem value={DesignElementFillers.DATE}>Datum</SelectItem>
                <SelectItem value={DesignElementFillers.TIME}>Zeit</SelectItem>
                <SelectItem value={DesignElementFillers.NAME}>Name</SelectItem>
                <SelectItem value={DesignElementFillers.ORDERNUMBER}>
                  Bestellnummer
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Layering Controls */}
        <div>
          <Label className="text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Ebene ({layerPosition} von {sortedElements.length})
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleLayerAction("front")}
              className="flex items-center gap-1 text-xs border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <ArrowUp className="w-3 h-3" />
              Vorne
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleLayerAction("back")}
              className="flex items-center gap-1 text-xs border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <ArrowDown className="w-3 h-3" />
              Hinten
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleLayerAction("forward")}
              className="flex items-center gap-1 text-xs border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <ChevronUp className="w-3 h-3" />
              Hoch
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleLayerAction("backward")}
              className="flex items-center gap-1 text-xs border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <ChevronDown className="w-3 h-3" />
              Runter
            </Button>
          </div>
        </div>

        {/* Content for text and field elements */}
        {(selectedElement.type === DesignElementTypes.TEXT ||
          selectedElement.type === DesignElementTypes.FIELD) && (
          <div>
            <Label
              htmlFor="content"
              className="text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Inhalt
            </Label>
            <Input
              id="content"
              value={selectedElement.content || ""}
              onChange={(e) => handleUpdate("content", e.target.value)}
              placeholder={
                selectedElement.type === DesignElementTypes.FIELD
                  ? "Feldname eingeben"
                  : "Text eingeben"
              }
              className="mt-1 text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
              disabled={selectedElement.type === DesignElementTypes.FIELD}
            />
          </div>
        )}

        {/* QR Code content */}
        {selectedElement.type === DesignElementTypes.QR && (
          <>
            <div>
              <Label
                htmlFor="qr-content"
                className="text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                QR Code Inhalt
              </Label>
              <Input
                id="qr-content"
                value={selectedElement.content || ""}
                onChange={(e) => handleUpdate("content", e.target.value)}
                placeholder="QR Code Inhalt"
                className="mt-1 text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
              />
            </div>

            <div>
              <Label
                htmlFor="qr-background-color"
                className="text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Hintergrundfarbe
              </Label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  id="qr-background-color"
                  type="color"
                  value={selectedElement.backgroundColor || "#ffffff"}
                  onChange={(e) => {
                    const bgColor = e.target.value;
                    handleUpdate("backgroundColor", bgColor);
                    // Automatically set contrasting foreground color
                    const fgColor = getContrastingColor(bgColor);
                    handleUpdate("color", fgColor);
                  }}
                  className="w-10 h-8 lg:w-12 lg:h-8 p-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                />
                <Input
                  value={selectedElement.backgroundColor || "#ffffff"}
                  onChange={(e) => {
                    const bgColor = e.target.value;
                    handleUpdate("backgroundColor", bgColor);
                    // Automatically set contrasting foreground color
                    const fgColor = getContrastingColor(bgColor);
                    handleUpdate("color", fgColor);
                  }}
                  className="flex-1 text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Vordergrundfarbe wird automatisch berechnet für optimale
                Lesbarkeit
              </p>
            </div>

            <div>
              <Label className="text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300">
                Automatische Vordergrundfarbe
              </Label>
              <div className="mt-1 flex items-center gap-2">
                <div
                  className="w-10 h-8 lg:w-12 lg:h-8 rounded border border-gray-300 dark:border-gray-600"
                  style={{
                    backgroundColor: getContrastingColor(
                      selectedElement.backgroundColor || "#ffffff"
                    ),
                  }}
                />
                <Input
                  value={getContrastingColor(
                    selectedElement.backgroundColor || "#ffffff"
                  )}
                  readOnly
                  className="flex-1 text-sm bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                />
              </div>
            </div>
          </>
        )}

        {/* Position */}
        <div className="grid grid-cols-2 gap-2 lg:gap-3">
          <div>
            <Label
              htmlFor="x-pos"
              className="text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              X Position
            </Label>
            <Input
              id="x-pos"
              type="number"
              value={selectedElement.x}
              onChange={(e) => handleUpdate("x", parseInt(e.target.value) || 0)}
              className="mt-1 text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <Label
              htmlFor="y-pos"
              className="text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Y Position
            </Label>
            <Input
              id="y-pos"
              type="number"
              value={selectedElement.y}
              onChange={(e) => handleUpdate("y", parseInt(e.target.value) || 0)}
              className="mt-1 text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        {/* Size */}
        <div className="grid grid-cols-2 gap-2 lg:gap-3">
          <div>
            <Label
              htmlFor="width"
              className="text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Breite
            </Label>
            <Input
              id="width"
              type="number"
              value={selectedElement.width}
              onChange={(e) =>
                handleUpdate("width", parseInt(e.target.value) || 0)
              }
              className="mt-1 text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <Label
              htmlFor="height"
              className="text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Höhe
            </Label>
            <Input
              id="height"
              type="number"
              value={selectedElement.height}
              onChange={(e) =>
                handleUpdate("height", parseInt(e.target.value) || 0)
              }
              className="mt-1 text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        {/* Text Properties */}
        {(selectedElement.type === DesignElementTypes.TEXT ||
          selectedElement.type === DesignElementTypes.FIELD) && (
          <>
            <div>
              <Label className="text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300">
                Schriftgröße: {selectedElement.fontSize || 12}px
              </Label>
              <Slider
                value={[selectedElement.fontSize || 12]}
                onValueChange={(value) => handleUpdate("fontSize", value[0])}
                max={48}
                min={8}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300">
                Schriftstärke
              </Label>
              <Select
                value={selectedElement.fontWeight || "normal"}
                onValueChange={(value) => handleUpdate("fontWeight", value)}
              >
                <SelectTrigger className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="bold">Fett</SelectItem>
                  <SelectItem value="100">Dünn (100)</SelectItem>
                  <SelectItem value="200">Extra Leicht (200)</SelectItem>
                  <SelectItem value="300">Leicht (300)</SelectItem>
                  <SelectItem value="400">Normal (400)</SelectItem>
                  <SelectItem value="500">Mittel (500)</SelectItem>
                  <SelectItem value="600">Halbfett (600)</SelectItem>
                  <SelectItem value="700">Fett (700)</SelectItem>
                  <SelectItem value="800">Extra Fett (800)</SelectItem>
                  <SelectItem value="900">Schwarz (900)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label
                htmlFor="color"
                className="text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Textfarbe
              </Label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  id="color"
                  type="color"
                  value={selectedElement.color || "#000000"}
                  onChange={(e) => handleUpdate("color", e.target.value)}
                  className="w-10 h-8 lg:w-12 lg:h-8 p-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                />
                <Input
                  value={selectedElement.color || "#000000"}
                  onChange={(e) => handleUpdate("color", e.target.value)}
                  className="flex-1 text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </>
        )}

        {/* Blur Properties */}
        {selectedElement.type === DesignElementTypes.BLUR && (
          <>
            <div>
              <Label
                htmlFor="blur-color"
                className="text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Hintergrundfarbe
              </Label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  id="blur-color"
                  type="color"
                  value={selectedElement.backgroundColor || "#ffffff"}
                  onChange={(e) =>
                    handleUpdate("backgroundColor", e.target.value)
                  }
                  className="w-10 h-8 lg:w-12 lg:h-8 p-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                />
                <Input
                  value={selectedElement.backgroundColor || "#ffffff"}
                  onChange={(e) =>
                    handleUpdate("backgroundColor", e.target.value)
                  }
                  className="flex-1 text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300">
                Deckkraft: {selectedElement.opacity || 50}%
              </Label>
              <Slider
                value={[selectedElement.opacity || 50]}
                onValueChange={(value) => handleUpdate("opacity", value[0])}
                max={100}
                min={0}
                step={5}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300">
                Unschärfe: {selectedElement.blurIntensity ?? 8}px
              </Label>
              <Slider
                value={[selectedElement.blurIntensity ?? 8]}
                onValueChange={(value) =>
                  handleUpdate("blurIntensity", value[0])
                }
                max={20}
                min={0}
                step={1}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                0px = Solider Block, &gt;0px = Unschärfe-Effekt
              </p>
            </div>

            <div>
              <Label className="text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300">
                Eckenradius: {selectedElement.borderRadius || 0}px
              </Label>
              <Slider
                value={[selectedElement.borderRadius || 0]}
                onValueChange={(value) =>
                  handleUpdate("borderRadius", value[0])
                }
                max={50}
                min={0}
                step={1}
                className="mt-2"
              />
            </div>
          </>
        )}

        {/* Visibility */}
        <div className="flex items-center justify-between">
          <Label className="text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300">
            Sichtbar
          </Label>
          <Switch
            checked={selectedElement.visible !== false}
            onCheckedChange={(checked) => handleUpdate("visible", checked)}
          />
        </div>

        <Separator className="border-gray-200 dark:border-gray-700" />

        {/* Element ID */}
        <div>
          <Label className="text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300">
            Element ID
          </Label>
          <Badge
            variant="outline"
            className="mt-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 font-mono"
          >
            {selectedElement.id}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
