import React from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Save, FilePlus } from "lucide-react";
import { toast } from "sonner";
import { useTicketDesigner } from "./TicketDesignerContext";
import { useDesigns, PageType } from "@/hooks/useDesigns";

interface TicketDesignerHeaderProps {
  designName: string;
  onClearCanvas: () => void;
}

export const TicketDesignerHeader: React.FC<TicketDesignerHeaderProps> = ({
  designName,
  onClearCanvas,
}) => {
  const { design, isLoading, setIsLoading, currentDesignId, setCurrentDesignId } = useTicketDesigner();

  const { pushDesign, updateDesign, loadDesigns } = useDesigns();

  const saveDesign = async (saveAs: boolean = false) => {
    if (!designName.trim()) {
      toast.error("Bitte geben Sie einen Namen für das Design ein");
      return;
    }

    const frontElements = design.frontPage.elements;
    const backElements = design.backPage.elements;

    if (frontElements.length === 0 && backElements.length === 0) {
      toast.error(
        "Das Design muss mindestens ein Element auf der Vorder- oder Rückseite enthalten"
      );
      return;
    }

    const designToSave = {
      name: designName,
      width: 400,
      height: 600,
      frontPage: {
        type: PageType.FRONT,
        elements: frontElements,
      },
      backPage: {
        type: PageType.BACK,
        elements: backElements,
      },
    };

    console.log("Saving design with data:", designToSave);
    console.log("Front elements:", frontElements.length, frontElements);
    console.log("Back elements:", backElements.length, backElements);

    setIsLoading(true);
    try {
      let result;
      
      // If we have a current design ID and not forcing save as, update existing
      if (currentDesignId && !saveAs) {
        result = await updateDesign(currentDesignId, designToSave);
        
        if (result?.success) {
          await loadDesigns();
          toast.success("Design erfolgreich aktualisiert!");
        } else {
          console.error("Update failed with status:", result?.status);
          toast.error("Fehler beim Aktualisieren des Designs");
        }
      } else {
        // Otherwise create new design
        result = await pushDesign(designToSave);

        if (result?.success) {
          await loadDesigns();
          toast.success("Design erfolgreich gespeichert!");
          // Set the new design ID (we'd need to get it from the response)
          // For now, clear the current design ID so next save creates new
          setCurrentDesignId(null);
        } else {
          console.error("Save failed with status:", result?.status);
          toast.error("Fehler beim Speichern des Designs");
        }
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Fehler beim Speichern des Designs");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 lg:gap-4 mb-4 lg:mb-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100 transition-colors duration-300">
          Ticket Designer
        </h1>
        <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300">
          Erstellen Sie individuelle Ticket-Designs
        </p>
      </div>

      <div className="flex items-center gap-2 lg:gap-3 w-full max-lg:flex-col">
        <Button
          variant="outline"
          size="sm"
          onClick={onClearCanvas}
          className="flex-1 sm:flex-none text-xs lg:text-sm border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors duration-300"
        >
          <RotateCcw className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
          Zurücksetzen
        </Button>
        {currentDesignId && (
          <Button
            onClick={() => saveDesign(true)}
            disabled={isLoading || !designName.trim()}
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none text-xs lg:text-sm border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors duration-300"
          >
            <FilePlus className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
            Als neu speichern
          </Button>
        )}
        <Button
          onClick={() => saveDesign(false)}
          disabled={isLoading || !designName.trim()}
          size="sm"
          className="flex-1 sm:flex-none text-xs lg:text-sm bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
        >
          <Save className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
          {isLoading ? "Speichern..." : currentDesignId ? "Aktualisieren" : "Speichern"}
        </Button>
      </div>
    </div>
  );
};
