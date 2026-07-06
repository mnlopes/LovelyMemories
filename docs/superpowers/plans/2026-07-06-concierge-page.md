# Concierge Page (fix + CMS + partner links) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the public Concierge page layout (double scrollbar), make its content editable in Admin → Content Management (EN/PT), add a concierge contact CTA section, and let service cards link to external partner companies.

**Architecture:** Reuses the existing `cms_page_sections` CMS (About Us pattern): the public page fetches sections server-side and passes them to the existing client components, which fall back to the current next-intl strings. Partner links ride on a new `link_url` column in `concierge_services`. Spec: `docs/superpowers/specs/2026-07-06-concierge-page-design.md`.

**Tech Stack:** Next.js 16 App Router, next-intl, Supabase (client + server actions), Tailwind, framer-motion, sonner toasts.

## Global Constraints

- No test suite exists. Verification per task = `npx tsc --noEmit` (must exit 0) + preview checks on `http://localhost:3001` (dev server config `lovely-memories` runs on port 3001).
- Migration `supabase/migrations/20260706120000_concierge_cms_and_links.sql` is applied **manually by the user** in the Supabase dashboard. Code must not break when it is not yet applied (fallbacks cover missing rows; `select('*')` tolerates the extra column either way).
- Translation files `messages/en.json`, `messages/pt.json`, `messages/he.json` must keep key parity — every new key is added to all three.
- Concierge page editor exposes **EN and PT only**. Public `he` locale falls back to EN content.
- Use `Link` from `@/i18n/routing`, never from `next/navigation`/`next/link`.
- `defaultLocale` stays `'en'`; do not touch `i18n/routing.ts`.
- Do not touch `legacy-archive/`, `temp-app/`, root `concierge/`, or `(main)/v2..v11`.

---

### Task 1: Public page layout fixes

**Files:**
- Modify: `app/[locale]/(main)/concierge/page.tsx:27`
- Modify: `components/ConciergeHero.tsx:22,60`
- Modify: `components/ConciergeServices.tsx:83,95,158-163`

**Interfaces:**
- Consumes: nothing new.
- Produces: no API changes — pure layout/CSS fixes.

- [ ] **Step 1: Fix the double scrollbar**

In `app/[locale]/(main)/concierge/page.tsx` replace the `<main>` class:

```tsx
        <main className="relative pt-20 overflow-x-clip">
```

(`overflow-x-hidden` forces computed `overflow-y: auto`, making `main` a second scroll container; `clip` clips without that side effect.)

- [ ] **Step 2: Fix hero height and overline contrast**

In `components/ConciergeHero.tsx`:

Line 22 — hero fills the viewport *minus* the page's `pt-20` (5rem):

```tsx
        <section ref={ref} className="relative h-[calc(100vh-5rem)] min-h-[700px] overflow-hidden bg-navy-950 flex items-center justify-center">
```

Line 60 — overline pill becomes white text (was `text-navy-950`, unreadable on the dark photo):

```tsx
                        <span className="inline-block text-white uppercase tracking-[0.5em] text-xs md:text-sm font-bold font-montserrat backdrop-blur-sm py-3 px-8 rounded-full border border-white/20 bg-white/10 shadow-lg">
```

- [ ] **Step 3: Fix the services header breakpoint**

In `components/ConciergeServices.tsx` the title and feature badges sit side-by-side from `md:` (768px), squeezing the title to one word per line on tablets. Stack until `lg:`:

Line 83 (header wrapper):

```tsx
                        className="w-full flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8"
```

Line 85 (title column — drop the always-on right padding):

```tsx
                        <div className="flex-1 max-w-none lg:pr-8">
```

Line 95 (features list):

```tsx
                        <ul className="flex flex-col sm:flex-row gap-6 sm:gap-8">
```

(line 95 unchanged — listed to confirm it needs no edit.)

- [ ] **Step 4: Hide the section when there are no services**

In `components/ConciergeServices.tsx`, after the loading state is resolved, an empty list currently renders the raw string "No concierge services found." to visitors. Hide the whole section instead. Add just before `return (`:

```tsx
    if (!isLoading && services.length === 0) {
        return null;
    }
```

And delete the now-dead empty-state branch inside the slider (the `: services.length === 0 ? (...)` ternary arm at lines 162–163), leaving:

```tsx
                            {isLoading ? (
                                <div className="w-full flex items-center justify-center py-20">
                                    <div className="w-10 h-10 border-4 border-[#b09e80] border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : (
                                services.map((service, i) => (
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit` — Expected: exit 0, no output.
Preview `http://localhost:3001/en/concierge`:
- Exactly one vertical scrollbar (evaluate: no element besides the document scrolls).
- Hero bottom edge = viewport bottom ("Scroll to explore" visible without scrolling).
- At ~800px width the "Customise your trip…" title spans the full row (badges below it).

- [ ] **Step 6: Commit**

```bash
git add app/[locale]/(main)/concierge/page.tsx components/ConciergeHero.tsx components/ConciergeServices.tsx
git commit -m "fix(concierge): remove double scrollbar, hero height/contrast, header breakpoint, empty state"
```

---

### Task 2: Public page reads CMS sections (with i18n fallback)

**Files:**
- Modify: `app/actions/cms.ts:355-421` (revalidate concierge)
- Modify: `app/[locale]/(main)/concierge/page.tsx`
- Modify: `components/ConciergeHero.tsx`
- Modify: `components/ConciergeIntro.tsx`
- Modify: `components/ConciergeServices.tsx`

**Interfaces:**
- Consumes: `getPageSections(pageSlug: string, locale?: string): Promise<CmsPageSection[]>` from `app/actions/cms.ts`; `CmsPageSection` from `lib/types.ts` (fields: `section_type?`, `title`, `subtitle?`, `content`, `image_url?`, `list_items: {label: string; desc: string}[]`).
- Produces: each concierge component accepts an optional prop `initialSections?: CmsPageSection[]`. Section rows use `page_slug='concierge'` and `section_type` ∈ `'hero' | 'intro' | 'services-header' | 'cta'` (cta consumed in Task 3).

- [ ] **Step 1: Revalidate the concierge route on CMS writes**

In `app/actions/cms.ts`, add to **each** of `upsertPageSection`, `deletePageSection`, `reorderPageSections`, next to the existing `revalidatePath` calls:

```ts
    revalidatePath('/[locale]/concierge', 'layout');
```

- [ ] **Step 2: Fetch sections server-side in the page**

Replace the component in `app/[locale]/(main)/concierge/page.tsx` (imports at top stay, add `getPageSections`):

```tsx
import { getPageSections } from "@/app/actions/cms";

export default async function ConciergePage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    // EN/PT are edited in the backoffice; any other locale (he) falls back to EN.
    const cmsLocale = locale === "pt" ? "pt" : "en";
    const sections = await getPageSections("concierge", cmsLocale);

    return (
        <main className="relative pt-20 overflow-x-clip">
            <ConciergeHero initialSections={sections} />
            <ConciergeIntro initialSections={sections} />
            <ConciergeServices initialSections={sections} />
            <PropertyOwnerSection />
        </main>
    );
}
```

- [ ] **Step 3: ConciergeHero consumes hero section**

In `components/ConciergeHero.tsx`:

```tsx
import { CmsPageSection } from '@/lib/types';

export const ConciergeHero = ({ initialSections }: { initialSections?: CmsPageSection[] }) => {
    const t = useTranslations('Concierge');
    const hero = initialSections?.find((s) => s.section_type === 'hero');
    const overline = hero?.subtitle || t('heroOverTitle');
    const title = hero?.title || t('heroTitle');
    const image = hero?.image_url || '/images/concierge-hero-no-person.png';
    // ...existing refs/scroll code unchanged
```

Then in the JSX replace `{t('heroOverTitle')}` → `{overline}`, `{t('heroTitle')}` → `{title}`, and the `<img src="/images/concierge-hero-no-person.png"` → `<img src={image}`.

- [ ] **Step 4: ConciergeIntro consumes intro section**

In `components/ConciergeIntro.tsx`:

```tsx
import { CmsPageSection } from '@/lib/types';

export const ConciergeIntro = ({ initialSections }: { initialSections?: CmsPageSection[] }) => {
    const t = useTranslations('Concierge');
    const intro = initialSections?.find((s) => s.section_type === 'intro');
    const overline = intro?.subtitle || t('introOverTitle');
    const title = intro?.title || t('introTitle');
    const description = intro?.content || t('introDescription');
    const image = intro?.image_url || '/legacy/concierge/images/concierge-image.png';
    const highlights =
        intro?.list_items && intro.list_items.length >= 2
            ? intro.list_items.slice(0, 2)
            : [
                  { label: t('supportTitle'), desc: t('supportDesc') },
                  { label: t('expertiseTitle'), desc: t('expertiseDesc') },
              ];
```

JSX replacements: `{t('introOverTitle')}` → `{overline}`; `{t('introTitle')}` → `{title}`; `{t('introDescription')}` → `{description}`; `src="/legacy/concierge/images/concierge-image.png"` → `src={image}`; and the two hardcoded highlight blocks become:

```tsx
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 pt-4">
                                {highlights.map((h, i) => (
                                    <div key={i} className="space-y-3 border-l-[3px] border-gold-400 pl-6">
                                        <h4 className="font-bold text-navy-950 text-xl">{h.label}</h4>
                                        <p className="text-sm text-[#696969] leading-relaxed">{h.desc}</p>
                                    </div>
                                ))}
                            </div>
```

- [ ] **Step 5: ConciergeServices consumes services-header section**

In `components/ConciergeServices.tsx`:

```tsx
import { CmsPageSection } from "@/lib/types";

export const ConciergeServices = ({ initialSections }: { initialSections?: CmsPageSection[] }) => {
    const t = useTranslations('Concierge');
    const header = initialSections?.find((s) => s.section_type === 'services-header');
    const headerOverline = header?.subtitle || t('subtitle');
    const headerTitle = header?.title || t('mainTitle');
```

JSX: `{t('subtitle')}` → `{headerOverline}`, `{t('mainTitle')}` → `{headerTitle}`.

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit` — Expected: exit 0.
Preview `/en/concierge` and `/pt/concierge`: page renders identically to before when the migration/seed is not applied (fallback path), and shows DB content once it is. No console errors.

- [ ] **Step 7: Commit**

```bash
git add app/actions/cms.ts app/[locale]/(main)/concierge/page.tsx components/ConciergeHero.tsx components/ConciergeIntro.tsx components/ConciergeServices.tsx
git commit -m "feat(concierge): page content served from cms_page_sections with i18n fallback"
```

---

### Task 3: Concierge contact CTA section

**Files:**
- Create: `components/ConciergeCta.tsx`
- Modify: `app/[locale]/(main)/concierge/page.tsx` (insert between services and PropertyOwnerSection)
- Modify: `messages/en.json`, `messages/pt.json`, `messages/he.json` (Concierge namespace)

**Interfaces:**
- Consumes: `initialSections?: CmsPageSection[]` (row `section_type='cta'`: `subtitle` = overline, `title` = heading, `content` = paragraph); `Link` from `@/i18n/routing`.
- Produces: `ConciergeCta` component; new i18n keys `Concierge.ctaOverTitle|ctaTitle|ctaDescription|ctaButton`.

- [ ] **Step 1: Add fallback strings (all three files)**

In `messages/en.json`, inside the existing `"Concierge"` object, add:

```json
    "ctaOverTitle": "Contact our concierge",
    "ctaTitle": "Tell us what you need",
    "ctaDescription": "From private chefs to seamless transfers — tell us what you have in mind and our team takes care of the rest.",
    "ctaButton": "Get in touch"
```

`messages/pt.json`:

```json
    "ctaOverTitle": "Fale com o nosso concierge",
    "ctaTitle": "Diga-nos o que precisa",
    "ctaDescription": "De chefs privados a transfers sem complicações — diga-nos o que tem em mente e a nossa equipa trata do resto.",
    "ctaButton": "Contacte-nos"
```

`messages/he.json`:

```json
    "ctaOverTitle": "דברו עם הקונסיירז' שלנו",
    "ctaTitle": "ספרו לנו מה אתם צריכים",
    "ctaDescription": "משפים פרטיים ועד העברות חלקות — ספרו לנו מה יש לכם בראש והצוות שלנו ידאג לכל השאר.",
    "ctaButton": "צרו קשר"
```

- [ ] **Step 2: Create the component**

`components/ConciergeCta.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { CmsPageSection } from "@/lib/types";

export const ConciergeCta = ({ initialSections }: { initialSections?: CmsPageSection[] }) => {
    const t = useTranslations("Concierge");
    const cta = initialSections?.find((s) => s.section_type === "cta");
    const overline = cta?.subtitle || t("ctaOverTitle");
    const title = cta?.title || t("ctaTitle");
    const description = cta?.content || t("ctaDescription");

    return (
        <section className="relative bg-navy-950 py-24 lg:py-32 overflow-hidden">
            {/* Soft gold glow accents */}
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-gold-400/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-gold-400/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="max-w-3xl mx-auto text-center flex flex-col items-center gap-6"
                >
                    <span className="text-gold-400 uppercase tracking-[0.3em] text-xs font-bold">
                        {overline}
                    </span>
                    <h2 className="text-4xl md:text-5xl font-playfair font-bold text-white leading-tight">
                        {title}
                    </h2>
                    <p className="text-white/70 text-lg font-light leading-relaxed max-w-xl">
                        {description}
                    </p>
                    <Link
                        href="/contact"
                        className="mt-4 inline-flex items-center gap-2 px-10 py-4 bg-[#B09E80] hover:bg-[#9E8C6D] text-white text-sm font-bold uppercase tracking-[0.2em] rounded-full transition-colors duration-300 shadow-lg"
                    >
                        {t("ctaButton")}
                    </Link>
                </motion.div>
            </div>
        </section>
    );
};
```

- [ ] **Step 3: Insert on the page**

`app/[locale]/(main)/concierge/page.tsx`:

```tsx
import { ConciergeCta } from "@/components/ConciergeCta";
// ...
            <ConciergeServices initialSections={sections} />
            <ConciergeCta initialSections={sections} />
            <PropertyOwnerSection />
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — exit 0. Run: `node -e "['en','pt','he'].forEach(l=>{const m=require('./messages/'+l+'.json');['ctaOverTitle','ctaTitle','ctaDescription','ctaButton'].forEach(k=>{if(!m.Concierge[k])throw new Error(l+' missing '+k)})});console.log('parity ok')"` — Expected: `parity ok`.
Preview: CTA band appears between slider and owner section in EN and PT; button navigates to the locale-prefixed contact page.

- [ ] **Step 5: Commit**

```bash
git add components/ConciergeCta.tsx app/[locale]/(main)/concierge/page.tsx messages/en.json messages/pt.json messages/he.json
git commit -m "feat(concierge): contact CTA section (CMS-backed with i18n fallback)"
```

---

### Task 4: Admin Content Management tab "Concierge Page" (EN/PT)

**Files:**
- Create: `components/admin/content/ConciergePageManagement.tsx`
- Modify: `app/[locale]/admin/content/page.tsx`
- Modify: `messages/en.json`, `messages/pt.json`, `messages/he.json` (AdminContent namespace)

**Interfaces:**
- Consumes: `getPageSections('concierge', locale)`, `upsertPageSection(data: CmsPageSection)` from `@/app/actions/cms`; Supabase Storage bucket `concierge` (exists — used by `ServiceModal`).
- Produces: default-export component `ConciergePageManagement({ locale }: { locale: string })`; new tab `"conciergePage"` in the admin content page; i18n keys under `AdminContent.tabs.conciergePage` and `AdminContent.conciergePage.*`.

- [ ] **Step 1: Add admin i18n keys (all three files — HE gets English strings, the tab is staff-only and HE editing is disabled)**

`messages/en.json`, inside `AdminContent.tabs` add `"conciergePage": "Concierge Page"`, and inside `AdminContent` add:

```json
"conciergePage": {
    "contentLanguage": "Content language",
    "save": "Save changes",
    "saved": "Concierge page saved",
    "loading": "Loading content...",
    "changeImage": "Change image",
    "addImage": "Add image",
    "validation": { "heroTitle": "The hero title is required." },
    "hero": { "title": "Hero — page top", "overline": "Overline (small phrase above the title)", "heading": "Title", "image": "Background image" },
    "intro": { "title": "Intro section", "overline": "Overline", "heading": "Title", "text": "Description", "image": "Side image", "highlight": "Highlight {n}", "highlightTitle": "Title", "highlightDesc": "Short description" },
    "servicesHeader": { "title": "Services section header", "overline": "Overline", "heading": "Title" },
    "cta": { "title": "Contact CTA — bottom of the page", "overline": "Overline", "heading": "Title", "text": "Description" }
}
```

`messages/pt.json` — same shape, translated:

```json
"conciergePage": {
    "contentLanguage": "Idioma do conteúdo",
    "save": "Guardar alterações",
    "saved": "Página Concierge guardada",
    "loading": "A carregar conteúdo...",
    "changeImage": "Mudar imagem",
    "addImage": "Adicionar imagem",
    "validation": { "heroTitle": "O título do hero é obrigatório." },
    "hero": { "title": "Hero — topo da página", "overline": "Frase pequena (acima do título)", "heading": "Título", "image": "Imagem de fundo" },
    "intro": { "title": "Secção de introdução", "overline": "Frase pequena", "heading": "Título", "text": "Descrição", "image": "Imagem lateral", "highlight": "Destaque {n}", "highlightTitle": "Título", "highlightDesc": "Descrição curta" },
    "servicesHeader": { "title": "Cabeçalho da secção de serviços", "overline": "Frase pequena", "heading": "Título" },
    "cta": { "title": "CTA de contacto — fundo da página", "overline": "Frase pequena", "heading": "Título", "text": "Descrição" }
}
```

`messages/he.json` — copy the **English** block verbatim (parity only; backoffice HE UI is not a client requirement) and add `"conciergePage": "Concierge Page"` to its `AdminContent.tabs`.

- [ ] **Step 2: Create `components/admin/content/ConciergePageManagement.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ChevronDown, Image as ImageIcon, Loader2, MousePointerClick, PanelTop, Save, TextQuote, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getPageSections, upsertPageSection } from "@/app/actions/cms";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { CmsPageSection } from "@/lib/types";

const PAGE_SLUG = "concierge";

// EN/PT only — the client does not use Hebrew for now.
const languages = [
    { code: "en", label: "English (EN)", flag: "/legacy/home/images/english-flag.svg" },
    { code: "pt", label: "Português (PT)", flag: "/legacy/home/images/portuguese-flag.svg" },
];

interface SectionState {
    id?: string;
    subtitle: string;
    title: string;
    content: string;
    image_url: string;
}

interface Highlight {
    label: string;
    desc: string;
}

const emptySection = (): SectionState => ({ subtitle: "", title: "", content: "", image_url: "" });

const toState = (row?: CmsPageSection): SectionState => ({
    id: row?.id,
    subtitle: row?.subtitle || "",
    title: row?.title || "",
    content: row?.content || "",
    image_url: row?.image_url || "",
});

export default function ConciergePageManagement({ locale }: { locale: string }) {
    const t = useTranslations("AdminContent.conciergePage");

    const [filterLocale, setFilterLocale] = useState(locale === "pt" ? "pt" : "en");
    const [showLangDropdown, setShowLangDropdown] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingKey, setUploadingKey] = useState<string | null>(null);

    const [hero, setHero] = useState<SectionState>(emptySection());
    const [intro, setIntro] = useState<SectionState>(emptySection());
    const [highlights, setHighlights] = useState<Highlight[]>([
        { label: "", desc: "" },
        { label: "", desc: "" },
    ]);
    const [servicesHeader, setServicesHeader] = useState<SectionState>(emptySection());
    const [cta, setCta] = useState<SectionState>(emptySection());

    const load = useCallback(async () => {
        setIsLoading(true);
        const data = await getPageSections(PAGE_SLUG, filterLocale);
        setHero(toState(data.find((s) => s.section_type === "hero")));
        const introRow = data.find((s) => s.section_type === "intro");
        setIntro(toState(introRow));
        const items = (introRow?.list_items || []) as Highlight[];
        setHighlights([
            { label: items[0]?.label || "", desc: items[0]?.desc || "" },
            { label: items[1]?.label || "", desc: items[1]?.desc || "" },
        ]);
        setServicesHeader(toState(data.find((s) => s.section_type === "services-header")));
        setCta(toState(data.find((s) => s.section_type === "cta")));
        setIsLoading(false);
    }, [filterLocale]);

    useEffect(() => {
        load();
    }, [load]);

    const uploadImage = async (file: File): Promise<string | null> => {
        const fileExt = file.name.split(".").pop();
        const fileName = `page-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
        const { error } = await supabase.storage.from("concierge").upload(`page/${fileName}`, file);
        if (error) {
            toast.error("Upload failed: " + error.message);
            return null;
        }
        const { data: { publicUrl } } = supabase.storage.from("concierge").getPublicUrl(`page/${fileName}`);
        return publicUrl;
    };

    const handleImageUpload =
        (key: string, setter: React.Dispatch<React.SetStateAction<SectionState>>) =>
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploadingKey(key);
            const url = await uploadImage(file);
            if (url) setter((prev) => ({ ...prev, image_url: url }));
            setUploadingKey(null);
        };

    const handleSave = async () => {
        if (!hero.title.trim()) {
            toast.error(t("validation.heroTitle"));
            return;
        }
        setIsSaving(true);
        try {
            const base = { page_slug: PAGE_SLUG, icon: "", locale: filterLocale, list_items: [] as { label: string; desc: string }[] };
            const payloads: CmsPageSection[] = [
                { ...base, id: hero.id, section_type: "hero", subtitle: hero.subtitle, title: hero.title, content: "", image_url: hero.image_url, display_order: 0 },
                { ...base, id: intro.id, section_type: "intro", subtitle: intro.subtitle, title: intro.title, content: intro.content, image_url: intro.image_url, display_order: 1, list_items: highlights },
                { ...base, id: servicesHeader.id, section_type: "services-header", subtitle: servicesHeader.subtitle, title: servicesHeader.title, content: "", display_order: 2 },
                { ...base, id: cta.id, section_type: "cta", subtitle: cta.subtitle, title: cta.title, content: cta.content, display_order: 3 },
            ];
            for (const payload of payloads) {
                const res = await upsertPageSection(payload);
                if (!res.success) throw new Error(res.error);
            }
            toast.success(t("saved"));
            await load();
        } catch (err) {
            toast.error("Save failed: " + (err instanceof Error ? err.message : String(err)));
        } finally {
            setIsSaving(false);
        }
    };

    const selectedLang = languages.find((l) => l.code === filterLocale);

    const inputCls =
        "w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f0f0f0] dark:border-white/5 py-3.5 px-5 rounded-2xl text-sm font-semibold outline-none focus:ring-1 focus:ring-admin-accent transition-all";
    const labelCls = "text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest px-1 block";

    const ImageTile = ({ value, uploadKey, onUpload }: { value: string; uploadKey: string; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
        <div className="group relative h-[140px] rounded-2xl border-2 border-dashed overflow-hidden flex items-center justify-center transition-all cursor-pointer border-[#f0f0f0] dark:border-white/10 hover:border-admin-accent bg-[#fafafa] dark:bg-admin-dark-bg">
            {value ? (
                <>
                    <img src={value} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2">
                        <Upload className="size-5 text-white" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">{t("changeImage")}</span>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center gap-2 text-[#a3a3a3]">
                    <ImageIcon className="size-7 opacity-30" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t("addImage")}</span>
                </div>
            )}
            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={onUpload} disabled={uploadingKey === uploadKey} />
            {uploadingKey === uploadKey && (
                <div className="absolute inset-0 bg-white/80 dark:bg-black/80 flex items-center justify-center">
                    <Loader2 className="size-6 animate-spin text-admin-accent" />
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Top bar: language + save */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-white/5 p-6 rounded-3xl border border-[#f5f5f5] dark:border-white/10 shadow-sm">
                <div className="flex items-center gap-3">
                    <span className={labelCls}>{t("contentLanguage")}</span>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowLangDropdown(!showLangDropdown)}
                            className="flex items-center gap-2 px-4 py-3 bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f0f0f0] dark:border-white/5 rounded-2xl text-xs font-bold transition-all cursor-pointer text-left focus:outline-none"
                        >
                            {selectedLang?.flag && <img src={selectedLang.flag} alt={selectedLang.label} className="w-4 h-4 rounded-full object-cover border border-black/10 dark:border-white/10 shrink-0" />}
                            <span className="truncate text-[#171717] dark:text-admin-dark-text-primary">{selectedLang?.label}</span>
                            <ChevronDown className="size-3.5 text-gray-400 shrink-0 ml-1" />
                        </button>
                        {showLangDropdown && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowLangDropdown(false)} />
                                <div className="absolute top-full left-0 mt-2 bg-white dark:bg-[#1a2331] border border-[#f0f0f0] dark:border-white/10 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-[#f5f5f5] dark:divide-white/5 w-48">
                                    {languages.map((lang) => {
                                        const isSelected = filterLocale === lang.code;
                                        return (
                                            <button
                                                key={lang.code}
                                                type="button"
                                                onClick={() => {
                                                    setFilterLocale(lang.code);
                                                    setShowLangDropdown(false);
                                                }}
                                                className={`w-full px-4 py-2.5 flex items-center justify-between text-left text-xs font-bold transition-colors ${isSelected ? "bg-[#a39076]/10 text-[#a39076] dark:bg-[#a39076]/20" : "text-[#171717] dark:text-admin-dark-text-primary hover:bg-[#fafafa] dark:hover:bg-white/5"}`}
                                            >
                                                <span className="flex items-center gap-2 min-w-0">
                                                    <img src={lang.flag} alt={lang.label} className="w-4 h-4 rounded-full object-cover border border-black/10 dark:border-white/10 shrink-0" />
                                                    <span className="truncate">{lang.label}</span>
                                                </span>
                                                {isSelected && <Check className="size-3 text-[#a39076] shrink-0 ml-1" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving || isLoading}
                    className="flex items-center gap-2 px-6 py-3.5 bg-[#171717] dark:bg-white text-white dark:text-black rounded-2xl text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:hover:scale-100"
                >
                    {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    {t("save")}
                </button>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center gap-3 py-32">
                    <Loader2 className="size-8 animate-spin text-admin-accent" />
                    <span className="text-sm font-bold text-[#a3a3a3] uppercase tracking-widest">{t("loading")}</span>
                </div>
            ) : (
                <>
                    {/* Hero */}
                    <section className="bg-white dark:bg-white/5 p-6 md:p-8 rounded-3xl border border-[#f5f5f5] dark:border-white/10 shadow-sm space-y-6">
                        <div className="flex items-center gap-2">
                            <PanelTop className="size-5 text-[#a39076]" />
                            <h3 className="text-sm font-black text-[#171717] dark:text-admin-dark-text-primary uppercase tracking-tight">{t("hero.title")}</h3>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className={labelCls}>{t("hero.overline")}</label>
                                    <input type="text" value={hero.subtitle} onChange={(e) => setHero((p) => ({ ...p, subtitle: e.target.value }))} className={inputCls} />
                                </div>
                                <div className="space-y-2">
                                    <label className={labelCls}>{t("hero.heading")}</label>
                                    <input type="text" value={hero.title} onChange={(e) => setHero((p) => ({ ...p, title: e.target.value }))} className={inputCls} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className={labelCls}>{t("hero.image")}</label>
                                <ImageTile value={hero.image_url} uploadKey="hero" onUpload={handleImageUpload("hero", setHero)} />
                            </div>
                        </div>
                    </section>

                    {/* Intro */}
                    <section className="bg-white dark:bg-white/5 p-6 md:p-8 rounded-3xl border border-[#f5f5f5] dark:border-white/10 shadow-sm space-y-6">
                        <div className="flex items-center gap-2">
                            <TextQuote className="size-5 text-[#a39076]" />
                            <h3 className="text-sm font-black text-[#171717] dark:text-admin-dark-text-primary uppercase tracking-tight">{t("intro.title")}</h3>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className={labelCls}>{t("intro.overline")}</label>
                                    <input type="text" value={intro.subtitle} onChange={(e) => setIntro((p) => ({ ...p, subtitle: e.target.value }))} className={inputCls} />
                                </div>
                                <div className="space-y-2">
                                    <label className={labelCls}>{t("intro.heading")}</label>
                                    <input type="text" value={intro.title} onChange={(e) => setIntro((p) => ({ ...p, title: e.target.value }))} className={inputCls} />
                                </div>
                                <div className="space-y-2">
                                    <label className={labelCls}>{t("intro.text")}</label>
                                    <textarea value={intro.content} onChange={(e) => setIntro((p) => ({ ...p, content: e.target.value }))} rows={5} className={`${inputCls} resize-none`} />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className={labelCls}>{t("intro.image")}</label>
                                    <ImageTile value={intro.image_url} uploadKey="intro" onUpload={handleImageUpload("intro", setIntro)} />
                                </div>
                                {highlights.map((h, i) => (
                                    <div key={i} className="space-y-2 p-4 rounded-2xl border border-[#f0f0f0] dark:border-white/10">
                                        <span className={labelCls}>{t("intro.highlight", { n: i + 1 })}</span>
                                        <input
                                            type="text"
                                            placeholder={t("intro.highlightTitle")}
                                            value={h.label}
                                            onChange={(e) => setHighlights((prev) => prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                                            className={inputCls}
                                        />
                                        <input
                                            type="text"
                                            placeholder={t("intro.highlightDesc")}
                                            value={h.desc}
                                            onChange={(e) => setHighlights((prev) => prev.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)))}
                                            className={inputCls}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Services header */}
                    <section className="bg-white dark:bg-white/5 p-6 md:p-8 rounded-3xl border border-[#f5f5f5] dark:border-white/10 shadow-sm space-y-6">
                        <div className="flex items-center gap-2">
                            <ImageIcon className="size-5 text-[#a39076]" />
                            <h3 className="text-sm font-black text-[#171717] dark:text-admin-dark-text-primary uppercase tracking-tight">{t("servicesHeader.title")}</h3>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className={labelCls}>{t("servicesHeader.overline")}</label>
                                <input type="text" value={servicesHeader.subtitle} onChange={(e) => setServicesHeader((p) => ({ ...p, subtitle: e.target.value }))} className={inputCls} />
                            </div>
                            <div className="space-y-2">
                                <label className={labelCls}>{t("servicesHeader.heading")}</label>
                                <input type="text" value={servicesHeader.title} onChange={(e) => setServicesHeader((p) => ({ ...p, title: e.target.value }))} className={inputCls} />
                            </div>
                        </div>
                    </section>

                    {/* CTA */}
                    <section className="bg-white dark:bg-white/5 p-6 md:p-8 rounded-3xl border border-[#f5f5f5] dark:border-white/10 shadow-sm space-y-6">
                        <div className="flex items-center gap-2">
                            <MousePointerClick className="size-5 text-[#a39076]" />
                            <h3 className="text-sm font-black text-[#171717] dark:text-admin-dark-text-primary uppercase tracking-tight">{t("cta.title")}</h3>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className={labelCls}>{t("cta.overline")}</label>
                                    <input type="text" value={cta.subtitle} onChange={(e) => setCta((p) => ({ ...p, subtitle: e.target.value }))} className={inputCls} />
                                </div>
                                <div className="space-y-2">
                                    <label className={labelCls}>{t("cta.heading")}</label>
                                    <input type="text" value={cta.title} onChange={(e) => setCta((p) => ({ ...p, title: e.target.value }))} className={inputCls} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className={labelCls}>{t("cta.text")}</label>
                                <textarea value={cta.content} onChange={(e) => setCta((p) => ({ ...p, content: e.target.value }))} rows={5} className={`${inputCls} resize-none`} />
                            </div>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
```

- [ ] **Step 3: Register the tab**

In `app/[locale]/admin/content/page.tsx`:

1. Import: `import ConciergePageManagement from "@/components/admin/content/ConciergePageManagement";` and add `ConciergeBell` to the lucide import.
2. Extend the type: `type TabType = "blog" | "social" | "faq" | "about" | "conciergePage" | "terms" | "privacy";`
3. Add a tab button after the About button (same classes as its siblings):

```tsx
                <button
                    onClick={() => setActiveTab("conciergePage")}
                    className={cn(
                        "flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap shrink-0",
                        activeTab === "conciergePage"
                            ? "bg-[#171717] dark:bg-white text-white dark:text-black shadow-lg"
                            : "text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white"
                    )}
                >
                    <ConciergeBell className="size-4" />
                    {t('tabs.conciergePage')}
                </button>
```

4. Add the render branch:

```tsx
                ) : activeTab === "conciergePage" ? (
                    <ConciergePageManagement locale={locale} />
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — exit 0.
Preview (logged in as admin) `http://localhost:3001/en/admin/content`: new "Concierge Page" tab shows the four sections with seeded content (after the user applies the migration; before that, fields are empty and saving creates the rows). Language dropdown lists only EN and PT. Edit a PT field + save → `/pt/concierge` shows the change after refresh, `/en/concierge` untouched. Swap the hero image via upload → public hero updates.

- [ ] **Step 5: Commit**

```bash
git add components/admin/content/ConciergePageManagement.tsx app/[locale]/admin/content/page.tsx messages/en.json messages/pt.json messages/he.json
git commit -m "feat(admin): Concierge Page tab in Content Management (EN/PT)"
```

---

### Task 5: Partner links on service cards

**Files:**
- Modify: `components/admin/concierge/ServiceModal.tsx`
- Modify: `app/[locale]/admin/concierge/page.tsx:11-22` (interface only)
- Modify: `components/ConciergeServices.tsx`
- Modify: `messages/en.json`, `messages/pt.json`, `messages/he.json` (AdminConcierge.serviceModal keys)

**Interfaces:**
- Consumes: `concierge_services.link_url` (nullable text, from the migration); services arrive through the existing `getConciergeServices()` (`select('*')` — no change needed).
- Produces: cards render as `<a target="_blank" rel="noopener noreferrer nofollow">` when `link_url` is set.

- [ ] **Step 1: Admin i18n keys**

Add inside `AdminConcierge.serviceModal` in all three files:

`messages/en.json`:
```json
    "linkLabel": "Partner website (URL)",
    "linkHint": "Optional. The card links to this external company in a new tab.",
    "linkInvalid": "The partner link must start with http:// or https://"
```
`messages/pt.json`:
```json
    "linkLabel": "Site do parceiro (URL)",
    "linkHint": "Opcional. O card abre o site desta empresa externa numa nova aba.",
    "linkInvalid": "O link do parceiro tem de começar por http:// ou https://"
```
`messages/he.json`: copy the English strings.

- [ ] **Step 2: ServiceModal field**

In `components/admin/concierge/ServiceModal.tsx`:

1. Add `link_url: string;` to the `Service` interface and `link_url: ''` to both `setFormData` initial objects (initial state and the reset in `useEffect`). In the `useEffect`, guard old rows: `setFormData({ link_url: '', ...service });`
2. Validate in `handleSubmit` before the try block:

```tsx
        const link = formData.link_url?.trim() || '';
        if (link && !/^https?:\/\//i.test(link)) {
            toast.error(t('serviceModal.linkInvalid'));
            return;
        }
```

and save `{ ...formData, link_url: link || null }` instead of raw `formData` in both the `.update(...)` and `.insert([...])` calls.

3. Add the input after the "Content Inputs" language block and before the Active toggle (it is language-independent):

```tsx
                        {/* Partner link */}
                        <div>
                            <label className="block text-xs font-bold text-[#a3a3a3] uppercase tracking-wider mb-1">{t('serviceModal.linkLabel')}</label>
                            <input
                                type="url"
                                value={formData.link_url || ''}
                                onChange={e => setFormData({ ...formData, link_url: e.target.value })}
                                className="w-full border border-[#f5f5f5] dark:border-admin-dark-border dark:bg-admin-dark-bg rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-[#171717] dark:focus:ring-white outline-none dark:text-admin-dark-text-primary transition-all"
                                placeholder="https://partner-company.com"
                            />
                            <p className="text-[10px] text-[#a3a3a3] mt-1 font-medium">{t('serviceModal.linkHint')}</p>
                        </div>
```

4. In `app/[locale]/admin/concierge/page.tsx` add `link_url: string;` to its local `Service` interface (display unchanged).

- [ ] **Step 3: Public card becomes a link with drag guard + description reveal**

In `components/ConciergeServices.tsx`:

1. Type the services and track drag distance:

```tsx
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";

interface ConciergeService {
    id: string;
    name_en: string;
    name_pt: string;
    name_he?: string;
    description_en?: string;
    description_pt?: string;
    description_he?: string;
    image?: string;
    link_url?: string | null;
}
```

Replace `useState<any[]>([])` with `useState<ConciergeService[]>([])`. Add next to the drag state:

```tsx
    const dragStartXRef = useRef<number | null>(null);
```

In `handleMouseDown` add `dragStartXRef.current = e.pageX;`. Add a click guard:

```tsx
    const handleCardClick = (e: React.MouseEvent) => {
        // Suppress the click when the pointer was dragged (slider drag-to-scroll),
        // otherwise releasing a drag over a linked card would open the partner site.
        if (dragStartXRef.current !== null && Math.abs(e.pageX - dragStartXRef.current) > 5) {
            e.preventDefault();
        }
    };
```

2. Replace the card render (the `services.map(...)` body). The card content is shared; linked cards wrap it in an anchor:

```tsx
                                services.map((service, i) => {
                                    const name = locale === 'pt' ? service.name_pt : locale === 'he' ? (service.name_he || service.name_en) : service.name_en;
                                    const description = locale === 'pt' ? service.description_pt : locale === 'he' ? (service.description_he || service.description_en) : service.description_en;
                                    const card = (
                                        <motion.div
                                            className="group/card relative w-[300px] h-[450px] rounded-[24px] overflow-hidden shadow-xl"
                                            whileHover={{ y: -5 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                        >
                                            <Image
                                                src={service.image || "/legacy/home/images/services-image-1.png"}
                                                alt={name}
                                                fill
                                                sizes="300px"
                                                className="object-cover transition-transform duration-700 ease-out group-hover/card:scale-110"
                                                draggable={false}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80"></div>
                                            {service.link_url && (
                                                <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center opacity-80 lg:opacity-0 lg:group-hover/card:opacity-100 transition-opacity duration-300">
                                                    <ArrowUpRight className="w-4 h-4 text-white" />
                                                </div>
                                            )}
                                            <div className="absolute bottom-0 left-0 w-full p-6 pb-8 flex flex-col justify-end items-center gap-3 h-full text-center">
                                                <h3 className="text-white text-[26px] font-bold font-sans leading-tight drop-shadow-md">
                                                    {name}
                                                </h3>
                                                {description && (
                                                    <p className="text-white/80 text-sm leading-relaxed line-clamp-3 lg:opacity-0 lg:translate-y-2 lg:group-hover/card:opacity-100 lg:group-hover/card:translate-y-0 transition-all duration-300">
                                                        {description}
                                                    </p>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                    return service.link_url ? (
                                        <a
                                            key={service.id || i}
                                            href={service.link_url}
                                            target="_blank"
                                            rel="noopener noreferrer nofollow"
                                            onClick={handleCardClick}
                                            draggable={false}
                                            className="flex-none"
                                        >
                                            {card}
                                        </a>
                                    ) : (
                                        <div key={service.id || i} className="flex-none">
                                            {card}
                                        </div>
                                    );
                                })
```

Note: `flex-none` moves from the card to the wrapper; the inner card keeps `w-[300px] h-[450px]`. The hover group is named `group/card` to avoid colliding with the slider's existing `group` class on the arrows container.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — exit 0. Run: `node -e "['en','pt','he'].forEach(l=>{const m=require('./messages/'+l+'.json');['linkLabel','linkHint','linkInvalid'].forEach(k=>{if(!m.AdminConcierge.serviceModal[k])throw new Error(l+' missing '+k)})});console.log('parity ok')"` — Expected: `parity ok`.
Preview (requires migration applied): in Admin → Concierge set a partner URL on one service; on `/en/concierge` that card shows the arrow affordance on hover, opens the URL in a new tab on click, and does **not** open when you drag the slider across it. A service without link stays non-clickable. An invalid URL ("partner.com") is rejected with a toast.

- [ ] **Step 5: Commit**

```bash
git add components/admin/concierge/ServiceModal.tsx app/[locale]/admin/concierge/page.tsx components/ConciergeServices.tsx messages/en.json messages/pt.json messages/he.json
git commit -m "feat(concierge): external partner links + description reveal on service cards"
```

---

### Task 6: Final verification pass

**Files:** none (verification only).

**Interfaces:** n/a.

- [ ] **Step 1: Static checks**

Run: `npx tsc --noEmit` — exit 0. Run: `npm run lint` — no new errors (pre-existing warnings acceptable).

- [ ] **Step 2: Full preview walkthrough**

On `http://localhost:3001`:
1. `/en/concierge` + `/pt/concierge`: single scrollbar, hero ends at viewport bottom, header not squeezed at ~800px, CTA section present, no console errors.
2. Admin → Content → Concierge Page: edit every field in EN and PT (including both images + highlights), save, confirm public pages reflect the edits and locales stay independent.
3. Admin → Concierge: partner link add/remove round-trip; drag-vs-click behavior on the public slider.
4. `/he/concierge`: renders with EN CMS content (fallback), no missing-message errors.

- [ ] **Step 3: Report**

Report results to the user, including anything that only the user can do (apply migration in Supabase dashboard, deploy).
