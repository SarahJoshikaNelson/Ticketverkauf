import { useLocation, useNavigate } from "react-router";
import PageLayout from "../components/PageLayout";
import IconCircle from "../components/IconCircle";
import CrossIcon from "../components/icons/CrossIcon";
import { Button } from "../components/ui/button/button";

export default function ErrorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const error =
    location.state?.error || "Ein unbekannter Fehler ist aufgetreten.";

  const handleBack = () => {
    navigate("/", { replace: true });
  };

  return (
    <PageLayout>
      <IconCircle variant="error">
        <CrossIcon />
      </IconCircle>
      <h2 className="text-xl font-semibold text-center text-white mb-2">
        Scanner konnte nicht gestartet werden
      </h2>
      <p className="text-gray-400 text-center mb-4">{error}</p>
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
        <p className="text-gray-300 text-sm text-center">
          Bei anhaltenden Problemen wenden Sie sich bitte an die Administratoren
          des Maturaballs.
        </p>
      </div>
      <Button onClick={handleBack} className="w-full">
        Zurück
      </Button>
    </PageLayout>
  );
}
