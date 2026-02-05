import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Blog - Lovely Memories",
    description: "Read our latest stories.",
};

export default function BlogLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            {children}
        </>
    );
}
