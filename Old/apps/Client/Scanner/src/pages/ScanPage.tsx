import { useRef, useState } from "react";
import BarcodeScanner from "react-qr-barcode-scanner";
import { useNavigate } from "react-router";
import { useKeycloak } from "@react-keycloak/web";
import authFetch, { getApiBase } from "../utils/authFetch";
import { Button } from "../components/ui/button/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../components/ui/tooltip";
import type { ActivationResult } from "./ScannedPage";

// SVG Icons
const HomeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
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

const BackIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);

const InfoIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

const LogoutIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </svg>
);

const FlashlightIcon = ({ enabled }: { enabled: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill={enabled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 2h6l3 7v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9l3-7z" />
    <path d="M9 9h6" />
  </svg>
);

// Module-level lock to prevent multiple scans across re-renders
let globalScanLock = false;

async function activateTicket(uuid: string): Promise<ActivationResult> {
  const apiBase = getApiBase();

  try {
    const response = await authFetch(
      `${apiBase}/v2/ticket-activation/${uuid}`,
      undefined,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
      "POST"
    );

    if (response.status === 204) {
      return { status: "success" };
    } else if (response.status === 400) {
      const errorData = await response.json();
      if (errorData.message === "already activated") {
        return { 
          status: "already-activated",
          activatedAt: errorData.activatedAt,
          customerName: errorData.customerName,
          orderId: errorData.orderId,
          orderDate: errorData.orderDate
        };
      }
      if (errorData.message === "ticket order cancelled") {
        return { status: "ticket-order-cancelled" };
      }
      if (errorData.message === "ticket not confirmed") {
        return { status: "ticket-not-confirmed" };
      }
      if (errorData.message === "ticket not paid") {
        return { status: "ticket-not-paid" };
      }
      return { status: "error", errorMessage: errorData.message };
    } else if (response.status === 404) {
      const errorData = await response.json();
      if (errorData.message === "ticket not found") {
        return { status: "not-found" };
      }
      return { status: "error", errorMessage: errorData.message };
    } else {
      return {
        status: "error",
        errorMessage: `Unexpected response: ${response.status}`,
      };
    }
  } catch (error) {
    return {
      status: "error",
      errorMessage:
        error instanceof Error ? error.message : "Network error occurred",
    };
  }
}

export default function ScanPage() {
  const navigate = useNavigate();
  const { keycloak } = useKeycloak();
  const sideSize = Math.min(window.innerWidth, window.innerHeight);
  const [scannerActive, setScannerActive] = useState(true);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const hasScannedRef = useRef(false);

  // Reset global lock when component mounts
  useState(() => {
    globalScanLock = false;
  });

  // Toggle torch/flashlight
  const toggleTorch = () => {
    setTorchEnabled(!torchEnabled);
  };

  const handleLogout = () => {
    keycloak.logout({ redirectUri: window.location.origin });
  };

  const handleScanError = (error: unknown) => {
    if (hasScannedRef.current || globalScanLock) return;
    hasScannedRef.current = true;
    globalScanLock = true;
    setScannerActive(false);

    let errorMessage = "Ein unbekannter Fehler ist beim Scannen aufgetreten.";

    if (error instanceof Error) {
      errorMessage = error.message || errorMessage;
    }

    navigate("/error", {
      replace: true,
      state: { error: errorMessage },
    });
  };

  const handleScanResult = async (code: string) => {
    // Triple check - this is critical!
    if (hasScannedRef.current) return;
    if (globalScanLock) return;

    // Set locks IMMEDIATELY and SYNCHRONOUSLY before any async work
    hasScannedRef.current = true;
    globalScanLock = true;
    setScannerActive(false);

    // Now do the API call - only ONE call will ever reach here
    const result = await activateTicket(code);

    // Navigate with the result, not the code
    navigate("/scanned", {
      replace: true,
      state: { result },
    });
  };

  const handleGoHome = () => {
    navigate("/");
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="h-screen w-screen flex flex-col justify-center items-center relative bg-black">
      {/* Top controls overlay */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start">
        {/* Left side: Back & Home buttons */}
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                onClick={handleGoBack}
                className="bg-gray-900/90 hover:bg-gray-800 text-white shadow-lg border border-gray-700"
              >
                <BackIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Zurück</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                onClick={handleGoHome}
                className="bg-gray-900/90 hover:bg-gray-800 text-white shadow-lg border border-gray-700"
              >
                <HomeIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Zur Startseite</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Right side: Info & Logout buttons */}
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="bg-gray-900/90 hover:bg-gray-800 text-white shadow-lg border border-gray-700"
              >
                <InfoIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[16rem]">
              <p className="font-semibold mb-1">Scanner-Anleitung</p>
              <p>
                Halten Sie den QR-Code des Tickets in den Kamerabereich. Das
                Ticket wird automatisch erkannt und aktiviert.
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                onClick={handleLogout}
                className="bg-gray-900/90 hover:bg-gray-800 text-white shadow-lg border border-gray-700"
              >
                <LogoutIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Abmelden</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Scanner view */}
      <div className="w-full flex justify-center items-center relative">
        {scannerActive && (
          <>
            <BarcodeScanner
              width={sideSize}
              height={sideSize}
              delay={300} // Faster scanning (default is 500ms)
              facingMode="environment" // Use rear camera
              torch={torchEnabled}
              videoConstraints={{
                width: { min: 640, ideal: 1920, max: 1920 },
                height: { min: 480, ideal: 1080, max: 1080 },
                facingMode: "environment",
              }}
              onUpdate={(err, result) => {
                // Early return before calling handler
                if (hasScannedRef.current || globalScanLock) return;

                if (result) {
                  handleScanResult(result.getText());
                }

                if (err) {
                  console.error(`Etwas ist schiefgelaufen: ${err}`);
                }
              }}
              onError={handleScanError}
            />
            
            {/* Scanning guide overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-64 h-64">
                {/* Corner brackets for scanning guide */}
                <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-green-400 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-green-400 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-green-400 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-green-400 rounded-br-lg"></div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-8 left-4 right-4 z-10 flex flex-col items-center gap-4">
        <p className="text-white/80 text-center text-sm">
          QR-Code im Kamerabereich positionieren
        </p>
        
        {/* Flashlight toggle button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              onClick={toggleTorch}
              className={`bg-gray-900/90 hover:bg-gray-800 text-white shadow-lg border border-gray-700 ${
                torchEnabled ? "bg-yellow-600/90 hover:bg-yellow-500" : ""
              }`}
            >
              <FlashlightIcon enabled={torchEnabled} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{torchEnabled ? "Taschenlampe ausschalten" : "Taschenlampe einschalten"}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
