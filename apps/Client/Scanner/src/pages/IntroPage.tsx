import { useNavigate } from "react-router";
import { useKeycloak } from "@react-keycloak/web";
import PageLayout from "../components/PageLayout";
import IconCircle from "../components/IconCircle";
import QrCodeIcon from "../components/icons/QrCodeIcon";
import { Button } from "../components/ui/button/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../components/ui/tooltip";

const LogoutIcon = () => (
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
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </svg>
);

export default function IntroPage() {
  const navigate = useNavigate();
  const { keycloak } = useKeycloak();

  const handleStartScanner = () => {
    navigate("/request-camera");
  };

  const handleLogout = () => {
    keycloak.logout({ redirectUri: window.location.origin });
  };

  return (
    <PageLayout>
      {/* Logout button in top right */}
      <div className="absolute top-4 right-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <LogoutIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Abmelden</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <IconCircle variant="info">
        <QrCodeIcon />
      </IconCircle>
      <h1 className="text-2xl font-bold text-center text-white mb-2">
        Ticket-Scanner
      </h1>
      <p className="text-gray-400 text-center mb-6">
        Willkommen beim Einlass-Scanner für den Maturaball. Mit dieser Anwendung
        können Sie die QR-Codes auf den Tickets scannen, um den Einlass zu
        bestätigen.
      </p>
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
        <p className="text-amber-300 text-sm">
          <strong>Hinweis:</strong> Diese Anwendung benötigt Zugriff auf Ihre
          Kamera. Bitte erlauben Sie den Kamerazugriff, wenn Sie danach gefragt
          werden.
        </p>
      </div>
      <Button onClick={handleStartScanner} className="w-full">
        Scanner starten
      </Button>
    </PageLayout>
  );
}
