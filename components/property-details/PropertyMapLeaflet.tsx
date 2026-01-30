"use client";

import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon missing in Leaflet + Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: '',
    iconUrl: '',
    shadowUrl: '',
});

interface PropertyMapLeafletProps {
    coordinates: [number, number];
    address: string;
    destinationCoordinates?: [number, number] | null;
}

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
    iconSize: [0, 0],
    iconAnchor: [0, 0]
});

// Destination marker icon (simpler dot)
const DestinationIcon = L.divIcon({
    className: 'destination-icon',
    html: `<div class="w-4 h-4 rounded-full bg-[#0a1128] border-2 border-white shadow-md"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
});

// Component to handle map bounds
function MapBounds({ coordinates, destination }: { coordinates: [number, number], destination?: [number, number] | null }) {
    const map = useMap();

    useEffect(() => {
        if (destination) {
            const bounds = L.latLngBounds([coordinates, destination]);
            map.fitBounds(bounds, { padding: [50, 50] });
        } else {
            map.setView(coordinates, 16);
        }
    }, [destination, coordinates, map]);

    return null;
}

export default function PropertyMapLeaflet({ coordinates, address, destinationCoordinates }: PropertyMapLeafletProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    return (
        <MapContainer
            key={`map-${coordinates[0]}-${coordinates[1]}`}
            center={coordinates}
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

            <MapBounds coordinates={coordinates} destination={destinationCoordinates} />

            <Marker position={coordinates} icon={CustomMarkerIcon} zIndexOffset={100}>
                <Popup
                    className="custom-popup font-sans"
                    autoPanPadding={[50, 50]}
                    closeButton={false}
                >
                    <div className="text-center p-2 relative">
                        <strong className="text-[#0a1128] text-lg block mb-1 mt-2">Lovely Memories</strong>
                        <span className="text-gray-600 text-sm whitespace-pre-line">{address}</span>
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${coordinates[0]},${coordinates[1]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block mt-3 text-[#B09E80] font-bold text-xs uppercase tracking-wider hover:underline"
                        >
                            Open in Google Maps
                        </a>
                    </div>
                </Popup>
            </Marker>

            {destinationCoordinates && (
                <>
                    <Marker position={destinationCoordinates} icon={DestinationIcon} />
                    <Polyline
                        positions={[coordinates, destinationCoordinates]}
                        pathOptions={{
                            color: '#0a1128',
                            weight: 3,
                            dashArray: '10, 10',
                            opacity: 0.8
                        }}
                    />
                </>
            )}
        </MapContainer>
    );
}
