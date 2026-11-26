import { useLocation, useNavigate } from "react-router";
import PageLayout from "../components/PageLayout";
import IconCircle from "../components/IconCircle";
import CheckIcon from "../components/icons/CheckIcon";
import CrossIcon from "../components/icons/CrossIcon";
import WarningIcon from "../components/icons/WarningIcon";
import ErrorIcon from "../components/icons/ErrorIcon";
import { Button } from "../components/ui/button/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../components/ui/tooltip";

export type ActivationStatus =
  | "success"
  | "already-activated"
  | "not-found"
  | "error"
  | "invalid-code"
  | "ticket-order-cancelled"
  | "ticket-not-confirmed"
  | "ticket-not-paid";

export type ActivationResult = {
  status: ActivationStatus;
  errorMessage?: string;
  activatedAt?: string;
  customerName?: string;
  orderId?: string;
  orderDate?: string;
};

type LocationState = {
  result?: ActivationResult;
};

// SVG Icons for buttons
const HomeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const ScanIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
    <rect width="7" height="5" x="7" y="7" rx="1" />
    <rect width="7" height="5" x="10" y="12" rx="1" />
  </svg>
);

export default function ScannedPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  // Get result from navigation state - API call already happened in ScanPage
  const result = state?.result;
  const status: ActivationStatus = result?.status ?? "invalid-code";
  const errorMessage: string = result?.errorMessage ?? "";
  const activatedAt: string | undefined = result?.activatedAt;
  const customerName: string | undefined = result?.customerName;
  const orderId: string | undefined = result?.orderId;
  const orderDate: string | undefined = result?.orderDate;

  // Format timestamp for display
  const formatTimestamp = (timestamp: string | undefined): string => {
    if (!timestamp) {
      return "";
    }
    try {
      const date = new Date(timestamp);
      return date.toLocaleString("de-AT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "";
    }
  };

  // Format date only (without time) for display
  const formatDate = (timestamp: string | undefined): string => {
    if (!timestamp) {
      return "";
    }
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString("de-AT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  const handleGoBack = () => {
    navigate("/scan");
  };

  const handleGoHome = () => {
    navigate("/");
  };

  const renderStatus = () => {
    switch (status) {
      case "success":
        return (
          <>
            <IconCircle variant="success">
              <CheckIcon />
            </IconCircle>
            <h2 className="text-2xl font-bold text-green-400 mb-2 text-center">
              Erfolgreich!
            </h2>
            <p className="text-gray-400 text-center">
              Das Ticket wurde erfolgreich aktiviert.
            </p>
          </>
        );
      case "already-activated":
        const formattedTime = formatTimestamp(activatedAt);
        const formattedOrderDate = formatDate(orderDate);
        return (
          <>
            <IconCircle variant="warning">
              <WarningIcon />
            </IconCircle>
            <h2 className="text-2xl font-bold text-amber-400 mb-2 text-center">
              Bereits aktiviert
            </h2>
            <p className="text-gray-400 text-center mb-3">
              Dieses Ticket wurde bereits aktiviert.
            </p>
            
            {/* Order Information Box */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 w-full max-w-md space-y-2">
              <h3 className="text-sm font-semibold text-amber-400 mb-2">
                Bestellinformationen
              </h3>
              
              {customerName && (
                <div className="flex flex-col gap-1 text-sm">
                  <span className="text-gray-500">Kunde:</span>
                  <span className="font-mono text-xs text-gray-300 break-all">{customerName}</span>
                </div>
              )}
              
              {orderId && (
                <div className="flex flex-col text-sm gap-1">
                  <span className="text-gray-500">Bestellungs-ID:</span>
                  <span className="font-mono text-xs text-gray-300 break-all">#{orderId}</span>
                </div>
              )}
              
              {formattedOrderDate && (
                <div className="flex flex-col gap-1 text-sm">
                  <span className="text-gray-500">Bestelldatum:</span>
                  <span className="font-mono text-xs text-gray-300 break-all">{formattedOrderDate}</span>
                </div>
              )}
              
              {formattedTime && (
                <div className="flex flex-col gap-1 text-sm pt-2 border-t border-gray-700">
                  <span className="text-gray-500">Validiert am:</span>
                  <span className="font-medium text-amber-300">{formattedTime}</span>
                </div>
              )}
              
              {!formattedTime && (
                <p className="text-gray-500 text-xs text-center pt-2 border-t border-gray-700">
                  Zeitpunkt der Validierung nicht verfügbar.
                </p>
              )}
            </div>
          </>
        );
      case "not-found":
        return (
          <>
            <IconCircle variant="error">
              <CrossIcon />
            </IconCircle>
            <h2 className="text-2xl font-bold text-red-400 mb-2 text-center">
              Ticket nicht gefunden
            </h2>
            <p className="text-gray-400 text-center">
              Das gescannte Ticket konnte nicht im System gefunden werden.
            </p>
          </>
        );
      case "invalid-code":
        return (
          <>
            <IconCircle variant="error">
              <CrossIcon />
            </IconCircle>
            <h2 className="text-2xl font-bold text-red-400 mb-2 text-center">
              Ungültiger Code
            </h2>
            <p className="text-gray-400 text-center">
              Der gescannte Code ist ungültig oder fehlt.
            </p>
          </>
        );
      case "ticket-order-cancelled":
        return (
          <>
            <IconCircle variant="error">
              <CrossIcon />
            </IconCircle>
            <h2 className="text-2xl font-bold text-red-400 mb-2 text-center">
              Ticket storniert
            </h2>
            <p className="text-gray-400 text-center">
              Das Ticket wurde storniert. Der Einlass ist daher nicht möglich.
            </p>
          </>
        );
      case "ticket-not-confirmed":
        return (
          <>
            <IconCircle variant="error">
              <CrossIcon />
            </IconCircle>
            <h2 className="text-2xl font-bold text-red-400 mb-2 text-center">
              Ticket nicht bestätigt
            </h2>
            <p className="text-gray-400 text-center">
              Das Ticket wurde noch nicht bestätigt. Der Einlass ist daher nicht
              möglich.
            </p>
          </>
        );
      case "ticket-not-paid":
        return (
          <>
            <IconCircle variant="error">
              <CrossIcon />
            </IconCircle>
            <h2 className="text-2xl font-bold text-red-400 mb-2 text-center">
              Ticket nicht bezahlt
            </h2>
            <p className="text-gray-400 text-center">
              Das Ticket wurde noch nicht bezahlt. Der Einlass ist daher nicht
              möglich.
            </p>
          </>
        );
      case "error":
        return (
          <>
            <IconCircle variant="error">
              <ErrorIcon />
            </IconCircle>
            <h2 className="text-2xl font-bold text-red-400 mb-2 text-center">
              Fehler
            </h2>
            <p className="text-gray-400 text-center">{errorMessage}</p>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <PageLayout>
      {renderStatus()}

      {/* Button row */}
      <div className="flex gap-3 mt-6 w-full">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={handleGoHome}
              className="border-gray-700 bg-gray-800 hover:bg-gray-700 text-white"
            >
              <HomeIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Zur Startseite</p>
          </TooltipContent>
        </Tooltip>

        <Button className="flex-1" onClick={handleGoBack}>
          <ScanIcon />
          Nächstes Ticket scannen
        </Button>
      </div>
    </PageLayout>
  );
}
