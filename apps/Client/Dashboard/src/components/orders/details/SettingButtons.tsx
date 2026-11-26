import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { changeOrderStatus } from "@/utils/order-edit-utils";
import { useKeycloak } from "@react-keycloak/web";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useState } from "react";

interface SettingButtonsProps {
    orderId: string;
    status: string;
    onStatusChange: (status: string) => void;
    onDownload: () => Promise<void>;
}

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
    { value: "DONE", label: "Abgeholt" },
    { value: "PAID", label: "Bezahlt" },
    { value: "CONFIRMED", label: "Bestätigt" },
    { value: "WAITING", label: "Unbestätigt" },
    { value: "CANCELLED", label: "Abgebrochen" }
];

function SettingButtons({ orderId, status, onStatusChange, onDownload }: SettingButtonsProps) {
    const { keycloak } = useKeycloak();
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleStatusSelect = async (value: string) => {
        if (!keycloak.token) {
            toast.error("Keine Berechtigung zum Ändern des Status");
            return;
        }

        if (value === status) {
            return;
        }

        setIsUpdatingStatus(true);
        try {
            await changeOrderStatus(orderId, value, keycloak.token);
            onStatusChange(value);
        } catch (error) {
            console.error("Status update failed", error);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleDownloadClick = async () => {
        setIsDownloading(true);
        try {
            await onDownload();
        } catch (error) {
            console.error("Download failed", error);
            toast.error("Fehler beim Download der Tickets");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div id="setting-buttons" className="flex flex-col sm:flex-row gap-2 w-full items-center justify-center">
            <Select value={status} onValueChange={handleStatusSelect} disabled={isUpdatingStatus}>
                <SelectTrigger className="max-sm:w-2/3">
                    <SelectValue placeholder="Status wählen" />
                </SelectTrigger>
                <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button variant="outline" className="max-sm:w-2/3" onClick={handleDownloadClick} disabled={isDownloading}>
                {isDownloading ? "Lade herunter..." : "Download"}
            </Button>
        </div>
    )
}

export default SettingButtons;