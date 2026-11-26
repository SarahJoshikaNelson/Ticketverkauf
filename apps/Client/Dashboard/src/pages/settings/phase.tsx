import CurrentPhase from "@/components/settings/phases/CurrentPhase";

function Phase() {
  return (
    <div className="flex flex-col gap-4 max-w-200 mx-auto">
      <h1 className="text-2xl font-bold">Phase</h1>
      <CurrentPhase />
    </div>
  );
}

export default Phase;
