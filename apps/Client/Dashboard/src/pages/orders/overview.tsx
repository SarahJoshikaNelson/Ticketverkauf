import OrdersOverviewSearch, {
  SearchStatus,
  SortOption,
  GroupingState,
  DEFAULT_GROUPING,
} from "@/components/orders/overview/Search";
import ResultList from "@/components/orders/overview/ResultList";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrdersOverview() {
  const [offset, setOffset] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [status, setStatus] = useState<SearchStatus>("ALL");
  const [sort, setSort] = useState<SortOption>("DATE_DESC");
  const [grouping, setGrouping] = useState<GroupingState>(DEFAULT_GROUPING);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const offset = urlParams.get("offset");
    const searchTerm = urlParams.get("search");
    const status = urlParams.get("status") as SearchStatus;

    console.log(offset, searchTerm, status);

    if (offset) {
      setOffset(parseInt(offset));
    }

    if (searchTerm) {
      console.log("searchTerm", searchTerm);
      setSearchTerm(searchTerm);
    }

    if (status) {
      setStatus(status);
    }

    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-29 w-full" />
        <Skeleton className="h-29 w-full" />
        <Skeleton className="h-29 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pr-2 overflow-hidden min-w-0 max-w-200 mx-auto">
      <div className="flex gap-4 flex-1 items-center justify-center">
        <h1 className="text-2xl font-bold max-sm:hidden">
          Bestellungsübersicht
        </h1>
      </div>
      <OrdersOverviewSearch
        setSearchTerm={setSearchTerm}
        setStatus={setStatus}
        status={status}
        searchTerm={searchTerm}
        sort={sort}
        setSort={setSort}
        grouping={grouping}
        setGrouping={setGrouping}
      />
      <div className="flex flex-col gap-4 w-full min-w-0">
        <ResultList
          startOffset={offset}
          searchTerm={searchTerm}
          orderStatus={status}
          sort={sort}
          grouping={grouping}
        />
      </div>
    </div>
  );
}
