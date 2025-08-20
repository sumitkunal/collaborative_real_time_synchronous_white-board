import { RoomCanvas } from "@/components/RoomCanvas";

export default async function CanvasPage({ params }: {
    params: {
        roomSlug: string
    }
}) {
    const roomSlug = (await params).roomSlug;
    console.log("CanvasPage roomSlug", roomSlug);
    return <RoomCanvas roomSlug={roomSlug} />
   
}