import 'server-only';
import sanitizeHtml from 'sanitize-html';

// Blog post HTML is written by editors in the backoffice and shown to everyone, admins
// included (public post page, and the backoffice editor via innerHTML). Unsanitized, an editor
// could store a <script> or an <img onerror=...> that runs in an admin's browser and steals the
// session (audit 2026-11-13, S-6).
//
// Policy: keep what changes how a post LOOKS (the published posts carry markup pasted from
// another editor: div/span with classes and inline styles, data-* attributes, small SVG
// icons), drop everything that can RUN or navigate: <script>, <style>, <iframe>, <object>,
// <form>, every on* handler, and javascript:/data: links. Applied on save (upsertBlogPost), on
// load for the editor (getBlogPosts) and on render (blog/[slug]), so older rows are covered too.

const SVG_TAGS = ['svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon'];
const SVG_ATTRIBUTES = [
    'xmlns', 'width', 'height', 'viewbox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap',
    'stroke-linejoin', 'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
    'points', 'transform', 'opacity', 'fill-rule', 'clip-rule',
];

const OPTIONS: sanitizeHtml.IOptions = {
    allowedTags: [
        ...sanitizeHtml.defaults.allowedTags, // headings, p, lists, tables, a, strong, em, div, span, hr…
        'img', 'figure', 'figcaption', 'button', 'del', 'ins',
        ...SVG_TAGS,
    ],
    allowedAttributes: {
        '*': ['class', 'style', 'title', 'dir', 'lang', 'role', 'aria-hidden', 'aria-label', 'data-*'],
        a: ['href', 'target', 'rel', 'name'],
        img: ['src', 'alt', 'width', 'height', 'loading'],
        button: ['type'],
        ...Object.fromEntries(SVG_TAGS.map((tag) => [tag, SVG_ATTRIBUTES])),
    },
    // Links: web, mail and phone only (no javascript:, no data:). Images may also be data: URIs,
    // which cannot run script inside an <img>.
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
    allowProtocolRelative: false,
    // Content of these is dropped entirely, not unwrapped into text.
    nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript', 'iframe', 'object', 'embed'],
    transformTags: {
        // A link opening a new tab must not hand the new page a handle on this one.
        a: (tagName, attribs) => (attribs.target === '_blank'
            ? { tagName, attribs: { ...attribs, rel: 'noopener noreferrer' } }
            : { tagName, attribs }),
    },
};

export function sanitizeBlogHtml(html: string | null | undefined): string {
    return html ? sanitizeHtml(html, OPTIONS) : '';
}
