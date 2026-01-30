"use client";

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet map to avoid SSR issues with 'window'
const MapLeaflet = dynamic(() => import('./MapLeaflet'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center animate-pulse">
            <span className="text-gray-400 font-light tracking-widest">LOADING MAP...</span>
        </div>
    )
});

export default function ContactMap() {
    return (
        <div className="w-full h-[500px] md:h-[600px] bg-gray-100 relative group z-0">
            <MapLeaflet />
        </div>
    );
}
