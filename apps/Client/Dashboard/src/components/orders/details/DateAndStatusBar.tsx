import ThreeDotDropdown from "@/components/ui-additions/ThreeDotDropdown";
import { formatDateTime } from "@/lib/utils";

type DateAndStatusBarProps = {
  date: string;
  id: string;
  status: string;
  onStatusChange: (status: string) => void;
  onDownload: () => void;
};

function DateAndStatusBar({
  date,
  id,
  status,
  onStatusChange,
  onDownload,
}: DateAndStatusBarProps) {
  return (
    <div className="flex flex-col gap-2 w-full p-4 rounded-lg bg-background-700 dark:bg-background-200 relative border border-background-100 dark:border-background-300">
      <p className="text-sm text-gray-400">{formatDateTime(date)}</p>
      <p className="text-sm font-medium">{status}</p>
      <ThreeDotDropdown
        startStatus={status}
        setStatusCallback={onStatusChange}
        id={id}
        className="absolute right-4 top-4 max-sm:hidden"
        onDownload={onDownload}
      />
    </div>
  );
}

export default DateAndStatusBar;
