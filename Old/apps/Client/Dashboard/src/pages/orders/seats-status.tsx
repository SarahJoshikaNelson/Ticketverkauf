import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import authFetch from "@/utils/authfetch";
import { useKeycloak } from "@react-keycloak/web";
import { getFetchUrl } from "@/utils/getFetchUrl";
import { Order, Layer, Room, Seat } from "@ticket-system/models/order";
import VisualLayout from "@/components/orders/visual-layout/VisualLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/utils";

function SeatsStatus() {
  const { keycloak } = useKeycloak();
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayerName, setSelectedLayerName] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderIdParam = urlParams.get("orderId");

    const fetchData = async () => {
      if (keycloak.token) {
        try {
          // Fetch layers and all orders in parallel
          const [layersResponse, ordersResponse] = await Promise.all([
            authFetch(getFetchUrl("api/v2/admin/layer/"), keycloak.token, {}, "GET"),
            authFetch(getFetchUrl("api/v2/admin/getAllOrders"), keycloak.token, {}, "GET")
          ]);

          if (layersResponse.ok) {
            const layersText = await layersResponse.text();
            if (layersText.trim()) {
              const layersData = JSON.parse(layersText);
              setLayers(layersData);
              if (layersData.length > 0) {
                setSelectedLayerName(layersData[0].name);
              }
            }
          } else {
            console.error("Layers response not ok:", layersResponse.status);
          }

          let fetchedOrders: Order[] = [];
          if (ordersResponse.ok) {
            fetchedOrders = await ordersResponse.json();
            setAllOrders(fetchedOrders);
          } else {
            console.error("Orders response not ok:", ordersResponse.status);
          }

          // If orderId is provided, select that specific order from the fetched list
          if (orderIdParam) {
            const foundOrder = fetchedOrders.find(o => o.id === orderIdParam);
            if (foundOrder) {
              setSelectedOrder(foundOrder);
            }
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchData();
  }, [keycloak.token]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const handleSeatClick = (seat: Seat) => {
    // Synchronously find the order containing the clicked seat
    const findingOrder = allOrders.find(o =>
      o.order.seats.some(s => s.id === seat.id)
    );

    if (findingOrder) {
      setSelectedOrder(findingOrder);
    } else {
      console.log("No order found for this seat");
      // Optional: Clear selection if empty seat is clicked
      // setSelectedOrder(null); 
    }
  };

  const selectedOrderSeats = selectedOrder ? selectedOrder.order.seats : [];
  const selectedLayer = layers.find(
    (layer) => layer.name === selectedLayerName
  );
  const selectedLayerRooms = selectedLayer ? selectedLayer.rooms : [];

  return (
    <div>
      <div className="flex flex-col gap-4 p-4 max-w-300 mx-auto">
        <h1 className="text-2xl font-bold">Status der Sitze</h1>

        {/* Layer Selection */}
        {layers.length > 0 && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center gap-4">
              <Label htmlFor="layer-select">Select Layer:</Label>
              <Select
                value={selectedLayerName}
                onValueChange={setSelectedLayerName}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select a layer" />
                </SelectTrigger>
                <SelectContent>
                  {layers.map((layer) => (
                    <SelectItem key={layer.name} value={layer.name}>
                      {layer.name} (Level {layer.level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Visual Layout */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Tisch & Sitz Anordnung</h3>
          {selectedLayerRooms.length > 0 ? (
            <div className="overflow-auto">
              <VisualLayout
                rooms={selectedLayerRooms}
                selectedOrderSeats={selectedOrderSeats}
                onSeatClick={handleSeatClick}
                width={800}
                height={600}
                backgroundImage={selectedLayer?.picture}
              />
            </div>
          ) : (
            <div className="flex justify-center items-center h-96 bg-gray-100 dark:bg-gray-700 rounded">
              <div className="text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-2">
                  Keine Raum-Daten verfügbar
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Das visuelle Layout erscheint, wenn Raum- und Tischdaten
                  konfiguriert sind.
                </p>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: "#ef4444" }}
              ></div>
              <span>Nicht verkauft bis jetzt</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: "#57dcff" }}
              ></div>
              <span>Sitzplätze gekauft (siehe Bestellung)</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: "#30b34a" }}
              ></div>
              <span>Aktuell ausgewählte Bestellung</span>
            </div>
          </div>

          {selectedOrder && (
            <div className="mt-4 p-4 border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/30 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-lg text-blue-900 dark:text-blue-100">
                  Bestellung #{selectedOrder.id}
                </h4>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${selectedOrder.order.status === 'PAID' ? 'bg-green-100 text-green-800' :
                  selectedOrder.order.status === 'WAITING' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                  {selectedOrder.order.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div>
                  <h5 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Kundeninformationen</h5>
                  <p className="text-sm">{selectedOrder.customer.firstName} {selectedOrder.customer.lastName}</p>
                  {selectedOrder.customer.mailAddress && <p className="text-sm text-gray-600 dark:text-gray-300">{selectedOrder.customer.mailAddress}</p>}
                  {selectedOrder.customer.phoneNumber && <p className="text-sm text-gray-600 dark:text-gray-300">{selectedOrder.customer.phoneNumber}</p>}
                  {selectedOrder.customer.schoolClass && <p className="text-sm text-gray-600 dark:text-gray-300">Klasse: {selectedOrder.customer.schoolClass}</p>}
                </div>

                <div>
                  <h5 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Bestelldetails</h5>
                  <p className="text-sm">Datum: {new Date(selectedOrder.order.orderDate).toLocaleDateString()}</p>
                  <p className="text-sm">Sitzplätze: {selectedOrder.order.seats.length}</p>
                  <p className="text-sm font-medium mt-1">
                    Gesamtpreis: {formatPrice(
                      selectedOrder.order.seats.reduce((acc, seat) => acc + seat.price, 0) +
                      selectedOrder.order.tickets.reduce((acc, ticket) => acc + ticket.price, 0)
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SeatsStatus;
