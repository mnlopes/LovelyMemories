"use client";

import { useState, useRef } from "react";
import { CheckCircle2, X, Loader2, ArrowRight, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { submitAirbnbCSV } from "@/app/actions/airbnb-import";
import Papa from "papaparse";
import { useRouter } from "next/navigation";
import { getPropertiesOptions } from "@/app/actions/property";
import { useEffect } from "react";
import { format } from "date-fns";
import { PropertySearchSelect } from './PropertySearchSelect';

export default function ImportUploadZone() {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [properties, setProperties] = useState<{id: string, title: any, airbnb_listing_name?: string}[]>([]);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
    const [isAutoDetected, setIsAutoDetected] = useState(false);
    const [detectedPeriod, setDetectedPeriod] = useState<string>("");

    const [detectedMonth, setDetectedMonth] = useState<number | null>(null);
    const [detectedYear, setDetectedYear] = useState<number | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const isSubmittingRef = useRef(false);
    const router = useRouter();

    useEffect(() => {
        getPropertiesOptions().then(props => {
            console.log("Fetched properties:", props.length);
            setProperties(props);
            // Don't auto-select first one if we want auto-detection to work cleanly
        }).catch(err => {
            console.error("Error fetching properties:", err);
            toast.error("Failed to load properties list.");
        });
    }, []);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type === "text/csv") {
            handleFileSelection(droppedFile);
        } else {
            toast.error("Please upload a valid CSV file");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            handleFileSelection(selectedFile);
        }
    };

    const handleFileSelection = (f: File) => {
        setFile(f);
        setIsAutoDetected(false);
        Papa.parse(f, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const rows = results.data as any[];
                const reservations = rows.filter(row => row.Type === "Reservation" && row["Confirmation code"]);
                setPreviewData(reservations);
                
                // 1. Detect Property from "Listing" column
                if (reservations.length > 0) {
                    const listingName = reservations[0]["Listing"];
                    if (listingName) {
                        const matched = properties.find(p => p.airbnb_listing_name === listingName);
                        if (matched) {
                            setSelectedPropertyId(matched.id);
                            setIsAutoDetected(true);
                            toast.success(`Propriedade detetada: ${matched.title?.pt || matched.title?.en || "Sucesso"}`);
                        }
                    }
                }

                // 2. Detect Month/Year from first reservation
                if (reservations.length > 0) {
                    const firstDateStr = reservations[0]["Start date"]; // Format MM/DD/YYYY
                    const dateParts = firstDateStr.split('/');
                    if (dateParts.length === 3) {
                        const month = parseInt(dateParts[0]);
                        const year = parseInt(dateParts[2]);
                        setDetectedMonth(month);
                        setDetectedYear(year);
                        
                        const date = new Date(year, month - 1, 1);
                        const monthName = date.toLocaleString('pt-PT', { month: 'long' });
                        const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                        setDetectedPeriod(`${capitalizedMonth} ${year}`);
                    }
                }

                if (reservations.length === 0) {
                    toast.error("No valid reservation payouts found in this CSV.");
                }
            },
            error: () => {
                toast.error("Failed to read CSV preview");
            }
        });
    };

    const handleUpload = async () => {
        if (!file || !selectedPropertyId) {
            toast.error("Please select a property first.");
            return;
        }

        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("propertyId", selectedPropertyId);
        if (detectedMonth) formData.append("targetMonth", detectedMonth.toString());
        if (detectedYear) formData.append("targetYear", detectedYear.toString());

        try {
            const res = await submitAirbnbCSV(formData);
            
            if (res.success) {
                toast.success(`Successfully imported ${res.imported} reservations!`);
                clearPreview();
                router.refresh(); // refresh history table
            } else {
                toast.error(res.error || "Failed to import CSV");
            }
        } catch (error: any) {
            toast.error(error.message || "An unexpected error occurred");
        } finally {
            setIsUploading(false);
            isSubmittingRef.current = false;
        }
    };

    const clearPreview = () => {
        setFile(null);
        setPreviewData([]);
        setDetectedPeriod("");
        setDetectedMonth(null);
        setDetectedYear(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="flex flex-col gap-6">
            {!file ? (
                <>
                    <input 
                        type="file" 
                        accept=".csv" 
                        className="hidden" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                    />
                    
                    <div 
                        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${isDragging ? 'border-admin-accent bg-admin-accent/5' : 'border-[#e5e5e5] dark:border-admin-dark-border hover:bg-[#f9faf9] dark:hover:bg-white/5'}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <UploadCloud className={`size-10 mb-4 ${isDragging ? 'text-admin-accent' : 'text-[#a3a3a3]'}`} />
                        <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary mb-1">
                            Drag and drop your Airbnb Earnings CSV here
                        </h3>
                        <p className="text-sm font-medium text-[#a3a3a3]">
                            Or click to browse from your computer
                        </p>
                    </div>
                </>
            ) : (
                <div className="bg-white dark:bg-admin-dark-surface border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                                <CheckCircle2 className="size-6 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-[#171717] dark:text-admin-dark-text-primary">
                                    {file.name} 
                                    {detectedPeriod && <span className="ml-2 text-admin-accent bg-admin-accent/10 px-2 py-0.5 rounded text-xs uppercase tracking-tighter align-middle">{detectedPeriod}</span>}
                                </h3>
                                <p className="text-sm text-[#a3a3a3]">{(file.size / 1024).toFixed(1)} KB • {previewData.length} Valid Payouts</p>
                            </div>
                        </div>
                        <button 
                            onClick={clearPreview}
                            className="p-2 text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <X className="size-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-bold text-[#a3a3a3] uppercase tracking-wider">Assign to Property</label>
                                {isAutoDetected && (
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-tighter animate-pulse">
                                        Detected Automatically
                                    </span>
                                )}
                            </div>
                            <PropertySearchSelect 
                                properties={properties}
                                selectedId={selectedPropertyId}
                                onSelect={(id) => {
                                    setSelectedPropertyId(id);
                                    setIsAutoDetected(false); // Reset auto-detect if user manually changes
                                }}
                            />
                            <p className="text-xs text-[#a3a3a3] mt-2">All reservations in this file will be injected under this single property.</p>
                        </div>
                    </div>
                    
                    {previewData.length > 0 && (
                        <div className="border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl overflow-hidden mb-6 shadow-sm">
                            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left text-[10px]">
                                    <thead className="bg-admin-bg/40 dark:bg-admin-dark-bg/50 px-4 py-3 sticky top-0 z-20">
                                        <tr className="border-b border-[#f5f5f5] dark:border-admin-dark-border">
                                            <th className="px-4 py-3 font-bold text-[#a3a3a3] uppercase tracking-widest w-[120px]">Code</th>
                                            <th className="px-4 py-3 font-bold text-[#a3a3a3] uppercase tracking-widest">Guest</th>
                                            <th className="px-4 py-3 font-bold text-[#a3a3a3] uppercase tracking-widest text-center">Check-in</th>
                                            <th className="px-4 py-3 font-bold text-[#a3a3a3] uppercase tracking-widest text-center">Check-out</th>
                                            <th className="px-4 py-3 font-bold text-[#a3a3a3] uppercase tracking-widest text-right">Gross</th>
                                            <th className="px-4 py-3 font-bold text-[#a3a3a3] uppercase tracking-widest text-right">Fee</th>
                                            <th className="px-4 py-3 font-bold text-[#a3a3a3] uppercase tracking-widest text-right">Net</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#f5f5f5] dark:divide-admin-dark-border bg-white dark:bg-admin-dark-surface">
                                        {previewData.slice(0, 50).map((row, idx) => {
                                            // Helper to match the backend date logic for preview
                                            const startDate = new Date(row["Start date"]);
                                            const nights = parseInt(row["Nights"] || "0", 10);
                                            const endDate = new Date(startDate);
                                            if (!isNaN(endDate.getTime())) {
                                                endDate.setDate(endDate.getDate() + nights);
                                            }

                                            return (
                                                <tr key={idx} className="hover:bg-admin-bg/10 dark:hover:bg-white/5 transition-colors">
                                                    <td className="px-4 py-3 font-mono font-bold text-[#171717] dark:text-admin-dark-text-primary">{row["Confirmation code"]}</td>
                                                    <td className="px-4 py-3 font-semibold text-[#171717] dark:text-admin-dark-text-primary">{row["Guest"]}</td>
                                                    <td className="px-4 py-3 text-center text-[#a3a3a3] font-medium">{row["Start date"]}</td>
                                                    <td className="px-4 py-3 text-center text-[#a3a3a3] font-medium">
                                                        {!isNaN(endDate.getTime()) ? format(endDate, 'MM/dd/yyyy') : '---'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium text-[#171717] dark:text-admin-dark-text-primary">{row["Amount"]}</td>
                                                    <td className="px-4 py-3 text-right font-medium text-red-500/80">{row["Service fee"] || "0.00"}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{row["Amount"]}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {previewData.length > 50 && (
                                <div className="p-3 bg-[#fafafa] dark:bg-admin-dark-bg text-center text-xs font-semibold text-[#a3a3a3]">
                                    + {previewData.length - 50} more records
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-3">
                        <button 
                            className="px-6 py-2.5 rounded-lg font-bold text-sm bg-[#f4f7f4] dark:bg-white/5 text-[#171717] dark:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            onClick={clearPreview}
                            disabled={isUploading}
                        >
                            Cancel
                        </button>
                        <button 
                            className={`px-8 py-2.5 rounded-lg font-bold text-sm text-white transition-all flex items-center gap-2 shadow-sm ${!isUploading && previewData.length > 0 && selectedPropertyId ? 'bg-black dark:bg-admin-accent hover:opacity-90' : 'bg-[#e5e5e5] dark:bg-[#333] text-[#a3a3a3] cursor-not-allowed hidden'}`}
                            onClick={handleUpload}
                            disabled={isUploading || previewData.length === 0 || !selectedPropertyId}
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Processing Batch...
                                </>
                            ) : (
                                <>
                                    Confirm & Import <ArrowRight className="size-4" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
