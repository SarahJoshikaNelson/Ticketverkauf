import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import BorderRadius from "./border-radius";
import { styleResponse } from "@ticket-system/models";

function BorderRadiusPopoutCaller({ data, setData }: { data: styleResponse, setData: (data: styleResponse) => void }) {
    return (
        <Dialog>
            <DialogTrigger className="w-1/3">
                <p className="text-sm font-bold">Border Radius</p>
            </DialogTrigger>

            <DialogContent className="max-sm:min-w-full flex flex-col gap-4 justify-center items-center">
                <DialogTitle>Border Radius</DialogTitle>
                <DialogDescription>
                    Wähle einen Border Radius aus.
                </DialogDescription>
                <BorderRadius data={data} setData={setData} />
            </DialogContent>
        </Dialog>

    )
}

export default BorderRadiusPopoutCaller;