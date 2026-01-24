export const metadata = {
    title: 'Sanity Studio',
    description: 'Lovely Memories Content Management',
}

export default function StudioLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            {children}
        </>
    )
}
