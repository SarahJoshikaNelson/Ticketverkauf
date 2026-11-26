import ScheduleAdjuster from "@/components/settings/data/schedule-adjuster";

function Schedule() {
  return (
    <div className="flex flex-col gap-4 pr-2 max-w-200 mx-auto">
      <h1 className="text-2xl font-bold">Zeitplan</h1>
      <ScheduleAdjuster />
    </div>
  );
}

export default Schedule;
