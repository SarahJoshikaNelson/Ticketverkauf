import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Folder,
  Clock,
  Trash2,
  Download,
  Star,
  StarOff,
  Loader2,
} from "lucide-react";
import { useKeycloak } from "@react-keycloak/web";
import { toast } from "sonner";
import authFetch from "@/utils/authfetch";
import { getFetchUrl } from "@/utils/getFetchUrl";
import { useTicketDesigner } from "./TicketDesignerContext";
import { Design, useDesigns } from "@/hooks/useDesigns";
import { useDesign } from "@/hooks/useDesign";

interface SavedDesignsPanelProps {
  setDesignName: (name: string) => void;
}

export const SavedDesignsPanel: React.FC<SavedDesignsPanelProps> = ({
  setDesignName,
}) => {
  const { setSavedDesigns, setDesign, isLoading, setIsLoading, setCurrentDesignId } =
    useTicketDesigner();

  const { designs, loading, loadDesigns, setActiveDesign, deleteDesign } =
    useDesigns();

  const {
    design,
    loading: designLoading,
    loadDesign: loadDesign,
  } = useDesign();

  useEffect(() => {
    loadDesigns();
  }, []);

  useEffect(() => {
    if (design) {
      console.log("design", design);
      setDesign(design);
      setCurrentDesignId(design.id);
      setDesignName(design.name);
      toast.success(`Design "${design.name}" geladen`);
    }
  }, [design]);

  const deleteDesignHandler = async (designId: string) => {
    if (!confirm("Sind Sie sicher, dass Sie dieses Design löschen möchten?")) {
      return;
    }

    setIsLoading(true);
    try {
      deleteDesign(designId);
      toast.success("Design gelöscht!");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Fehler beim Löschen des Designs");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm transition-colors duration-300">
      <CardHeader className="pb-3 lg:pb-4">
        <CardTitle className="flex items-center gap-2 text-base lg:text-lg text-gray-900 dark:text-gray-100">
          <Folder className="w-4 h-4 lg:w-5 lg:h-5 text-orange-500 dark:text-orange-400" />
          Gespeicherte Designs
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-6">
        {designs.length === 0 ? (
          <div className="text-center py-6 lg:py-8">
            <Folder className="w-8 h-8 lg:w-12 lg:h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">
              Noch keine Designs gespeichert
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Erstellen Sie ein Design und speichern Sie es
            </p>
          </div>
        ) : !loading ? (
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-4 min-w-max">
              {[...designs]
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .map((design: any) => (
                <div
                  key={design.id}
                  className={`shrink-0 w-80 sm:w-96 border rounded-lg p-3 lg:p-4 bg-linear-to-br hover:shadow-md transition-all duration-300 group ${
                    design.active
                      ? "border-orange-300 dark:border-orange-600 from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20"
                      : "border-gray-200 dark:border-gray-700 from-white to-gray-50 dark:from-gray-800 dark:to-gray-900"
                  }`}
                >
                  <div className="flex flex-col gap-2 lg:gap-3 mb-2 lg:mb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm lg:text-base truncate">
                            {design.name || "Unbenanntes Design"}
                          </h4>
                          {design.active && (
                            <span title="Aktives Design">
                              <Star className="w-4 h-4 text-orange-500 dark:text-orange-400 fill-current" />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="w-3 h-3" />
                          {design.updatedAt && formatDate(design.updatedAt)}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-2">
                        {!design.active && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActiveDesign(design.id)}
                            disabled={isLoading}
                            className="h-7 w-7 lg:h-8 lg:w-8 p-0 border-gray-300 dark:border-gray-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-300 dark:hover:border-orange-600 transition-colors duration-300"
                            title="Als aktiv setzen"
                          >
                            <StarOff className="w-3 h-3 text-orange-500 dark:text-orange-400" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => loadDesign(design.id)}
                          disabled={isLoading}
                          className="h-7 w-7 lg:h-8 lg:w-8 p-0 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-300"
                          title="Design laden"
                        >
                          <Download className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteDesignHandler(design.id)}
                          disabled={isLoading}
                          className="h-7 w-7 lg:h-8 lg:w-8 p-0 border-gray-300 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-600 transition-colors duration-300"
                          title="Design löschen"
                        >
                          <Trash2 className="w-3 h-3 text-red-500 dark:text-red-400" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1 lg:gap-2">
                      {design.active && (
                        <Badge
                          variant="default"
                          className="text-xs px-1.5 py-0.5 bg-orange-500 dark:bg-orange-600 text-white"
                        >
                          Aktiv
                        </Badge>
                      )}
                      <Badge
                        variant="secondary"
                        className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      >
                        {(() => {
                          try {
                            if (design.elementsJson) {
                              const parsedData = JSON.parse(
                                design.elementsJson
                              );
                              return parsedData.frontPage?.length || 0;
                            }
                            return design.frontPage.elements?.length || 0;
                          } catch {
                            return 0;
                          }
                        })()}{" "}
                        Vorderseite
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                      >
                        {(() => {
                          try {
                            if (design.elementsJson) {
                              const parsedData = JSON.parse(
                                design.elementsJson
                              );
                              return parsedData.backPage?.length || 0;
                            }
                            return design.backPage.elements?.length || 0;
                          } catch {
                            return 0;
                          }
                        })()}{" "}
                        Rückseite
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 lg:py-8">
            <Loader2 className="w-8 h-8 lg:w-12 lg:h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3 animate-spin" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
