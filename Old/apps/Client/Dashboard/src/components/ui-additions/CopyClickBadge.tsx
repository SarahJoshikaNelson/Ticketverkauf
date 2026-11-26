import { Badge } from "../ui/badge";
import { toast } from "sonner";

function CopyClickBadge({ id }: { id: string }) {

    const handleCopy = () => {
        navigator.clipboard.writeText(id);
        toast.success("Zur Zwischenablage kopiert");
    }

    return (
        <Badge className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" variant="outline" onClick={handleCopy}>#{id}</Badge>
    )
}

export default CopyClickBadge;