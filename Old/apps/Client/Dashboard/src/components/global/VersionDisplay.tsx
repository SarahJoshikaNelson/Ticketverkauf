export default function VersionDisplay() {
  const version = import.meta.env.VITE_API_VERSION || "dev";

  return (
    <div className="fixed bottom-4 right-4 z-40 text-xs text-muted-foreground/60 pointer-events-none select-none">
      v{version}
    </div>
  );
}

