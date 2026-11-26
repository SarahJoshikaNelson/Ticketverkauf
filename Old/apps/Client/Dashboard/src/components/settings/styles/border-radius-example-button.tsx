function BorderRadiusExampleButton() {
    return (
        <div className="relative border-primary border-2 pb-0.5 pt-0.5 pr-5 pl-5 rounded tracking-wide flex justify-center items-center text-primary font-medium group overflow-hidden cursor-pointer select-none">
            <p className="transition-colors duration-300 group-hover:text-white">Button</p>
            <div className="flex justify-center items-center absolute w-full h-full top-0 left-0 -z-10">
                <span
                    className="relative transition-all duration-500 w-0 rounded-full ease-in-out bg-primary aspect-square group-hover:w-full group-hover:scale-110">
                </span>
            </div>
        </div>
    )
}

export default BorderRadiusExampleButton;