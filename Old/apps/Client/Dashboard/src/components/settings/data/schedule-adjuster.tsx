import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import authFetch from "@/utils/authfetch";
import { useKeycloak } from "@react-keycloak/web";
import { getFetchUrl } from "@/utils/getFetchUrl";
import { PlusIcon, ArrowUp, ArrowDown } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

interface ScheduleEntry {
  id: number;
  title: string;
  start: string;
}

function ScheduleAdjuster() {
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { keycloak } = useKeycloak();
  const [newEntry, setNewEntry] = useState<Omit<ScheduleEntry, "id">>({
    title: "",
    start: "",
  });

  const formatDateToLocalDateTimeString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  useEffect(() => {
    setNewEntry((prev) => ({
      ...prev,
      start: formatDateToLocalDateTimeString(new Date()),
    }));
  }, []);

  const mergeTimeWithExistingDate = (
    currentDateString: string,
    time: string
  ) => {
    const [hours, minutes] = time.split(":");
    if (hours === undefined || minutes === undefined) {
      return currentDateString;
    }

    const fallbackDate = new Date();
    fallbackDate.setSeconds(0, 0);

    const baseDate = new Date(currentDateString);
    const dateToUse = Number.isNaN(baseDate.getTime())
      ? fallbackDate
      : baseDate;

    dateToUse.setHours(Number(hours), Number(minutes), 0, 0);
    dateToUse.setMilliseconds(0);
    return formatDateToLocalDateTimeString(dateToUse);
  };

  const toBackendIsoString = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return formatDateToLocalDateTimeString(date);
  };

  const prepareSchedulesForSubmit = (
    entries: Array<Pick<ScheduleEntry, "title" | "start">>
  ) =>
    entries.map((entry) => ({
      title: entry.title,
      start: toBackendIsoString(entry.start),
    }));

  const persistSchedules = async (
    entriesToPersist: ScheduleEntry[],
    messages: { success: string; error: string }
  ) => {
    try {
      setIsLoading(true);

      const payload = {
        schedules: prepareSchedulesForSubmit(
          entriesToPersist.map(({ title, start }) => ({
            title,
            start,
          }))
        ),
      };

      const response = await authFetch(
        getFetchUrl("api/v2/data/schedule"),
        keycloak.token,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
        "POST"
      );

      if (response.ok) {
        toast.success(messages.success);
        await fetchScheduleEntries();
        return true;
      }

      toast.error(messages.error);
      return false;
    } catch (error) {
      console.error("Error persisting schedule entries:", error);
      toast.error(messages.error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const normalizeFetchedStart = (value: string) => {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      date.setMilliseconds(0);
      return formatDateToLocalDateTimeString(date);
    }
    const timePattern = /^\d{2}:\d{2}$/;
    if (timePattern.test(value)) {
      return mergeTimeWithExistingDate(
        formatDateToLocalDateTimeString(new Date()),
        value
      );
    }
    return value;
  };

  const timeFromDateString = (value: string) => {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${hours}:${minutes}`;
    }
    const timePattern = /^\d{2}:\d{2}$/;
    if (timePattern.test(value)) {
      return value;
    }
    return "";
  };

  const fetchScheduleEntries = async () => {
    try {
      setIsLoading(true);
      const response = await authFetch(
        getFetchUrl("api/v2/data/schedule"),
        keycloak.token,
        {
          method: "GET",
        }
      );

      if (response.ok) {
        const data = (await response.json()) as ScheduleEntry[];
        setScheduleEntries(
          data.map((entry: ScheduleEntry) => ({
            ...entry,
            start: normalizeFetchedStart(entry.start),
          }))
        );
      } else {
        toast.error("Fehler beim Laden des Zeitplans");
      }
    } catch (error) {
      console.error("Error fetching schedule entries:", error);
      toast.error("Fehler beim Laden des Zeitplans");
    } finally {
      setIsLoading(false);
    }
  };

  const addEntry = async () => {
    try {
      setIsLoading(true);

      const entriesToPersist: ScheduleEntry[] = [
        ...scheduleEntries,
        {
          id: Date.now(),
          ...newEntry,
        },
      ];

      const success = await persistSchedules(entriesToPersist, {
        success: "Neuer Eintrag hinzugefügt",
        error: "Fehler beim Hinzufügen des Eintrags",
      });

      if (success) {
        setNewEntry({
          title: "",
          start: formatDateToLocalDateTimeString(new Date()),
        });
      }
    } catch (error) {
      console.error("Error adding entry:", error);
      toast.error("Fehler beim Hinzufügen des Eintrags");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEntry = async (id: number) => {
    try {
      setIsLoading(true);

      const filteredEntries = scheduleEntries.filter(
        (entry) => entry.id !== id
      );

      await persistSchedules(filteredEntries, {
        success: "Eintrag gelöscht",
        error: "Fehler beim Löschen des Eintrags",
      });
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast.error("Fehler beim Löschen des Eintrags");
    } finally {
      setIsLoading(false);
    }
  };

  const updateEntry = (
    id: number,
    field: keyof Omit<ScheduleEntry, "id">,
    value: string
  ) => {
    setScheduleEntries((prevEntries) =>
      prevEntries.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    );
  };

  const saveUpdatedEntry = async () => {
    await persistSchedules(scheduleEntries, {
      success: "Eintrag aktualisiert",
      error: "Fehler beim Aktualisieren des Eintrags",
    });
  };

  const moveEntry = async (id: number, direction: "up" | "down") => {
    if (isLoading) {
      return;
    }

    const index = scheduleEntries.findIndex((entry) => entry.id === id);
    if (index === -1) {
      return;
    }

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= scheduleEntries.length) {
      return;
    }

    const updatedEntries = [...scheduleEntries];
    const [movedEntry] = updatedEntries.splice(index, 1);
    updatedEntries.splice(swapIndex, 0, movedEntry);

    setScheduleEntries(updatedEntries);

    await persistSchedules(updatedEntries, {
      success: "Reihenfolge aktualisiert",
      error: "Fehler beim Aktualisieren des Eintrags",
    });
  };

  useEffect(() => {
    fetchScheduleEntries();
  }, [keycloak.token]);

  return (
    <div className="space-y-6 w-full overflow-hidden min-w-0">
      <Card>
        <CardHeader>
          <CardTitle>Neuen Zeitplan-Eintrag hinzufügen</CardTitle>
          <CardDescription>
            Füge einen neuen Eintrag zum Zeitplan hinzu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="new-title">Titel</Label>
              <Input
                id="new-title"
                className="min-w-0"
                value={newEntry.title}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, title: e.target.value })
                }
                placeholder="Titel des Ereignisses"
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="new-date">Zeit</Label>
              <Input
                id="new-date"
                className="min-w-0"
                type="time"
                value={timeFromDateString(newEntry.start)}
                onChange={(e) =>
                  setNewEntry((prev) => ({
                    ...prev,
                    start: mergeTimeWithExistingDate(
                      prev.start,
                      e.target.value
                    ),
                  }))
                }
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button
            onClick={addEntry}
            variant="outline"
            disabled={isLoading || !newEntry.title || !newEntry.start}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              "Wird hinzugefügt..."
            ) : (
              <>
                <PlusIcon className="h-4 w-4 mr-2" />
                Hinzufügen
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zeitplan-Einträge</CardTitle>
          <CardDescription>Verwalte bestehende Einträge</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="space-y-4 w-full">
              {scheduleEntries.length === 0 ? (
                <div className="text-center p-4 border rounded-lg">
                  Keine Einträge vorhanden
                </div>
              ) : (
                scheduleEntries.map((entry, index) => (
                  <Card
                    key={entry.id}
                    className="w-full min-w-0 relative overflow-hidden"
                  >
                    <div className="absolute top-2 right-3 text-xs text-gray-400">
                      ID: {entry.id}
                    </div>
                    <CardContent className="p-0 w-full">
                      <div className="px-4 m-0 flex flex-col gap-3 w-full min-w-0">
                        <div className="grid gap-3 md:grid-cols-2 w-full">
                          <div className="flex flex-col gap-2 w-full">
                            <Label className="mb-1">Titel</Label>
                            <Input
                              value={entry.title}
                              onChange={(e) =>
                                updateEntry(entry.id, "title", e.target.value)
                              }
                              onBlur={saveUpdatedEntry}
                              className="block w-full min-w-0"
                            />
                          </div>
                          <div className="flex flex-col gap-2 w-full">
                            <Label className="mb-1 md:mb-1">Zeit</Label>
                            <Input
                              type="time"
                              value={timeFromDateString(entry.start)}
                              onChange={(e) =>
                                updateEntry(
                                  entry.id,
                                  "start",
                                  mergeTimeWithExistingDate(
                                    entry.start,
                                    e.target.value
                                  )
                                )
                              }
                              onBlur={saveUpdatedEntry}
                              className="block w-full min-w-0"
                            />
                          </div>
                        </div>
                        <div className="flex justify-between gap-1 lg:gap-2 w-full">
                          <Button
                            variant="outline"
                            onClick={() => moveEntry(entry.id, "up")}
                            disabled={isLoading || index === 0}
                            className="flex-1 justify-center ring-1 ring-gray-500 text-gray-300! text-xs lg:text-sm px-2 lg:px-3 h-8 lg:h-10"
                          >
                            <ArrowUp className="h-3 w-3 lg:h-4 lg:w-4 lg:mr-2" />
                            <span className="hidden lg:inline">Nach oben</span>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => moveEntry(entry.id, "down")}
                            disabled={
                              isLoading || index === scheduleEntries.length - 1
                            }
                            className="flex-1 justify-center ring-1 ring-gray-500 text-gray-300! text-xs lg:text-sm px-2 lg:px-3 h-8 lg:h-10"
                          >
                            <ArrowDown className="h-3 w-3 lg:h-4 lg:w-4 lg:mr-2" />
                            <span className="hidden lg:inline">Nach unten</span>
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => deleteEntry(entry.id)}
                            disabled={isLoading}
                            className="justify-center px-2 lg:px-3 h-8 lg:h-10"
                          >
                            {isLoading ? (
                              <Spinner />
                            ) : (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                              >
                                <g fill="none" fillRule="evenodd">
                                  <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                                  <path
                                    fill="currentColor"
                                    d="M14.28 2a2 2 0 0 1 1.897 1.368L16.72 5H20a1 1 0 1 1 0 2l-.003.071l-.867 12.143A3 3 0 0 1 16.138 22H7.862a3 3 0 0 1-2.992-2.786L4.003 7.07L4 7a1 1 0 0 1 0-2h3.28l.543-1.632A2 2 0 0 1 9.721 2zM9 10a1 1 0 0 0-.993.883L8 11v6a1 1 0 0 0 1.993.117L10 17v-6a1 1 0 0 0-1-1m6 0a1 1 0 0 0-1 1v6a1 1 0 1 0 2 0v-6a1 1 0 0 0-1-1m-.72-6H9.72l-.333 1h5.226z"
                                  />
                                </g>
                              </svg>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ScheduleAdjuster;
