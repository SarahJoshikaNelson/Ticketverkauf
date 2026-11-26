import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import authFetch from "@/utils/authfetch";
import { useKeycloak } from "@react-keycloak/web";
import { getFetchUrl } from "@/utils/getFetchUrl";
import { Layer } from "@ticket-system/models/order";
import TableConfigurator from "@/components/settings/tables/TableConfigurator";
import { toast } from "sonner";

function Tables() {
  const { keycloak } = useKeycloak();
  const [layers, setLayers] = useState<Layer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      if (keycloak.token) {
        try {
          const layersResponse = await authFetch(
            getFetchUrl("api/v2/admin/layer/"),
            keycloak.token,
            {},
            "GET"
          );
          if (layersResponse.ok) {
            const layersText = await layersResponse.text();
            if (layersText.trim()) {
              const layersData = JSON.parse(layersText);
              setLayers(layersData);
            } else {
              setLayers([]);
            }
          } else {
            console.error(
              "Layers response not ok:",
              layersResponse.status,
              layersResponse.statusText
            );
            setLayers([]);
          }
        } catch (error) {
          console.error("Error fetching data:", error);
          setLayers([]);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchData();
  }, [keycloak.token]);

  const handleSave = async (updatedLayers: Layer[]) => {
    if (!keycloak.token) {
      toast.error("Nicht authentifiziert");
      return;
    }

    try {
      // Remove 'taken' field from seats, 'room' field from tables, and 'layer' field from rooms before sending to backend
      const cleanedLayers = updatedLayers.map((layer) => ({
        ...layer,
        rooms: layer.rooms?.map((room) => {
          const { layer: layerRef, ...roomWithoutLayer } = room as any;
          return {
            ...roomWithoutLayer,
            tables: room.tables?.map((table) => {
              const { room: roomRef, ...tableWithoutRoom } = table as any;
              return {
                ...tableWithoutRoom,
                seats: table.seats?.map((seat) => {
                  const { taken, ...seatWithoutTaken } = seat as any;
                  return seatWithoutTaken;
                }),
              };
            }),
          };
        }),
      }));

      // Log what we're sending to the backend
      console.log("Frontend sending layers count:", cleanedLayers.length);
      cleanedLayers.forEach((layer, index) => {
        console.log(`Layer ${index}: ${layer.name} (Level ${layer.level})`);
        console.log(`  Rooms: ${layer.rooms ? layer.rooms.length : "null"}`);
        if (layer.rooms && layer.rooms.length > 0) {
          layer.rooms.forEach((room, rIndex) => {
            console.log(`    Room ${rIndex}: ${room.name}`);
            console.log(
              `      Position: (${room.xposition}, ${room.yposition})`
            );
            console.log(`      Size: (${room.xlength}, ${room.ylength})`);
            console.log(
              `      Tables: ${room.tables ? room.tables.length : "null"}`
            );
            if (room.tables && room.tables.length > 0) {
              room.tables.forEach((table: any, tIndex: number) => {
                console.log(`        Table ${tIndex}: ${table.name}`);
                console.log(
                  `          Position: (${table.xposition}, ${table.yposition})`
                );
                console.log(
                  `          Size: (${table.xlength}, ${table.ylength})`
                );
                console.log(
                  `          Seats: ${
                    table.seats ? table.seats.length : "null"
                  }`
                );
              });
            }
          });
        }
      });
      console.log("Full JSON:", JSON.stringify(cleanedLayers, null, 2));

      // Save all layers with rooms, tables and seats in a single request
      const response = await authFetch(
        getFetchUrl("api/v2/admin/layers/"),
        keycloak.token,
        {
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(cleanedLayers),
        },
        "PUT"
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save configuration: ${errorText}`);
      }

      toast.success("Konfiguration erfolgreich gespeichert!");
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Fehler beim Speichern der Konfiguration"
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-200 mx-auto">
      <TableConfigurator
        layers={layers}
        onLayersChange={setLayers}
        onSave={handleSave}
      />
    </div>
  );
}

export default Tables;
