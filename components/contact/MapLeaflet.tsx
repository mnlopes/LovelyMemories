"use client";

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon missing in Leaflet + Next.js
// We are using a custom icon anyway, but good to have for safety
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: '',
    iconUrl: '',
    shadowUrl: '',
});

// Coordinates for Rua Dom Manuel II, 98, Porto
const POSITION: [number, number] = [41.1478338, -8.6223906];

const CustomMarkerIcon = L.divIcon({
    className: 'custom-leaflet-icon',
    html: `
        <div class="relative flex flex-col items-center -translate-x-1/2 -translate-y-full transform cursor-pointer group">
            <div class="w-14 h-14 bg-[#0a1128] rounded-full p-3 shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex items-center justify-center border-[3px] border-white relative z-20 group-hover:-translate-y-2 transition-transform duration-300 ease-out">
                <img 
                    src="/legacy/contact/images/icon.svg" 
                    alt="Lovely Memories" 
                    class="w-full h-full object-contain" 
                />
            </div>
            <div class="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-[#0a1128] -mt-[1px] relative z-10 group-hover:-translate-y-2 transition-transform duration-300 ease-out"></div>
            <div class="absolute -bottom-1 w-6 h-3 bg-black/30 rounded-[100%] blur-[4px] animate-pulse z-0 group-hover:scale-75 transition-transform duration-300"></div>
        </div >
    `,
    iconSize: [0, 0], // We handle sizing in CSS/HTML
    iconAnchor: [0, 0] // Centered via transform in HTML
});



// Internal component to handle popup closure via custom button
function PopupContent() {
    const map = useMap(); // Keeping hook if needed for future, or valid to remove if unused. 
    // Actually, if I remove the button, I don't need useMap here unless I want to do something else. 
    // But keeping it is harmless.
    return (
        <div className="text-center p-2 relative">
            <strong className="text-[#0a1128] text-lg block mb-1 mt-2">Lovely Memories</strong>
            <span className="text-gray-600 text-sm">Rua Dom Manuel II, 98<br />Porto, Portugal</span>
            <a
                href="https://www.google.com/maps/place/Lovely+Memories+Lda/@41.1478338,-8.6223906,17z/data=!3m1!4b1!4m6!3m5!1s0xd24650b0fa422df:0x5009d0b1a25391fd!8m2!3d41.1478338!4d-8.6223906!16s%2Fg%2F11l65_xsn_?entry=ttu"
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-3 text-[#B09E80] font-bold text-xs uppercase tracking-wider hover:underline"
            >
                Open in Google Maps
            </a>
        </div>
    );
}

export default function MapLeaflet() {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    return (
        <MapContainer
            key="contact-map-v23"
            center={POSITION}
            zoom={16}
            scrollWheelZoom={false}
            zoomControl={false}
            attributionControl={false}
            className="w-full h-full z-0"
            style={{ height: '100%', width: '100%', background: '#f1f1f1' }}
        >
            <TileLayer
                attribution=''
                url="https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png"
            />

            <ZoomControl position="bottomright" />

            <Marker position={POSITION} icon={CustomMarkerIcon}>
                <Popup
                    className="custom-popup font-sans"
                    autoPanPadding={[50, 50]}
                    closeButton={false}
                >
                    <PopupContent />
                </Popup>
            </Marker>
        </MapContainer>
    );
}
