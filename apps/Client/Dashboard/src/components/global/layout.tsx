import { SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { Link } from "react-router-dom";
import { usePhase } from "@/context/PhaseContext";
import VersionDisplay from "./VersionDisplay";
import { PHASES_OBJECT } from "../settings/phases/CurrentPhase";

function Layout({ children }: { children: React.ReactNode }) {
  const { phase, isLoading } = usePhase();
  const phaseLabel = isLoading ? "lädt…" : (phase ?? "-");

  return (
    <div className="flex flex-1 h-dvh w-full overflow-hidden">
      <div className="w-full h-full flex flex-col px-5 pb-5 min-w-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-primary/5 px-5 py-2 text-primary my-6 text-lg">
          <span className="font-medium">Willkommen beim Ballkoenig!</span>
          <span className="text-muted-foreground">&ndash;</span>
          <Link
            to="/settings/phases"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            {phaseLabel === "-"
              ? "Phase unbekannt"
              : phaseLabel === "lädt…"
                ? "Phase lädt…"
                : `${PHASES_OBJECT[phaseLabel]}`}
          </Link>
        </div>
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
          {children}
        </main>
      </div>
      <Toaster />
      <SidebarTrigger className="fixed bottom-4 left-4 z-50" />
      <VersionDisplay />
    </div>
  );
}

export default Layout;
