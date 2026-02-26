"use client";

import { useEffect, useState, useMemo, Fragment } from "react";
import { MapContainer, TileLayer, GeoJSON, Tooltip as MapTooltip, useMap, ZoomControl, Marker, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

// Leaflet CSS fix for Next.js
import L from "leaflet";

// Fix generic marker icon issues if needed (though we use GeoJSON mostly)
const iconRetinaUrl = "/leaflet/marker-icon-2x.png";
const iconUrl = "/leaflet/marker-icon.png";
const shadowUrl = "/leaflet/marker-shadow.png";

// We don't need markers for this map, but good to have setup just in case.

interface DemographicsMapProps {
    data: { name: string; count: number; visitors?: number }[];
    className?: string;
}

export function DemographicsMap({ data, className }: DemographicsMapProps) {
    const [geoJsonData, setGeoJsonData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeMarkers, setActiveMarkers] = useState<{ lat: number; lng: number; count: number; name: string }[]>([]);

    useEffect(() => {
        // Fetch the world GeoJSON
        fetch("/data/world-countries.json")
            .then((res) => res.json())
            .then((data) => {
                setGeoJsonData(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Failed to load map data", err);
                setLoading(false);
            });
    }, []);

    // Helper to get visitor count for a country
    const getCountryStats = (countryName: string) => {
        const found = data.find((d) => d.name.toLowerCase() === countryName.toLowerCase() ||
            (d.name === "United States" && countryName === "United States of America"));
        return found || { count: 0, visitors: 0 };
    };

    // Calculate active markers when data or geoJson changes
    useEffect(() => {
        if (!geoJsonData || !data) return;

        const markers: { lat: number; lng: number; count: number; name: string }[] = [];

        // This is a lightweight operation for ~200 countries
        geoJsonData.features.forEach((feature: any) => {
            const { count, visitors } = getCountryStats(feature.properties.name);
            // Only show pulsing marker if there are ACTIVE visitors
            if ((visitors || 0) > 0) {
                try {
                    // Use Leaflet's bounds logic to find visual center
                    const layer = L.geoJSON(feature);
                    const center = layer.getBounds().getCenter();
                    markers.push({
                        lat: center.lat,
                        lng: center.lng,
                        count,
                        name: feature.properties.name
                    });
                } catch (e) {
                    console.warn("Could not calculate center for", feature.properties.name);
                }
            }
        });

        setActiveMarkers(markers);
    }, [geoJsonData, data]);

    // Calculate max for scaling
    const maxCount = Math.max(...data.map((d) => d.count), 1);

    // Style function for GeoJSON
    const style = (feature: any) => {
        const { count } = getCountryStats(feature.properties.name);

        // Color scale: Dark (0) -> Bright (Max)
        // Using a violet/blue theme to match "Devices" chart in screenshot (blue arc)
        // or the specific colored dots aesthetic.
        // Let's go with a professional "Cyber" look: Dark base, Blue/Cyan intensity.

        const intensity = count > 0 ? 0.2 + (count / maxCount) * 0.8 : 0;

        return {
            fillColor: count > 0
                ? `rgba(59, 130, 246, ${intensity})` // Blue-500 equivalent with opacity
                : "#1f1f1f", // Very dark gray for no data
            weight: 0.5,
            opacity: 1,
            color: "#333", // Border color
            dashArray: "3",
            fillOpacity: count > 0 ? 0.7 : 0.3,
        };
    };

    const onEachFeature = (feature: any, layer: L.Layer) => {
        const { count, visitors } = getCountryStats(feature.properties.name);

        layer.on({
            mouseover: (e) => {
                const layer = e.target;
                layer.setStyle({
                    weight: 2,
                    color: '#60a5fa', // Blue-400
                    fillOpacity: 0.9,
                    dashArray: ''
                });
                layer.bringToFront();
            },
            mouseout: (e) => {
                const layer = e.target;
                // create a mock feature object to pass to style function
                // or simpler: ensure we revert to original style
                layer.setStyle(style(feature));
            },
            click: (e) => {
                const map = e.target._map;
                map.fitBounds(e.target.getBounds());
            }
        });

        if (feature.properties && feature.properties.name) {
            layer.bindTooltip(`
                <div class="px-3 py-2">
                    <div class="text-[10px] uppercase tracking-wider text-white/50 font-bold mb-0.5">${feature.properties.name}</div>
                    <div class="flex items-center gap-3">
                        <div class="text-xs font-bold ${count > 0 ? 'text-blue-400' : 'text-white'}">
                            ${count > 0 ? count : 0} <span class="text-[9px] text-white/40 font-normal uppercase">Requests</span>
                        </div>
                         ${(visitors || 0) > 0 ? `
                        <div class="w-px h-3 bg-white/10"></div>
                        <div class="text-xs font-bold text-emerald-400">
                             ${visitors} <span class="text-[9px] text-white/40 font-normal uppercase">Visitors</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `, {
                permanent: false,
                sticky: true, // Fix: Follow mouse and ensure auto-close
                direction: "top",
                className: "custom-map-tooltip",
                opacity: 1,
                offset: [0, -10]
            });
        }
    };

    const pulseIcon = L.divIcon({
        className: 'pulse-icon',
        html: `
            <div class="pulse-container">
                <div class="pulse-ring"></div>
                <div class="pulse-dot"></div>
            </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    // Server Location (e.g. Lisbon - User's approximate location based on language/context)
    const SERVER_LAT = 38.7223;
    const SERVER_LNG = -9.1393;

    if (loading) {
        return <div className={cn("flex items-center justify-center bg-[#111] rounded-2xl animate-pulse text-white/20 text-xs font-bold uppercase tracking-widest", className)}>Loading Map...</div>;
    }

    if (!geoJsonData) {
        return <div className={cn("flex items-center justify-center bg-[#111] rounded-2xl text-red-500/50 text-xs font-bold uppercase tracking-widest", className)}>Map Data Unavailable</div>;
    }

    return (
        <div className={cn("relative z-0 overflow-hidden rounded-2xl bg-[#111] border border-white/5 shadow-2xl group", className)}>
            <div className="absolute top-4 left-4 z-[400] pointer-events-none">
                <div className="flex items-center gap-2 mb-1">
                    <div className="size-2 rounded-full bg-blue-500 animate-pulse"></div>
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Live Demographics</span>
                </div>
                <p className="text-[10px] text-white/20 italic">Hover to inspect regions</p>
            </div>

            <MapContainer
                center={[20, 0] as [number, number]}
                zoom={1.5}
                scrollWheelZoom={false}
                className="h-full w-full bg-[#111]"
                attributionControl={false}
                zoomControl={false} // Disable default zoom control
                dragging={true}
                doubleClickZoom={true}
            >
                {/* Dark Matter Tile Layer */}
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
                />

                <GeoJSON
                    key={JSON.stringify(data)} // Force re-render when data updates
                    data={geoJsonData}
                    style={style}
                    onEachFeature={onEachFeature}
                />

                {/* Connection Lines & Markers */}
                {activeMarkers.map((marker, i) => {
                    // Don't draw line if it's too close to server or is the server country itself (optional check)
                    const isFar = Math.abs(marker.lat - SERVER_LAT) > 1 || Math.abs(marker.lng - SERVER_LNG) > 1;

                    return (
                        <Fragment key={`${marker.name}-${i}`}>
                            {/* Animated Connection Line */}
                            {isFar && (
                                <Polyline
                                    positions={[
                                        [marker.lat, marker.lng],
                                        [SERVER_LAT, SERVER_LNG]
                                    ]}
                                    pathOptions={{
                                        color: marker.count > 10 ? '#ef4444' : '#3b82f6', // Red if >10 requests, else Blue
                                        weight: marker.count > 50 ? 2 : 1,
                                        opacity: 0.8, // More visible
                                        dashArray: '4, 8', // Tighter dashes
                                        className: 'connection-line' // Defined in globals.css
                                    }}
                                />
                            )}

                            {/* Source Marker */}
                            <Marker
                                position={[marker.lat, marker.lng]}
                                icon={pulseIcon}
                                eventHandlers={{
                                    click: (e) => {
                                        const map = e.target._map;
                                        map.setView(e.target.getLatLng(), 5);
                                    }
                                }}
                            />
                        </Fragment>
                    );
                })}

                {/* Server Marker (Distinct) */}
                <Marker
                    position={[SERVER_LAT, SERVER_LNG]}
                    icon={L.divIcon({
                        className: 'server-icon',
                        html: `<div class="size-3 bg-emerald-500 rounded-full shadow-[0_0_15px_#10b981] border-2 border-white/20"></div>`,
                        iconSize: [12, 12],
                        iconAnchor: [6, 6]
                    })}
                />

                <ZoomControl position="bottomright" />
            </MapContainer>
        </div>
    );
}
