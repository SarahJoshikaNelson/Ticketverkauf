import QueueSizeAdjuster from "@/components/settings/queue/QueueSizeAdjuster";
import ReservationDurationAdjuster from "@/components/settings/queue/ReservationDurationAdjuster";
import ConfirmationDurationAdjuster from "@/components/settings/queue/ConfirmationDurationAdjuster";
import GifSetter from "@/components/settings/styles/gif-setter";

function Queue() {
  return (
    <div className="flex flex-col gap-4 pr-2 max-w-200 mx-auto">
      <h1 className="text-2xl font-bold">Warteschlange</h1>
      <div className="flex flex-col gap-10 items-center">
        <QueueSizeAdjuster />
        <ReservationDurationAdjuster />
        <ConfirmationDurationAdjuster />
        <GifSetter />
      </div>
    </div>
  );
}

export default Queue;
