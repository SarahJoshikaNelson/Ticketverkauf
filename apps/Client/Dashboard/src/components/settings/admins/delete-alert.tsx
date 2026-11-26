import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface DeleteAlertProps {
    id: string;
    onDelete: (val: string) => void;
}

function DeleteAlert({ id, onDelete }: DeleteAlertProps) {
    return (
        <AlertDialog>
            <AlertDialogTrigger className="text-red-500 hover:text-red-700 transition-colors">Löschen</AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Soll der Admin wirklich gelöscht werden?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Dieser Admin wird nicht mehr auf diese Seite zugreifen können.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(id)} className="text-red-500">Löschen</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export default DeleteAlert;