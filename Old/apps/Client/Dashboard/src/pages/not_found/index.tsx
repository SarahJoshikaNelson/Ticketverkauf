import { Button } from "@/components/ui/button"
import SadEmoji from "@/icons/sadEmoji"
import { useNavigate } from "react-router-dom"

function NotFound() {
    const navigate = useNavigate()
    
    return (
        <div className="flex flex-col items-center justify-center h-screen gap-4">
            <div className="flex items-center justify-center text-accent-800 dark:text-accent-500">
                <SadEmoji width={100} height={100} />
            </div>
            <h1 className="text-2xl font-bold">Seite nicht gefunden</h1>
            <p className="text-text-500 dark:text-text-400">Die Seite, die du suchst, existiert nicht.</p>
            <Button onClick={() => navigate('/')} variant="outline">
                Zurück zur Startseite
            </Button>
        </div>
    )
}

export default NotFound