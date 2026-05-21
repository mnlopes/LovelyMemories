"use client";

import { useState, useRef, useEffect } from "react";
import { X, Save, Upload, Loader2, Bold, Italic, List, ListOrdered, Underline, Strikethrough, Image as ImageIcon, Link as LinkIcon, Sparkles, ChevronDown, Check, Type, Eraser } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { upsertBlogPost } from "@/app/actions/cms";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";

const languages = [
    { code: 'en', label: 'English (EN)', flag: '/legacy/home/images/english-flag.svg' },
    { code: 'pt', label: 'Português (PT)', flag: '/legacy/home/images/portuguese-flag.svg' },
    { code: 'he', label: 'Hebrew (HE)', flag: '/legacy/home/images/he.svg' }
];

interface BlogEditorProps {
    post: any | null;
    locale: string;
    onClose: () => void;
    onSave: () => void;
}

export default function BlogEditor({ post, locale, onClose, onSave }: BlogEditorProps) {
    const t = useTranslations('AdminContent.editor');
    const [formData, setFormData] = useState({
        id: post?.id || undefined,
        title: post?.title || "",
        slug: post?.slug || "",
        excerpt: post?.excerpt || "",
        content: post?.content || "",
        image_url: post?.image_url || "",
        author_name: post?.author_name || "",
        locale: post?.locale || locale,
        is_published: post?.is_published || false
    });

    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showLangDropdown, setShowLangDropdown] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    
    // Selection and Link Modal State
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [tempLinkUrl, setTempLinkUrl] = useState("https://");
    const savedSelection = useRef<Range | null>(null);

    // Custom Heading Dropdown State
    const [showHeadingMenu, setShowHeadingMenu] = useState(false);
    const [activeBlock, setActiveBlock] = useState("P");
    const headingMenuRef = useRef<HTMLDivElement>(null);

    // Sync content on mount and init editor
    useEffect(() => {
        if (contentRef.current && post?.content) {
            contentRef.current.innerHTML = post.content;
        }
        
        // Initialize consistent paragraph separator
        document.execCommand('defaultParagraphSeparator', false, 'p');
    }, [post]);

    // Handle Selection Change to update UI state
    useEffect(() => {
        const handleSelectionChange = () => {
            if (!contentRef.current) return;
            
            // Simplified block detection
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                let node = selection.anchorNode;
                while (node && node !== contentRef.current) {
                    if (node.nodeName === 'H1' || node.nodeName === 'H2' || node.nodeName === 'H3' || node.nodeName === 'P') {
                        setActiveBlock(node.nodeName);
                        break;
                    }
                    node = node.parentNode;
                }
            }
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, []);

    // Close heading menu click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (headingMenuRef.current && !headingMenuRef.current.contains(event.target as Node)) {
                setShowHeadingMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleTitleChange = (val: string) => {
        const slug = val.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
        setFormData(prev => ({ ...prev, title: val, slug }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `blog-${Date.now()}.${fileExt}`;
            const filePath = `covers/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('blog-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('blog-images')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, image_url: publicUrl }));
            toast.success("Cover image uploaded!");
        } catch (error: any) {
            toast.error("Upload failed: " + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    // Rich Text Actions
    const execCmd = (cmd: string, value?: string) => {
        contentRef.current?.focus();
        document.execCommand(cmd, false, value);
    };

    const handleHeadingSelect = (tag: string) => {
        execCmd('formatBlock', tag);
        setActiveBlock(tag);
        setShowHeadingMenu(false);
    };

    const handleLinkClick = () => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            savedSelection.current = selection.getRangeAt(0).cloneRange();
        } else {
            savedSelection.current = null;
        }
        setShowLinkModal(true);
    };

    const applyLink = () => {
        if (savedSelection.current) {
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(savedSelection.current);
            }
        }
        if (tempLinkUrl && tempLinkUrl !== "https://") {
            document.execCommand('createLink', false, tempLinkUrl);
        }
        setShowLinkModal(false);
        setTempLinkUrl("https://");
    };

    const handleSave = async () => {
        if (!formData.title || !formData.slug) {
            toast.error("Title and Slug are required!");
            return;
        }

        setIsSaving(true);
        const content = contentRef.current?.innerHTML || "";
        const res = await upsertBlogPost({ ...formData, content });

        if (res.success) {
            toast.success("Article saved!");
            onSave();
        } else {
            toast.error("Save failed: " + res.error);
        }
        setIsSaving(false);
    };

    const headingOptions = [
        { label: t('toolbar.normal'), value: "P", desc: "Regular text paragraph" },
        { label: t('toolbar.h1'), value: "H1", desc: "Main page title size" },
        { label: t('toolbar.h2'), value: "H2", desc: "Section title size" },
        { label: t('toolbar.h3'), value: "H3", desc: "Sub-section size" },
    ];

    return (
        <div className="bg-white dark:bg-white/5 rounded-3xl border border-[#f5f5f5] dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative">
            {/* Editor Styles Injection */}
            <style dangerouslySetInnerHTML={{ __html: `
                .blog-editor-content { font-family: 'Montserrat', sans-serif !important; }
                .blog-editor-content ul { list-style-type: disc !important; margin-left: 1.5rem !important; margin-top: 1rem !important; margin-bottom: 1rem !important; }
                .blog-editor-content ol { list-style-type: decimal !important; margin-left: 1.5rem !important; margin-top: 1rem !important; margin-bottom: 1rem !important; }
                .blog-editor-content li { display: list-item !important; margin-bottom: 0.25rem !important; }
                .blog-editor-content h1 { font-size: 2.25rem !important; font-weight: 900 !important; margin-top: 2rem !important; margin-bottom: 1rem !important; line-height: 1.2 !important; color: #111827; }
                .blog-editor-content h2 { font-size: 1.875rem !important; font-weight: 800 !important; margin-top: 1.5rem !important; margin-bottom: 0.75rem !important; color: #111827; }
                .blog-editor-content h3 { font-size: 1.5rem !important; font-weight: 700 !important; margin-top: 1.25rem !important; margin-bottom: 0.5rem !important; color: #111827; }
                .blog-editor-content p { margin-bottom: 1rem !important; }
                .blog-editor-content a { color: #d4af37 !important; text-decoration: underline !important; cursor: pointer !important; font-weight: 600; }
                .blog-editor-content blockquote { border-left: 4px solid #d4af37; padding-left: 1rem; font-style: italic; color: #737373; margin: 1.5rem 0; font-size: 1.1rem; }
            `}} />

            {/* Custom Link Modal */}
            <AnimatePresence>
                {showLinkModal && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-6 pb-[20%]">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLinkModal(false)} className="absolute inset-0 bg-black/5 dark:bg-black/40 backdrop-blur-[2px]" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative w-full max-w-sm bg-white dark:bg-[#1a1a1a] rounded-3xl border border-[#f0f0f0] dark:border-white/10 shadow-2xl p-8 space-y-6">
                            <div className="space-y-1">
                                <h4 className="text-xs font-black text-[#171717] dark:text-white uppercase tracking-widest">{t('toolbar.link')}</h4>
                                <p className="text-[10px] text-[#a3a3a3] font-medium italic">Insira o destino do seu link</p>
                            </div>
                            <div className="relative">
                                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[#a3a3a3] opacity-40 shadow-sm" />
                                <input autoFocus type="text" value={tempLinkUrl} onChange={(e) => setTempLinkUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyLink()} className="w-full bg-[#fafafa] dark:bg-white/5 border border-[#f0f0f0] dark:border-white/5 py-4 pl-12 pr-6 rounded-2xl text-xs font-bold outline-none ring-1 ring-transparent focus:ring-admin-accent transition-all" placeholder="https://" />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowLinkModal(false)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white transition-colors">Cancelar</button>
                                <button onClick={applyLink} className="flex-none px-8 py-3 bg-[#171717] dark:bg-white text-white dark:text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2">OK <Check className="size-3" /></button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="px-8 py-5 border-b border-[#f5f5f5] dark:border-white/10 flex items-center justify-between bg-[#fafafa] dark:bg-admin-dark-bg/50">
                <div>
                    <h3 className="text-xl font-black text-[#171717] dark:text-admin-dark-text-primary uppercase tracking-tight">{post ? t('edit') : t('create')}</h3>
                    <p className="text-[10px] text-[#a3a3a3] font-bold uppercase tracking-widest mt-1">{t('language')}: {formData.locale.toUpperCase()}</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-3 text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white hover:bg-white dark:hover:bg-white/5 rounded-2xl transition-all"><X className="size-5" /></button>
                    <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-6 py-3 bg-[#171717] dark:bg-white text-white dark:text-black rounded-2xl text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg">{isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} {t('save')}</button>
                </div>
            </div>

            {/* Scrollable Form */}
            <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest px-1">{t('title')}</label>
                            <input type="text" placeholder="..." value={formData.title} onChange={(e) => handleTitleChange(e.target.value)} className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f0f0f0] dark:border-white/5 py-3.5 px-5 rounded-2xl text-lg font-bold outline-none focus:ring-1 focus:ring-admin-accent transition-all" />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest px-1">{t('slug')}</label>
                                <input type="text" placeholder="auto-generated-slug" value={formData.slug} onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))} className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f0f0f0] dark:border-white/5 py-3 px-5 rounded-2xl text-xs font-semibold outline-none focus:ring-1 focus:ring-admin-accent transition-all" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest px-1 block">{t('language')}</label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowLangDropdown(!showLangDropdown)}
                                        className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f0f0f0] dark:border-white/5 py-3.5 px-5 rounded-2xl text-xs font-bold outline-none focus:ring-1 focus:ring-admin-accent transition-all cursor-pointer flex items-center justify-between text-left"
                                    >
                                        <span className="flex items-center gap-3 min-w-0">
                                            {(() => {
                                                const selected = languages.find(l => l.code === formData.locale);
                                                return (
                                                    <>
                                                        {selected?.flag && (
                                                            <img 
                                                                src={selected.flag} 
                                                                alt={selected.label} 
                                                                className="w-5 h-5 rounded-full object-cover border border-black/10 dark:border-white/10 shrink-0" 
                                                            />
                                                        )}
                                                        <span className="truncate text-[#171717] dark:text-admin-dark-text-primary">{selected?.label || formData.locale.toUpperCase()}</span>
                                                    </>
                                                );
                                            })()}
                                        </span>
                                        <ChevronDown className="size-4 text-gray-400 shrink-0 ml-2" />
                                    </button>

                                    {showLangDropdown && (
                                        <>
                                            <div 
                                                className="fixed inset-0 z-40" 
                                                onClick={() => setShowLangDropdown(false)} 
                                            />
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1a2331] border border-[#f0f0f0] dark:border-white/10 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-[#f5f5f5] dark:divide-white/5 animate-in fade-in slide-in-from-top-2 duration-150 max-h-60 overflow-y-auto custom-scrollbar">
                                                {languages.map((lang) => {
                                                    const isSelected = formData.locale === lang.code;
                                                    return (
                                                        <button
                                                            key={lang.code}
                                                            type="button"
                                                            onClick={() => {
                                                                setFormData(prev => ({ ...prev, locale: lang.code }));
                                                                setShowLangDropdown(false);
                                                            }}
                                                            className={`w-full px-5 py-3 flex items-center justify-between text-left text-xs font-bold transition-colors ${
                                                                isSelected 
                                                                    ? 'bg-[#a39076]/10 text-[#a39076] dark:bg-[#a39076]/20' 
                                                                    : 'text-[#171717] dark:text-admin-dark-text-primary hover:bg-[#fafafa] dark:hover:bg-white/5'
                                                            }`}
                                                        >
                                                            <span className="flex items-center gap-3 min-w-0">
                                                                <img 
                                                                    src={lang.flag} 
                                                                    alt={lang.label} 
                                                                    className="w-5 h-5 rounded-full object-cover border border-black/10 dark:border-white/10 shrink-0" 
                                                                />
                                                                <span className="truncate">{lang.label}</span>
                                                            </span>
                                                            {isSelected && <Check className="size-3.5 text-[#a39076] shrink-0 ml-2" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest px-1">{t('excerpt')}</label>
                            <textarea placeholder="..." value={formData.excerpt} onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))} rows={2} className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f0f0f0] dark:border-white/5 py-3 px-5 rounded-2xl text-xs font-medium outline-none focus:ring-1 focus:ring-admin-accent transition-all resize-none" />
                        </div>
                        <div className="pt-6 border-t border-[#f5f5f5] dark:border-white/5">
                            <h4 className="text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest px-1 mb-6 flex items-center gap-2">{t('author')} <div className="h-px flex-1 bg-[#f5f5f5] dark:bg-white/5" /></h4>
                            <div className="flex flex-col sm:flex-row gap-8 items-start w-full">
                                <div className="flex-1 space-y-2 w-full">
                                    <label className="text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest px-1">{t('authorName')}</label>
                                    <input type="text" placeholder="e.g. Lovely Memories Team" value={formData.author_name} onChange={(e) => setFormData(prev => ({ ...prev, author_name: e.target.value }))} className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f0f0f0] dark:border-white/5 py-3 px-5 rounded-2xl text-xs font-semibold outline-none focus:ring-1 focus:ring-admin-accent transition-all" />
                                    <p className="text-[9px] text-[#a3a3a3] italic">Opcional: Deixe em branco para não exibir autor no blog.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest px-1 block text-center lg:text-left">{t('cover')}</label>
                        <div className={cn("group relative aspect-[4/3] rounded-3xl border-2 border-dashed border-[#f0f0f0] dark:border-white/10 bg-[#fafafa] dark:bg-admin-dark-bg overflow-hidden flex flex-col items-center justify-center transition-all cursor-pointer", formData.image_url ? "border-solid border-admin-accent/30" : "hover:border-admin-accent")}>
                            {formData.image_url ? (
                                <>
                                    <img src={formData.image_url} alt="Cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px] flex flex-col items-center justify-center gap-3"><div className="p-3 bg-white/20 rounded-2xl text-white backdrop-blur-md"><Upload className="size-5" /></div><span className="text-[10px] font-black text-white uppercase tracking-widest">Change Image</span></div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-3 text-[#a3a3a3]"><div className="p-4 bg-white dark:bg-white/5 rounded-2xl"><ImageIcon className="size-8 opacity-30" /></div><span className="text-[10px] font-black uppercase tracking-widest text-center">Add Cover Image</span></div>
                            )}
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e)} disabled={isUploading === true} />
                            {isUploading && <div className="absolute inset-0 bg-white/80 dark:bg-black/80 flex items-center justify-center"><Loader2 className="size-6 animate-spin text-admin-accent" /></div>}
                        </div>
                    </div>
                </div>

                {/* Content Editor Group */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f5f5f5] dark:border-white/10 pb-4">
                        <label className="text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest px-1 flex items-center gap-2"> {t('content')} <Sparkles className="size-3 text-gold-400" /> </label>
                        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#fafafa] dark:bg-white/5 rounded-xl border border-[#f0f0f0] dark:border-white/5 shadow-sm">
                            
                            {/* Custom Heading Dropdown */}
                            <div className="relative" ref={headingMenuRef}>
                                <button 
                                    onMouseDown={(e) => { e.preventDefault(); setShowHeadingMenu(!showHeadingMenu); }}
                                    className="flex items-center gap-2 bg-white dark:bg-white/5 hover:bg-[#fafafa] dark:hover:bg-white/10 px-3 py-2 rounded-lg border border-[#f0f0f0] dark:border-white/10 transition-all min-w-[100px]"
                                >
                                    <Type className="size-3 text-[#a3a3a3]" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-[#171717] dark:text-white">
                                        {headingOptions.find(opt => opt.value === activeBlock.toUpperCase())?.label || t('toolbar.normal')}
                                    </span>
                                    <ChevronDown className={cn("size-3 text-[#a3a3a3] transition-transform", showHeadingMenu && "rotate-180")} />
                                </button>

                                <AnimatePresence>
                                    {showHeadingMenu && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute left-0 bottom-full mb-2 z-[60] w-[200px] bg-white dark:bg-[#1a1a1a] rounded-2xl border border-[#f0f0f0] dark:border-white/10 shadow-2xl p-2"
                                        >
                                            <div className="space-y-1">
                                                {headingOptions.map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        onMouseDown={(e) => { e.preventDefault(); handleHeadingSelect(opt.value); }}
                                                        className={cn(
                                                            "w-full flex flex-col items-start px-3 py-2 rounded-xl transition-all text-left group",
                                                            activeBlock.toUpperCase() === opt.value ? "bg-admin-accent/5 text-admin-accent" : "hover:bg-[#fafafa] dark:hover:bg-white/5"
                                                        )}
                                                    >
                                                        <div className="flex items-center justify-between w-full">
                                                            <span className={cn(
                                                                "text-[10px] font-black uppercase tracking-widest",
                                                                activeBlock.toUpperCase() === opt.value ? "text-admin-accent" : "text-[#171717] dark:text-white"
                                                            )}>{opt.label}</span>
                                                            {activeBlock.toUpperCase() === opt.value && <Check className="size-3" />}
                                                        </div>
                                                        <span className="text-[8px] text-[#a3a3a3] font-medium leading-tight mt-0.5">{opt.desc}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="w-px h-4 bg-[#f0f0f0] dark:bg-white/10 mx-1" />
                            <ToolbarButton icon={Bold} onClick={() => execCmd('bold')} title="Bold" />
                            <ToolbarButton icon={Italic} onClick={() => execCmd('italic')} title="Italic" />
                            <ToolbarButton icon={Underline} onClick={() => execCmd('underline')} title="Underline" />
                            <ToolbarButton icon={Strikethrough} onClick={() => execCmd('strikeThrough')} title="Strikethrough" />
                            
                            <div className="w-px h-4 bg-[#f0f0f0] dark:bg-white/10 mx-1" />
                            <ToolbarButton icon={Eraser} onClick={() => execCmd('removeFormat')} title="Clear Formatting" />
                            <div className="w-px h-4 bg-[#f0f0f0] dark:bg-white/10 mx-1" />
                            
                            <ToolbarButton icon={List} onClick={() => execCmd('insertUnorderedList')} title="Bullet List" />
                            <ToolbarButton icon={ListOrdered} onClick={() => execCmd('insertOrderedList')} title="Numbered List" />
                            <div className="w-px h-4 bg-[#f0f0f0] dark:bg-white/10 mx-1" />
                            <ToolbarButton icon={LinkIcon} onClick={handleLinkClick} title={t('toolbar.link')} />
                        </div>
                    </div>
                    <div ref={contentRef} contentEditable className="blog-editor-content min-h-[400px] w-full bg-white dark:bg-white/10 border border-[#f5f5f5] dark:border-white/10 rounded-3xl p-8 text-base leading-relaxed outline-none focus:ring-1 focus:ring-admin-accent transition-all custom-scrollbar-thin font-medium" />
                </div>
            </div>
        </div>
    );
}

const ToolbarButton = ({ icon: Icon, onClick, title }: { icon: any, onClick: () => void, title: string }) => (
    <button type="button" onMouseDown={(e) => { e.preventDefault(); onClick(); }} title={title} className="p-2 hover:bg-white dark:hover:bg-white/10 hover:text-admin-accent text-[#a3a3a3] rounded-lg transition-all"><Icon className="size-4" /> </button>
);
