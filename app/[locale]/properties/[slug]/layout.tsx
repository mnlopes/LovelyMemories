import parse from 'html-react-parser';
import { getLegacyHead } from "@/lib/legacy";

export default function PropertyDetailLayout({ children }: { children: React.ReactNode }) {
    const legacyHeadContent = getLegacyHead('building-detail');
    return (
        <div className="single-property-detail">
            {parse(legacyHeadContent.replace(/>\s+</g, '><').trim())}
            {children}
        </div>
    );
}
