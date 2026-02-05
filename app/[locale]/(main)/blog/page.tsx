import { BlogContent } from '@/components/blog/BlogContent';
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Blog - Lovely Memories",
    description: "Read our latest stories.",
};

export default function BlogPage() {
    return (
        <BlogContent />
    );
}
