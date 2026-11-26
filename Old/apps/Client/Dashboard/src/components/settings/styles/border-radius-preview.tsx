interface BorderRadiusPreviewProps {
    borderRadius: number;
}

function BorderRadiusPreview({ borderRadius }: BorderRadiusPreviewProps) {
    return (
        <div style={{ borderRadius: `${borderRadius}px` }} className="w-20 h-20 bg-background">
        </div>
    )
}

export default BorderRadiusPreview;