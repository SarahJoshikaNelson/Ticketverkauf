import Result from "./Result";
import { useEffect, useState } from "react";
import { Order } from "@ticket-system/models";
import { getFetchUrl } from "@/utils/getFetchUrl";
import authFetch from "@/utils/authfetch";
import { useKeycloak } from "@react-keycloak/web";
import ResultListPagination from "./ResultListPagination";
import { useQuery } from "@tanstack/react-query";
import { SearchStatus } from "./Search";
import { SortOption, parseSortOption, GroupingState } from "./Search";

type OrderGroup = {
  groupKey: string;
  groupLabel: string;
  orders: Order[];
};

type GroupedResponse = {
  groups: OrderGroup[];
  totalCount: number;
};

type PaginatedResponse = {
  orders: Order[];
  totalCount: number;
};

type ResultListProps = {
  startOffset: number;
  searchTerm: string;
  orderStatus: SearchStatus;
  sort?: SortOption;
  grouping?: GroupingState;
  onOrderSelect?: (order: Order) => void;
  selectedOrder?: Order | null;
  filterSeatsOnly?: boolean;
};

const limit = 10;

export default function ResultList({
  startOffset,
  searchTerm,
  orderStatus,
  sort,
  grouping,
  onOrderSelect,
  selectedOrder,
  filterSeatsOnly,
}: ResultListProps) {
  const [offset, setOffset] = useState<number>(startOffset);
  const { keycloak } = useKeycloak();
  const isGrouped = grouping && grouping.groupBy !== "NONE";

  const {
    data: result,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["orders", offset, searchTerm, orderStatus, sort, grouping],
    queryFn: async () => {
      let url = `api/v2/admin/getOrderOverview?offset=${
        offset - 1
      }&limit=${limit}`;

      if (searchTerm) {
        url += `&term=${encodeURIComponent(btoa(searchTerm.trim()))}`;
      }
      if (orderStatus !== "ALL") {
        url += `&status=${orderStatus}`;
      }
      if (sort) {
        const { sortBy, sortDirection } = parseSortOption(sort);
        url += `&sortBy=${sortBy}&sortDirection=${sortDirection}`;
      }
      if (grouping && grouping.groupBy !== "NONE") {
        url += `&groupBy=${grouping.groupBy}`;
        if (grouping.groupBy === "PRICE") {
          url += `&priceChunkSize=${grouping.priceChunkSize}`;
        }
        if (grouping.groupSortDirection) {
          url += `&groupSortDirection=${grouping.groupSortDirection}`;
        }
      }
      const res = await authFetch(getFetchUrl(url), keycloak.token, {
        method: "GET",
      });

      if (res.status === 200) {
        const data = await res.json();
        if (isGrouped) {
          return { type: "grouped" as const, data: data as GroupedResponse };
        }
        return { type: "flat" as const, data: data as PaginatedResponse };
      }

      console.error(res.status);
      console.error(res.statusText);
      console.error(await res.text());
    },
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (searchTerm === "") {
      urlParams.delete("search");
    } else {
      urlParams.set("search", searchTerm);
    }
    urlParams.set("offset", offset.toString());
    urlParams.set("status", orderStatus);
    window.history.pushState(
      {},
      "",
      window.location.pathname + "?" + urlParams.toString(),
    );
  }, [keycloak.token, offset, searchTerm, orderStatus]);

  if (isLoading || result === undefined) {
    return <div className="flex flex-col gap-4  animate-pulse" />;
  }

  if (error) {
    return <div>Fehler beim Laden der Bestellungen.</div>;
  }

  if (result.type === "grouped") {
    const grouped = result.data;
    const allEmpty = grouped.groups.every((g) => g.orders.length === 0);

    return (
      <div className="flex flex-col gap-6">
        {allEmpty && (
          <div className="text-gray-300 italic">
            Keine Bestellungen gefunden.
          </div>
        )}
        {grouped.groups.map((group) => {
          const orders = filterSeatsOnly
            ? group.orders.filter((o) => o.order.seats.length > 0)
            : group.orders;
          if (orders.length === 0) return null;

          return (
            <div key={group.groupKey} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-muted-foreground">
                  {group.groupLabel}
                </h2>
                <span className="text-sm text-muted-foreground/60">
                  ({orders.length})
                </span>
              </div>
              <div className="flex flex-col gap-3 pl-2 border-l-2 border-muted">
                {orders.map((order) => (
                  <Result
                    key={order.id}
                    order={order}
                    onSelect={onOrderSelect}
                    isSelected={selectedOrder?.id === order.id}
                  />
                ))}
              </div>
            </div>
          );
        })}
        <div className="min-h-20 w-full" />
        <ResultListPagination
          offset={offset}
          setOffset={setOffset}
          limit={limit}
          searchTerm={searchTerm}
          orderStatus={orderStatus}
          totalCount={grouped.totalCount}
          className="max-sm:fixed max-sm:bottom-10 max-sm:left-0 max-sm:right-0"
        />
      </div>
    );
  }

  // Flat (ungrouped) display
  const orders = result.data.orders;
  const filteredOrders = filterSeatsOnly
    ? orders.filter((order) => order.order.seats.length > 0)
    : orders;

  return (
    <div className="flex flex-col gap-4">
      {filteredOrders.length === 0 && (
        <div className="text-gray-300 italic">Keine Bestellungen gefunden.</div>
      )}
      {filteredOrders.map((order) => (
        <Result
          key={order.id}
          order={order}
          onSelect={onOrderSelect}
          isSelected={selectedOrder?.id === order.id}
        />
      ))}
      <div className="min-h-20 w-full" />
      <ResultListPagination
        offset={offset}
        setOffset={setOffset}
        limit={limit}
        searchTerm={searchTerm}
        orderStatus={orderStatus}
        totalCount={result.data.totalCount}
        className="max-sm:fixed max-sm:bottom-10 max-sm:left-0 max-sm:right-0"
      />
    </div>
  );
}
