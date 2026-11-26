import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { ChevronsLeft, ChevronsRight } from "lucide-react";

function ResultListPagination({
  offset,
  setOffset,
  limit,
  searchTerm,
  orderStatus,
  className,
  totalCount,
}: {
  offset: number;
  setOffset: (offset: number) => void;
  limit: number;
  searchTerm: string;
  orderStatus: string;
  className?: string;
  totalCount: number;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  // Hide pagination entirely if everything fits on one page
  if (totalPages <= 1) {
    return null;
  }

  const buildUrl = (pageOffset: number) => {
    let url = `/orders/overview?offset=${pageOffset}&limit=${limit}`;
    if (searchTerm) {
      url += `&search=${searchTerm}`;
    }
    url += `&status=${orderStatus}`;
    return url;
  };

  const goTo = (page: number) => () => setOffset(page);

  // For 2-3 pages: just show page numbers, no extra controls
  if (totalPages <= 3) {
    return (
      <Pagination className={`${className} bg-gray-900 py-2`}>
        <PaginationContent>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                to={buildUrl(page)}
                onClick={goTo(page)}
                isActive={page === offset}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}
        </PaginationContent>
      </Pagination>
    );
  }

  // 4+ pages: full controls with ellipsis
  // Show a window of 3 pages centered on current page
  let windowStart = Math.max(1, offset - 1);
  let windowEnd = Math.min(totalPages, offset + 1);
  // Ensure we always show 3 pages if possible
  if (windowEnd - windowStart < 2) {
    if (windowStart === 1) {
      windowEnd = Math.min(totalPages, windowStart + 2);
    } else {
      windowStart = Math.max(1, windowEnd - 2);
    }
  }

  const showFirstPage = windowStart > 1;
  const showLastPage = windowEnd < totalPages;

  const pageNumbers: number[] = [];
  for (let i = windowStart; i <= windowEnd; i++) {
    pageNumbers.push(i);
  }

  return (
    <Pagination className={`${className} bg-gray-900 py-2`}>
      <PaginationContent>
        {showFirstPage && (
          <PaginationItem>
            <PaginationLink
              to={buildUrl(1)}
              onClick={goTo(1)}
              aria-label="Erste Seite"
              size="icon"
            >
              <ChevronsLeft className="size-4" />
            </PaginationLink>
          </PaginationItem>
        )}
        {showFirstPage && (
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        )}
        {pageNumbers.map((page) => (
          <PaginationItem key={page}>
            <PaginationLink
              to={buildUrl(page)}
              onClick={goTo(page)}
              isActive={page === offset}
            >
              {page}
            </PaginationLink>
          </PaginationItem>
        ))}
        {showLastPage && (
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        )}
        {showLastPage && (
          <PaginationItem>
            <PaginationLink
              to={buildUrl(totalPages)}
              onClick={goTo(totalPages)}
              aria-label="Letzte Seite"
              size="icon"
            >
              <ChevronsRight className="size-4" />
            </PaginationLink>
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  );
}

export default ResultListPagination;
