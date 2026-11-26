import { useState, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { getFetchUrl } from "@/utils/getFetchUrl";
import authFetch from "@/utils/authfetch";
import { useKeycloak } from "@react-keycloak/web";
import { Link } from "react-router-dom";
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Building2,
  User,
  CreditCard,
  Calendar,
  ArrowUpCircle,
  ArrowDownCircle,
  Banknote,
  XCircle,
  KeyRound,
} from "lucide-react";

interface Transaction {
  date: string;
  description: string;
  sender_last_name: string | null;
  debit: number | null;
  credit: number | null;
  balance: number;
  reference: string | null;
}

interface BankStatementData {
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  sort_code: string;
  statement_period: string;
  transactions: Transaction[];
}

interface MatchedOrder {
  lastName: string;
  amount: number;
  description: string;
  orderId: string;
  customerName: string;
}

interface FailedMatch {
  lastName: string;
  amount: number;
  description: string;
  error: string;
}

interface MatchResult {
  success: number;
  failed: number;
  matched: MatchedOrder[];
  notFound: FailedMatch[];
}

function BankProcessing() {
  const { keycloak } = useKeycloak();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BankStatementData | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set()
  );
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [ignoredFailures, setIgnoredFailures] = useState<Set<number>>(
    new Set()
  );
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  // Check if AI token exists on mount
  useEffect(() => {
    const checkTokenStatus = async () => {
      if (!keycloak.token) return;
      try {
        const response = await authFetch(
          getFetchUrl("/api/v2/bank/ai-token/status"),
          keycloak.token,
          {},
          "GET"
        );
        if (response.ok) {
          const data = await response.json();
          setHasToken(data.hasToken);
        }
      } catch {
        // Silently fail
      }
    };
    checkTokenStatus();
  }, [keycloak.token]);

  const processFile = useCallback(
    async (fileToProcess: File) => {
      if (hasToken === false) return;

      setIsProcessing(true);
      setError(null);
      setResult(null);
      setSelectedIndices(new Set());
      setMatchResult(null);

      const formData = new FormData();
      formData.append("file", fileToProcess);

      try {
        const response = await authFetch(
          getFetchUrl("/api/v2/bank/process"),
          keycloak.token,
          { body: formData },
          "POST"
        );

        if (response.ok) {
          const text = await response.text();
          try {
            const data = JSON.parse(text);
            setResult(data);
          } catch {
            setError(
              "Ungültige Antwort vom Server. Die KI konnte die Daten nicht extrahieren."
            );
          }
        } else {
          const errorData = await response.json();
          setError(
            errorData.error || "Fehler bei der Verarbeitung des Kontoauszugs."
          );
        }
      } catch {
        setError(
          "Netzwerkfehler. Bitte überprüfen Sie Ihre Verbindung und den AI Token."
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [keycloak.token, hasToken]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile?.type === "application/pdf") {
        setFile(droppedFile);
        setError(null);
        setResult(null);
        setMatchResult(null);
        processFile(droppedFile);
      } else {
        setError("Bitte laden Sie nur PDF-Dateien hoch.");
      }
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile?.type === "application/pdf") {
        setFile(selectedFile);
        setError(null);
        setResult(null);
        setMatchResult(null);
        processFile(selectedFile);
      } else if (selectedFile) {
        setError("Bitte laden Sie nur PDF-Dateien hoch.");
      }
    },
    [processFile]
  );

  const toggleSelection = (index: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIndices(newSelected);
  };

  const processAllCredits = async () => {
    if (!result) return;

    const creditTransactions = result.transactions
      .filter((tx) => tx.credit && tx.credit > 0 && tx.sender_last_name)
      .map((tx) => ({
        lastName: tx.sender_last_name || "",
        amount: tx.credit || 0,
        description: tx.description,
      }));

    if (creditTransactions.length === 0) {
      setError("Keine Einzahlungen mit erkennbarem Namen gefunden.");
      return;
    }

    setIsMarkingPaid(true);
    setMatchResult(null);
    setError(null);
    setSelectedIndices(new Set());

    try {
      const response = await authFetch(
        getFetchUrl("/api/v2/bank/match-and-pay"),
        keycloak.token,
        {
          body: JSON.stringify({ transactions: creditTransactions }),
          headers: { "Content-Type": "application/json" },
        },
        "POST"
      );

      if (response.ok) {
        const data: MatchResult = await response.json();
        setMatchResult(data);
        setIgnoredFailures(new Set());

        if (data.failed > 0) {
          setShowFailedModal(true);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Fehler beim Zuordnen der Bestellungen.");
      }
    } catch {
      setError("Netzwerkfehler beim Zuordnen der Bestellungen.");
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const ignoreFailure = (index: number) => {
    const newIgnored = new Set(ignoredFailures);
    newIgnored.add(index);
    setIgnoredFailures(newIgnored);

    // Auto-close modal if all failures are ignored
    const remainingFailures =
      (matchResult?.notFound.length || 0) - newIgnored.size;
    if (remainingFailures === 0) {
      setShowFailedModal(false);
    }
  };

  const handleMatchAndPay = async () => {
    if (selectedIndices.size === 0 || !result) return;

    setIsMarkingPaid(true);
    setMatchResult(null);
    setError(null);

    // Build the request with lastName + amount for each selected transaction
    const transactions = Array.from(selectedIndices).map((idx) => {
      const tx = result.transactions[idx];
      return {
        lastName: tx.sender_last_name || "",
        amount: tx.credit || 0,
        description: tx.description,
      };
    });

    try {
      const response = await authFetch(
        getFetchUrl("/api/v2/bank/match-and-pay"),
        keycloak.token,
        {
          body: JSON.stringify({ transactions }),
          headers: { "Content-Type": "application/json" },
        },
        "POST"
      );

      if (response.ok) {
        const data: MatchResult = await response.json();
        setMatchResult(data);
        setSelectedIndices(new Set());
        setIgnoredFailures(new Set());

        // Show modal if there are failed matches
        if (data.failed > 0) {
          setShowFailedModal(true);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Fehler beim Zuordnen der Bestellungen.");
      }
    } catch {
      setError("Netzwerkfehler beim Zuordnen der Bestellungen.");
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat("de-AT", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("de-AT");
    } catch {
      return dateStr;
    }
  };

  const canSelect = (tx: Transaction) => {
    return tx.credit && tx.credit > 0 && tx.sender_last_name;
  };

  return (
    <div className="flex flex-col gap-4 pr-2 max-w-200 mx-auto">
      <h1 className="text-2xl font-bold">Kontoauszug Verarbeitung</h1>

      {/* Privacy Notice */}
      <div className="flex items-start gap-3 p-4 text-sm bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800 rounded-lg">
        <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold mb-1">Kontoauszugsverarbeitung</p>
          <p>
            Aufgrund Datenschutzrichtlinien bis auf weiteres nicht verfügbar. Nach genauerer Recherche und Überarbeitung wird dieses Feature jedoch hoffentlich zurückkehren.
          </p>
        </div>
      </div>

      {/* No Token Warning */}
      {hasToken === false && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 opacity-60 pointer-events-none">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <KeyRound className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-amber-800 dark:text-amber-200">
                  Kein AI Token konfiguriert
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Um Kontoauszüge zu verarbeiten, müssen Sie zuerst einen
                  OpenRouter API Token hinterlegen.
                </p>
                <Link to="/settings/ai">
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                    disabled
                  >
                    <KeyRound className="h-4 w-4 mr-2" />
                    Zu den KI-Einstellungen
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Card */}
      <Card className="opacity-60 pointer-events-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            PDF Kontoauszug hochladen
          </CardTitle>
          <CardDescription>
            Transaktionen werden automatisch extrahiert. Bestellungen werden
            anhand von <strong>Nachname + Betrag</strong> zugeordnet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="border-2 border-dashed rounded-xl p-8 text-center transition-all border-muted-foreground/25 cursor-not-allowed"
          >
            <input
              id="file-upload"
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
              disabled
            />
            {isProcessing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <div>
                  <p className="font-medium text-primary">
                    Kontoauszug wird analysiert...
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {file?.name}
                  </p>
                </div>
              </div>
            ) : file ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
                <p className="font-medium text-green-700 dark:text-green-300">
                  {file.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB – Klicken für neue
                  Datei
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="font-medium">PDF hier ablegen oder klicken</p>
                <p className="text-sm text-muted-foreground">
                  Wird automatisch analysiert
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="opacity-60 pointer-events-none">
          {/* Primary Action Card */}
          {(() => {
            const allCredits =
              result.transactions?.filter((tx) => tx.credit && tx.credit > 0) ||
              [];
            const processableCredits = allCredits.filter(
              (tx) => tx.sender_last_name
            );
            const unprocessableCount =
              allCredits.length - processableCredits.length;

            return (
              <Card className="border-green-200 dark:border-green-800 bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
                        <Banknote className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-green-800 dark:text-green-200">
                          {processableCredits.length} von {allCredits.length}{" "}
                          Einzahlungen verarbeitbar
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          {unprocessableCount > 0
                            ? `${unprocessableCount} ohne erkannten Namen`
                            : "Alle Einzahlungen haben einen erkannten Namen"}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="lg"
                      onClick={processAllCredits}
                      disabled={
                        isMarkingPaid || processableCredits.length === 0
                      }
                      className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/25 min-w-[220px]"
                    >
                      {isMarkingPaid ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          Verarbeite...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-5 w-5 mr-2" />
                          {processableCredits.length} Einzahlungen verarbeiten
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Transactions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                Transaktionen ({result.transactions?.length || 0})
              </CardTitle>
              <CardDescription>
                Der <strong>Nachname</strong> wird aus der Beschreibung
                extrahiert. Sie können auch einzelne Transaktionen auswählen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Beschreibung</TableHead>
                      <TableHead>Erkannter Name</TableHead>
                      <TableHead className="text-right">Einzahlung</TableHead>
                      <TableHead className="text-right">Auszahlung</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.transactions?.map((tx, idx) => {
                      const isSelectable = canSelect(tx);
                      const isSelected = selectedIndices.has(idx);

                      return (
                        <TableRow
                          key={idx}
                          className={isSelected ? "bg-primary/5" : ""}
                        >
                          <TableCell>
                            {isSelectable && (
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelection(idx)}
                              />
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {formatDate(tx.date)}
                          </TableCell>
                          <TableCell
                            className="max-w-xs truncate text-sm"
                            title={tx.description}
                          >
                            {tx.description}
                          </TableCell>
                          <TableCell>
                            {tx.sender_last_name ? (
                              <Badge
                                variant="secondary"
                                className="font-medium"
                              >
                                {tx.sender_last_name}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {tx.credit && tx.credit > 0 ? (
                              <span className="flex items-center justify-end gap-1 text-green-600 dark:text-green-400 font-medium">
                                <ArrowDownCircle className="h-4 w-4" />
                                {formatCurrency(tx.credit)}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {tx.debit && tx.debit > 0 ? (
                              <span className="flex items-center justify-end gap-1 text-red-600 dark:text-red-400 font-medium">
                                <ArrowUpCircle className="h-4 w-4" />
                                {formatCurrency(tx.debit)}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>

            {selectedIndices.size > 0 && (
              <CardFooter className="flex flex-col gap-3 border-t pt-4">
                <div className="w-full p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                  <strong>{selectedIndices.size} Transaktion(en)</strong>{" "}
                  ausgewählt. Bestellungen werden anhand von Nachname + Betrag
                  gesucht.
                </div>
                <Button
                  onClick={handleMatchAndPay}
                  disabled={isMarkingPaid}
                  className="w-full"
                >
                  {isMarkingPaid ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Bestellungen werden gesucht...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {selectedIndices.size} Bestellung(en) zuordnen & als
                      bezahlt markieren
                    </>
                  )}
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* Success Message */}
          {matchResult && matchResult.success > 0 && (
            <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-200">
                      {matchResult.success} Bestellung(en) erfolgreich
                      zugeordnet!
                    </p>
                    <ul className="mt-2 text-sm text-green-700 dark:text-green-300 space-y-1">
                      {matchResult.matched.map((m, i) => (
                        <li key={i}>
                          ✓ {m.customerName} – {formatCurrency(m.amount)}
                        </li>
                      ))}
                    </ul>
                    {matchResult.failed > 0 && (
                      <Button
                        variant="link"
                        className="p-0 h-auto mt-2 text-amber-600 dark:text-amber-400"
                        onClick={() => setShowFailedModal(true)}
                      >
                        {matchResult.failed} nicht gefunden – Details anzeigen
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Failed Matches Modal */}
      <Dialog open={showFailedModal} onOpenChange={setShowFailedModal}>
        <DialogContent className="max-w-lg opacity-60 pointer-events-none">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-gray-900 dark:text-gray-100">
                Nicht gefundene Bestellungen
              </span>
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Die folgenden Transaktionen konnten keiner Bestellung zugeordnet
              werden. Sie können diese einzeln ignorieren.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto">
            {matchResult?.notFound.filter((_, i) => !ignoredFailures.has(i))
              .length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
                <p>Alle Einträge wurden bearbeitet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {matchResult?.notFound.map((f, i) => {
                  if (ignoredFailures.has(i)) return null;
                  return (
                    <div
                      key={i}
                      className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {f.lastName} – {formatCurrency(f.amount)}
                          </p>
                          <p
                            className="text-sm text-gray-600 dark:text-gray-400 truncate"
                            title={f.description}
                          >
                            {f.description}
                          </p>
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                            {f.error}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => ignoreFailure(i)}
                          className="shrink-0 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                        >
                          Ignorieren
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {matchResult?.notFound.filter((_, i) => !ignoredFailures.has(i))
              .length !== 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  const allIndices = new Set(
                    matchResult?.notFound.map((_, i) => i) || []
                  );
                  setIgnoredFailures(allIndices);
                }}
                className="text-gray-600 dark:text-gray-400"
              >
                Alle ignorieren
              </Button>
            )}
            <Button onClick={() => setShowFailedModal(false)}>Schließen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BankProcessing;
