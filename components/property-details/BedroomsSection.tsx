"use client";

import { useState } from "react";
import { Bed, Bath, ChevronRight, Ruler, ShowerHead, Toilet, Baby, Maximize, Sofa, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";

interface Room {
    name: string;
    type: "bedroom" | "bathroom" | "communal" | "other";
    image: string;
    details: string;
    beds?: string;
    bedCount?: number;
    bedType?: "double" | "single" | "sofa";
    isEnsuite?: boolean;
    amenities?: string[];
}

interface BedroomsSectionProps {
    propertyId: string;
    bedrooms: number;
    beds: number;
    bathrooms: number;
    rooms?: Room[];
}

// Helper component to render bed icons based on count and type
function BedIcons({ count = 1, type = "double" }: { count?: number; type?: "double" | "single" | "sofa" }) {
    const icons = [];
    const IconComponent = type === "sofa" ? Sofa : Bed;

    for (let i = 0; i < count; i++) {
        icons.push(
            <IconComponent
                key={i}
                className="h-5 w-5 text-navy-900/30"
                strokeWidth={1.5}
            />
        );
    }

    return <div className="flex items-center gap-2">{icons}</div>;
}

export function BedroomsSection({ propertyId, bedrooms, beds, bathrooms, rooms = [] }: BedroomsSectionProps) {
    const t = useTranslations('PropertyDetail');
    const tp = useTranslations('Properties');
    const [floorPlanOpen, setFloorPlanOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<Room & { index?: number } | null>(null);
    const [showBedGuide, setShowBedGuide] = useState(false);

    // Localized data access for rooms
    const localizedRooms = (tp.raw(`${propertyId}.rooms`) as { name: string, details: string, beds?: string }[] | undefined);

    const getLocalizedRoom = (room: Room, index: number) => {
        if (!localizedRooms || !localizedRooms[index]) return room;
        return {
            ...room,
            name: localizedRooms[index].name,
            details: localizedRooms[index].details,
            beds: localizedRooms[index].beds || room.beds
        };
    };

    const displayRooms = rooms.map((room, index) => getLocalizedRoom(room, index));
    const bedroomsList = displayRooms.filter(r => r.type === "bedroom");
    const bathroomsList = displayRooms.filter(r => r.type === "bathroom");
    const communalRooms = displayRooms.filter(r => r.type === "communal");
    const otherRooms = displayRooms.filter(r => r.type === "other");

    return (
        <>
            <section className="py-10 border-t border-[#E1E6EC]">
                <h3 className="text-xl font-bold mb-8 text-navy-950 font-serif">{t('bedroomsBathrooms') || "Bedrooms & bathrooms"}</h3>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <div className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-[#E1E6EC] shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                            <Bed className="h-6 w-6 text-[#B08D4A]" />
                        </div>
                        <div>
                            <p className="font-bold text-navy-950 text-lg">{bedrooms} {t('bedroomsCount', { count: bedrooms })}</p>
                            <p className="text-sm text-navy-900/50 font-medium">{beds} {t('bedsCount', { count: beds })}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-[#E1E6EC] shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                            <Bath className="h-6 w-6 text-[#B08D4A]" />
                        </div>
                        <div>
                            <p className="font-bold text-navy-950 text-lg">{bathrooms} {t('bathroomsCount', { count: bathrooms })}</p>
                            <p className="text-sm text-navy-900/50 font-medium">{t('enSuite') || "En-suite"}</p>
                        </div>
                    </div>
                </div>

                {/* Room Images Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {displayRooms.slice(0, 4).map((room, index) => (
                        <button
                            key={index}
                            onClick={() => setSelectedRoom({ ...room, index })}
                            className="group relative aspect-[4/5] rounded-2xl overflow-hidden cursor-pointer shadow-sm"
                        >
                            <img
                                src={room.image}
                                alt={room.name}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&q=80"; // Luxury interior fallback
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                            <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                                <p className="text-white text-sm font-bold mb-1 line-clamp-1">{room.name}</p>
                                <p className="text-white/70 text-[10px] uppercase tracking-widest font-bold truncate">
                                    {room.beds || (room.type === 'bathroom' ? t('bedrooms.luxuryBath') : t('bedrooms.socialArea'))}
                                </p>
                            </div>
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                                <div className="w-9 h-9 rounded-full bg-white shadow-xl flex items-center justify-center text-navy-950">
                                    <Maximize className="h-4 w-4" />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                <Button
                    variant="outline"
                    className="gap-2 rounded-xl h-12 px-6 border-gray-200 text-navy-950 font-bold hover:bg-gray-50 transition-colors"
                    onClick={() => setFloorPlanOpen(true)}
                >
                    {t('viewFloorPlan') || "View floor plan"}
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </section>

            {/* Room Detail Modal */}
            <AnimatePresence>
                {selectedRoom && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedRoom(null)}
                            className="fixed inset-0 z-[200] bg-navy-950/40 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="fixed inset-x-4 top-[15%] bottom-[15%] lg:inset-auto lg:left-1/2 lg:top-[140px] lg:-translate-x-1/2 lg:w-[840px] lg:h-auto z-[210] bg-white rounded-[32px] overflow-hidden shadow-2xl flex flex-col lg:flex-row shadow-[#0a1128]/20"
                        >
                            <button
                                onClick={() => setSelectedRoom(null)}
                                className="absolute top-5 right-5 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur shadow-lg flex items-center justify-center text-navy-950 hover:scale-110 hover:bg-white transition-all border border-gray-100"
                            >
                                <X className="h-4 w-4" />
                            </button>

                            <div className="w-full lg:w-[55%] aspect-video lg:aspect-auto relative bg-gray-100">
                                <img
                                    src={selectedRoom.image}
                                    alt={selectedRoom.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            <div className="flex-1 p-8 lg:p-10 flex flex-col justify-center">
                                <div className="mb-6 text-left">
                                    <span className="inline-block px-3 py-1 bg-gray-50 text-navy-900/40 text-[10px] font-bold uppercase tracking-widest rounded-full border border-gray-100 mb-3">
                                        {selectedRoom.type === 'bedroom' ? (t('bedrooms.sleepingAreas') || 'Sleeping Area') : (t('bedrooms.bathingAreas') || 'Bathing Area')}
                                    </span>
                                    <h2 className="text-2xl font-bold text-navy-950 font-serif mb-3 leading-tight">{selectedRoom.name}</h2>
                                    <p className="text-navy-900/60 text-sm leading-relaxed">{selectedRoom.details}</p>
                                </div>

                                <div className="space-y-3 pt-5 border-t border-gray-100 text-left">
                                    {selectedRoom.beds && (
                                        <div className="flex items-center gap-3 text-navy-950">
                                            <div className="w-9 h-9 rounded-full bg-[#B08D4A]/5 border border-[#B08D4A]/10 flex items-center justify-center">
                                                < Bed className="h-4 w-4 text-[#B08D4A]" />
                                            </div>
                                            <span className="font-bold text-sm">{selectedRoom.beds}</span>
                                        </div>
                                    )}
                                    {selectedRoom.isEnsuite && (
                                        <div className="flex items-center gap-3 text-navy-950">
                                            <div className="w-9 h-9 rounded-full bg-[#B08D4A]/5 border border-[#B08D4A]/10 flex items-center justify-center">
                                                < Bath className="h-4 w-4 text-[#B08D4A]" />
                                            </div>
                                            <span className="font-bold text-sm">{t('bedrooms.ensuiteBathroom')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Floor Plan Modal - Plum Guide Style */}
            <AnimatePresence>
                {floorPlanOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setFloorPlanOpen(false)}
                            className="fixed inset-0 z-[200] bg-navy-950/40 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            className="fixed inset-x-0 bottom-0 top-[12%] lg:inset-x-auto lg:left-1/2 lg:-translate-x-1/2 lg:top-[120px] lg:bottom-12 lg:w-[1000px] lg:max-w-[95vw] z-[210] bg-white rounded-t-[32px] lg:rounded-[32px] overflow-hidden shadow-2xl shadow-[#0a1128]/20 flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-7 lg:p-8 border-b border-gray-100 bg-white z-10 text-left">
                                <div>
                                    <h2 className="text-2xl font-bold text-navy-950 font-serif">{t('bedroomsBathrooms')}</h2>
                                    <p className="text-navy-900/40 text-xs font-medium">{t('bedrooms.detailedSleeping')}</p>
                                </div>
                                <button
                                    onClick={() => setFloorPlanOpen(false)}
                                    className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-navy-950 hover:bg-gray-100 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto p-7 lg:p-10 luxury-scrollbar text-left">
                                {/* Size Guide Toggle */}
                                <div className="mb-8">
                                    <button
                                        onClick={() => setShowBedGuide(!showBedGuide)}
                                        className="flex items-center gap-3 text-[#B08D4A] hover:underline font-bold text-[10px] uppercase tracking-widest bg-[#B08D4A]/5 px-4 py-2 rounded-full transition-all"
                                    >
                                        <Ruler className="h-3.5 w-3.5" />
                                        {t('bedrooms.bedSizeGuide')}
                                    </button>

                                    <AnimatePresence>
                                        {showBedGuide && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="mt-4 p-6 bg-gray-50 rounded-2xl border border-gray-100 grid grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                                                    <div>
                                                        <p className="font-bold text-navy-950 mb-1">{t('bedrooms.single')}</p>
                                                        <p className="text-navy-900/40">90 x 190 cm</p>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-navy-950 mb-1">{t('bedrooms.double')}</p>
                                                        <p className="text-navy-900/40">140 x 190 cm</p>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-navy-950 mb-1">{t('bedrooms.king')}</p>
                                                        <p className="text-navy-900/40">160 x 200 cm</p>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-navy-950 mb-1">{t('bedrooms.superKing')}</p>
                                                        <p className="text-navy-900/40">180 x 200 cm</p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Section: Sleeping Areas */}
                                <div className="mb-12">
                                    <h3 className="text-[10px] font-bold text-navy-900/40 uppercase tracking-[0.2em] mb-6 flex items-center gap-4">
                                        <span>{t('bedrooms.sleepingAreas')}</span>
                                        <div className="h-px flex-1 bg-gray-100" />
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {bedroomsList.map((room, index) => (
                                            <div
                                                key={index}
                                                className="group border border-gray-100 rounded-3xl p-6 hover:border-[#B08D4A]/30 hover:shadow-xl hover:shadow-[#B08D4A]/5 transition-all cursor-pointer bg-white relative overflow-hidden"
                                                onClick={() => { setFloorPlanOpen(false); setSelectedRoom({ ...room, index: rooms.indexOf(room) }); }}
                                            >
                                                <div className="absolute top-0 left-0 w-1 h-full bg-[#B08D4A] transform -translate-x-full group-hover:translate-x-0 transition-transform" />
                                                <h4 className="font-bold text-lg text-navy-950 mb-1">{room.name}</h4>
                                                <p className="text-[#B08D4A] text-sm font-bold mb-8">{room.beds || "1 double bed"}</p>
                                                <BedIcons count={room.bedCount || 1} type={room.bedType || "double"} />
                                            </div>
                                        ))}

                                        {communalRooms.map((room, index) => (
                                            <div
                                                key={`communal-${index}`}
                                                className="group border border-gray-100 rounded-3xl p-6 hover:border-[#B08D4A]/30 hover:shadow-xl hover:shadow-[#B08D4A]/5 transition-all cursor-pointer bg-white relative overflow-hidden"
                                                onClick={() => { setFloorPlanOpen(false); setSelectedRoom({ ...room, index: rooms.indexOf(room) }); }}
                                            >
                                                <div className="absolute top-0 left-0 w-1 h-full bg-[#B08D4A] transform -translate-x-full group-hover:translate-x-0 transition-transform" />
                                                <h4 className="font-bold text-lg text-navy-950 mb-1">{room.name}</h4>
                                                <p className="text-[#B08D4A] text-sm font-bold mb-8">{room.beds || room.details}</p>
                                                <BedIcons count={room.bedCount || 1} type="sofa" />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Section: Bathing Areas */}
                                <div>
                                    <h3 className="text-[10px] font-bold text-navy-900/40 uppercase tracking-[0.2em] mb-6 flex items-center gap-4">
                                        <span>{t('bedrooms.bathingAreas')}</span>
                                        <div className="h-px flex-1 bg-gray-100" />
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {bathroomsList.map((room, index) => (
                                            <div
                                                key={index}
                                                className="group border border-gray-100 rounded-3xl p-6 hover:border-[#B08D4A]/30 hover:shadow-xl hover:shadow-[#B08D4A]/5 transition-all cursor-pointer bg-white relative overflow-hidden"
                                                onClick={() => { setFloorPlanOpen(false); setSelectedRoom({ ...room, index: rooms.indexOf(room) }); }}
                                            >
                                                <div className="absolute top-0 left-0 w-1 h-full bg-[#B08D4A] transform -translate-x-full group-hover:translate-x-0 transition-transform" />
                                                <div className="flex items-start justify-between mb-2">
                                                    <h4 className="font-bold text-lg text-navy-950">{room.name}</h4>
                                                    <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider ${room.isEnsuite !== false
                                                        ? 'bg-[#B08D4A]/10 text-[#B08D4A]'
                                                        : 'bg-navy-950 text-white'
                                                        }`}>
                                                        {room.isEnsuite !== false ? t('bedrooms.ensuite') : t('bedrooms.separate')}
                                                    </span>
                                                </div>
                                                <p className="text-navy-900/40 text-sm font-medium mb-8 pr-4">{room.details || "Walk in shower, Toilet"}</p>
                                                <div className="flex items-center gap-4">
                                                    <ShowerHead className="h-5 w-5 text-navy-900/30" strokeWidth={1.5} />
                                                    <Toilet className="h-5 w-5 text-navy-900/30" strokeWidth={1.5} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Other info */}
                                <div className="mt-12 p-8 bg-gray-50 rounded-[32px] border border-gray-100 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                                    <div className="w-16 h-16 rounded-2xl bg-[#B08D4A]/10 flex items-center justify-center text-[#B08D4A] mx-auto md:mx-0">
                                        <Baby className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-navy-950 text-xl mb-1">{t('bedrooms.travelingWithChildren')}</h4>
                                        <p className="text-navy-900/40 font-medium">{t('bedrooms.babyCotInfo')}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

        </>
    );
}
