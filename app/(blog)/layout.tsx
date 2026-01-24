import parse from 'html-react-parser';
import type { Metadata } from "next";
import { getLegacyHead } from "@/lib/legacy";
import "@/app/globals.css";

// TODO: Atualizar classes do body lendo legacy-blog-body-tag.txt
const BODY_CLASSES = "blog wp-theme-adhq-theme theme-adhq-theme woocommerce-js yith-booking en";

export const metadata: Metadata = {
    title: "Blog - Lovely Memories",
    description: "Read our latest stories.",
};

export default function BlogLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const legacyHeadContent = getLegacyHead('blog');

    return (
        <>
            {parse(legacyHeadContent.replace(/>\s+</g, '><').trim())}
            <main className={BODY_CLASSES}>
                {children}
            </main>
        </>
    );
}
