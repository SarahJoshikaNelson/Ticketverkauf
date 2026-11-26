import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PriorityDropdownProps {
    priority: string;
    setPriority: (priority: string) => void;
}

function PriorityDropdown({ priority, setPriority }: PriorityDropdownProps) {
    return (
        <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger>
                <SelectValue placeholder="Priorität" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="HIGH">Volle Kontrolle</SelectItem>
                <SelectItem value="LOW">Nur Scan</SelectItem>
            </SelectContent>
        </Select>
    )
}

export default PriorityDropdown;