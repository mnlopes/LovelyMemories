import type { Metadata } from "next";

export const metadata: Metadata = {
    // A plain-string title here swallowed the root layout's "%s | Lovely Memories"
    // template, leaving blog post pages without the brand suffix.
    title: { default: "Blog", template: "%s | Lovely Memories" },
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
