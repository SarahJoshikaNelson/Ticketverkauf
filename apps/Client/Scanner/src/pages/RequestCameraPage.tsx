import { useEffect } from "react";
import { useNavigate } from "react-router";
import PageLayout from "../components/PageLayout";
import { Spinner } from "../components";

export default function RequestCameraPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const requestCameraAccess = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        // Stop the stream immediately - we just wanted to check permissions
        stream.getTracks().forEach((track) => track.stop());
        navigate("/scan", { replace: true });
      } catch (err) {
        let errorMessage = "Ein unbekannter Fehler ist aufgetreten.";

        if (err instanceof Error) {
          if (
            err.name === "NotAllowedError" ||
            err.name === "PermissionDeniedError"
          ) {
            errorMessage =
              "Kamerazugriff wurde verweigert. Bitte erlaube den Zugriff auf die Kamera in deinen Browsereinstellungen und lade die Seite neu.";
          } else if (
            err.name === "NotFoundError" ||
            err.name === "DevicesNotFoundError"
          ) {
            errorMessage =
              "Keine Kamera gefunden. Bitte stelle sicher, dass dieses Gerät über eine Kamera verfügt.";
          } else if (
            err.name === "NotReadableError" ||
            err.name === "TrackStartError"
          ) {
            errorMessage =
              "Kamera ist bereits in Verwendung. Bitte schließe andere Anwendungen, die die Kamera nutzen.";
          } else if (err.name === "OverconstrainedError") {
            errorMessage =
              "Die Kamera erfüllt nicht die erforderlichen Anforderungen.";
          } else if (err.name === "SecurityError") {
            errorMessage =
              "Kamerazugriff aus Sicherheitsgründen blockiert. Bitte stelle sicher, dass du eine sichere Verbindung (HTTPS) verwendest.";
          } else {
            errorMessage = `Kamerafehler: ${err.message}`;
          }
        }

        navigate("/error", {
          replace: true,
          state: { error: errorMessage },
        });
      }
    };

    requestCameraAccess();
  }, [navigate]);

  return (
    <PageLayout>
      <Spinner />
      <p className="text-gray-400 text-center">
        Kamerazugriff wird angefordert...
      </p>
    </PageLayout>
  );
}
