import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CircleHelp, ArrowUpDown, Layers } from "lucide-react";

const LABELED_STATUSES = [
  {
    label: "Alle",
    value: "ALL",
  },
  {
    label: "Aktiv",
    value: "ACTIVE",
  },
  {
    label: "Bestätigt",
    value: "CONFIRMED",
  },
  {
    label: "Unbestätigt",
    value: "WAITING",
  },
  {
    label: "Bezahlt",
    value: "PAID",
  },
  {
    label: "Abgeholt",
    value: "DONE",
  },
  {
    label: "Abgebrochen",
    value: "CANCELLED",
  },
] as const;
export const POSSIBLE_SEARCH_STATUSES = LABELED_STATUSES.map(
  (status) => status.value,
);
export type SearchStatus = (typeof POSSIBLE_SEARCH_STATUSES)[number];

const SORT_FIELDS = [
  { label: "Datum", value: "DATE" },
  { label: "Name", value: "USER_NAME" },
  { label: "Tickets", value: "TICKETS" },
  { label: "Preis", value: "PRICING" },
  { label: "Tische", value: "TABLES" },
] as const;
export type SortField = (typeof SORT_FIELDS)[number]["value"];

const SORT_DIRECTIONS = [
  { label: "Aufsteigend ↑", value: "ASC" },
  { label: "Absteigend ↓", value: "DESC" },
] as const;
export type SortDir = (typeof SORT_DIRECTIONS)[number]["value"];

export type SortOption = `${SortField}_${SortDir}`;

export function parseSortOption(sort: SortOption): {
  sortBy: string;
  sortDirection: string;
} {
  const lastUnderscore = sort.lastIndexOf("_");
  return {
    sortBy: sort.substring(0, lastUnderscore),
    sortDirection: sort.substring(lastUnderscore + 1),
  };
}

const GROUP_OPTIONS = [
  { label: "Keine", value: "NONE" },
  { label: "Person", value: "PERSON" },
  { label: "Status", value: "STATUS" },
  { label: "Preis", value: "PRICE" },
  { label: "Tag", value: "DAY" },
  { label: "Monat", value: "MONTH" },
  { label: "Jahr", value: "YEAR" },
] as const;
export type GroupByOption = (typeof GROUP_OPTIONS)[number]["value"];

export type GroupingState = {
  groupBy: GroupByOption;
  priceChunkSize: number;
  groupSortDirection?: SortDir;
};

export const DEFAULT_GROUPING: GroupingState = {
  groupBy: "NONE",
  priceChunkSize: 50,
};

export default function OrdersOverviewSearch({
  setSearchTerm,
  setStatus,
  status,
  searchTerm,
  sort,
  setSort,
  grouping,
  setGrouping,
}: {
  setSearchTerm: (search: string) => void;
  setStatus: (status: SearchStatus) => void;
  status: SearchStatus;
  searchTerm: string;
  sort: SortOption;
  setSort: (sort: SortOption) => void;
  grouping: GroupingState;
  setGrouping: (grouping: GroupingState) => void;
}) {
  return (
    <div className="flex items-center gap-2 w-full min-w-0">
      <Input
        type="text"
        placeholder="Name, E-Mail-Adresse, Order- oder Ticket-ID, Datum, Kontaktnummer"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="min-w-0 flex-1"
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <CircleHelp className="h-5 w-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-left text-wrap">
          <p className="font-semibold mb-1">Richtig Suchen:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Mit dem Namen:</strong> Vorname allein, Nachname allein
              oder
              {" „<"}Vorname{">"} {"<"}Nachname{">“"} (zuerst der Vorname)
            </li>
            <li>
              <strong>Mit der Order-ID:</strong> Finden Kunden oben rechts in
              der Bestellung. Für die volle ID muss man kurz über die ID-Anzeige
              hovern. Die ID kann mit oder ohne Raute am Anfang (#) eingegeben
              werden.
            </li>
            <li>
              <strong>Mit der ID eines Tickets in der Bestellung:</strong> Diese
              ist z. B. am Ticket drauf. Die ID kann mit oder ohne Raute am
              Anfang (#) eingegeben werden.
            </li>
            <li>
              <strong>Mit dem Datum:</strong> Format ist tt.mm.jjjj
            </li>
            <li>
              <strong>Mit der Nummer:</strong> Das ist die von den Kunden
              eingegebene Kontaktnummer bei der Bestellung. Sie hat den Format,
              den die die/der Kund*in verwendet hat (also nicht standardisiert).
            </li>
          </ul>
        </TooltipContent>
      </Tooltip>

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-auto shrink-0">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {LABELED_STATUSES.map((status) => (
            <SelectItem key={status.value} value={status.value}>
              {status.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <SortDropdown
        sort={sort}
        setSort={setSort}
        grouping={grouping}
        setGrouping={setGrouping}
      />

      <GroupDropdown grouping={grouping} setGrouping={setGrouping} />
    </div>
  );
}

function SortDropdown({
  sort,
  setSort,
  grouping,
  setGrouping,
}: {
  sort: SortOption;
  setSort: (sort: SortOption) => void;
  grouping: GroupingState;
  setGrouping: (grouping: GroupingState) => void;
}) {
  const { sortBy, sortDirection } = parseSortOption(sort);
  const currentFieldLabel =
    SORT_FIELDS.find((f) => f.value === sortBy)?.label ?? "Sortierung";
  const dirArrow = sortDirection === "DESC" ? "↓" : "↑";
  const isGrouped = grouping.groupBy !== "NONE";

  // Compute effective group sort direction (mirrors backend defaults)
  const effectiveGroupSortDir: SortDir =
    grouping.groupSortDirection ??
    (grouping.groupBy === "PERSON" ||
    grouping.groupBy === "PRICE" ||
    grouping.groupBy === "STATUS"
      ? "ASC"
      : "DESC");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="shrink-0 gap-1.5">
          <ArrowUpDown className="h-4 w-4" />
          {currentFieldLabel} {dirArrow}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {isGrouped && (
          <>
            <DropdownMenuLabel>Gruppenreihenfolge</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={effectiveGroupSortDir}
              onValueChange={(dir) =>
                setGrouping({
                  ...grouping,
                  groupSortDirection: dir as SortDir,
                })
              }
            >
              {SORT_DIRECTIONS.map((dir) => (
                <DropdownMenuRadioItem
                  key={dir.value}
                  value={dir.value}
                  onSelect={(e) => e.preventDefault()}
                >
                  {dir.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuLabel>
          {isGrouped ? "Einträge sortieren nach" : "Sortieren nach"}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={sortBy}
          onValueChange={(field) =>
            setSort(`${field as SortField}_${sortDirection as SortDir}`)
          }
        >
          {SORT_FIELDS.map((field) => (
            <DropdownMenuRadioItem
              key={field.value}
              value={field.value}
              onSelect={(e) => e.preventDefault()}
            >
              {field.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>
          {isGrouped ? "Eintragsreihenfolge" : "Reihenfolge"}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={sortDirection}
          onValueChange={(dir) =>
            setSort(`${sortBy as SortField}_${dir as SortDir}`)
          }
        >
          {SORT_DIRECTIONS.map((dir) => (
            <DropdownMenuRadioItem
              key={dir.value}
              value={dir.value}
              onSelect={(e) => e.preventDefault()}
            >
              {dir.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GroupDropdown({
  grouping,
  setGrouping,
}: {
  grouping: GroupingState;
  setGrouping: (grouping: GroupingState) => void;
}) {
  const currentLabel =
    GROUP_OPTIONS.find((o) => o.value === grouping.groupBy)?.label ??
    "Gruppierung";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="shrink-0 gap-1.5">
          <Layers className="h-4 w-4" />
          {grouping.groupBy !== "NONE" ? currentLabel : "Gruppieren"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Gruppieren nach</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={grouping.groupBy}
          onValueChange={(value) =>
            setGrouping({
              ...grouping,
              groupBy: value as GroupByOption,
              groupSortDirection: undefined,
            })
          }
        >
          {GROUP_OPTIONS.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              onSelect={(e) => e.preventDefault()}
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {grouping.groupBy === "PRICE" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>
              Preisgruppen: je € {grouping.priceChunkSize}
            </DropdownMenuLabel>
            <div
              className="px-3 py-2"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Slider
                min={10}
                max={200}
                step={10}
                value={[grouping.priceChunkSize]}
                onValueChange={([val]) =>
                  setGrouping({ ...grouping, priceChunkSize: val })
                }
              />
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
