'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Property {
    id: string;
    title: any;
    airbnb_listing_name?: string;
}

interface PropertySearchSelectProps {
    properties: Property[];
    selectedId: string;
    onSelect: (id: string) => void;
    className?: string;
    placeholder?: string;
    showAllOption?: boolean;
    variant?: 'normal' | 'compact';
}

export function PropertySearchSelect({ 
    properties, 
    selectedId, 
    onSelect, 
    className,
    placeholder = "Select the property...",
    showAllOption = false,
    variant = 'normal'
}: PropertySearchSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter properties based on search query
    const filteredProperties = useMemo(() => {
        let list = properties;
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            list = properties.filter(p => {
                const name = (p.title?.en || p.title?.pt || "").toLowerCase();
                return name.includes(query);
            });
        }
        return list;
    }, [properties, searchQuery]);

    // Find the currently selected property object
    const selectedProperty = useMemo(() => 
        properties.find(p => p.id === selectedId), 
    [properties, selectedId]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Clear search when opening
    useEffect(() => {
        if (isOpen) setSearchQuery('');
    }, [isOpen]);

    return (
        <div ref={containerRef} className={cn("relative w-full", className)}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center justify-between w-full bg-white dark:bg-admin-dark-bg border transition-all duration-200 text-left",
                    variant === 'compact' ? "px-3 py-1.5 rounded-lg text-sm font-medium min-w-[200px]" : "px-4 py-3 rounded-xl",
                    isOpen 
                        ? "border-admin-accent ring-2 ring-admin-accent/5" 
                        : "border-[#f5f5f5] dark:border-admin-dark-border hover:border-admin-accent/50",
                    !selectedProperty && "text-[#a3a3a3]"
                )}
            >
                <span className="truncate">
                    {selectedProperty ? (selectedProperty.title?.en || selectedProperty.title?.pt || "Unnamed") : placeholder}
                </span>
                <ChevronDown className={cn("shrink-0 size-4 text-[#a3a3a3] transition-transform duration-200", isOpen && "rotate-180")} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 w-full mt-2 bg-white dark:bg-admin-dark-surface border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl shadow-xl overflow-hidden min-w-[250px]"
                    >
                        {/* Search Input */}
                        <div className="sticky top-0 p-3 bg-white dark:bg-admin-dark-surface border-b border-[#f5f5f5] dark:border-admin-dark-border">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#a3a3a3]" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search properties..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-sm bg-[#f9f9f9] dark:bg-admin-dark-bg border-none rounded-lg focus:ring-1 focus:ring-admin-accent outline-none"
                                    onClick={(e) => e.stopPropagation()}
                                />
                                {searchQuery && (
                                    <button 
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2"
                                    >
                                        <X className="size-3 text-[#a3a3a3]" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* List */}
                        <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                            {showAllOption && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onSelect("");
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg transition-colors text-left",
                                        selectedId === "" 
                                            ? "bg-admin-accent/10 text-admin-accent font-medium" 
                                            : "text-[#404040] dark:text-admin-dark-text-secondary hover:bg-[#f5f5f5] dark:hover:bg-white/5"
                                    )}
                                >
                                    <span className="truncate">All Properties</span>
                                    {selectedId === "" && <Check className="size-4 shrink-0" />}
                                </button>
                            )}
                            
                            {filteredProperties.length > 0 ? (
                                filteredProperties.map((p) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                            onSelect(p.id);
                                            setIsOpen(false);
                                        }}
                                        className={cn(
                                            "flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg transition-colors text-left",
                                            selectedId === p.id 
                                                ? "bg-admin-accent/10 text-admin-accent font-medium" 
                                                : "text-[#404040] dark:text-admin-dark-text-secondary hover:bg-[#f5f5f5] dark:hover:bg-white/5"
                                        )}
                                    >
                                        <span className="truncate">{p.title?.en || p.title?.pt || "Unnamed"}</span>
                                        {selectedId === p.id && <Check className="size-4 shrink-0" />}
                                    </button>
                                ))
                            ) : (
                                !showAllOption && (
                                    <div className="px-4 py-8 text-center">
                                        <p className="text-sm text-[#a3a3a3]">No properties matching "{searchQuery}"</p>
                                    </div>
                                )
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
