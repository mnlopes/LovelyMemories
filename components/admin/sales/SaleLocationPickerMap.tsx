'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { cartoTileUrl } from '@/lib/map-tiles';

const PORTO: [number, number] = [41.1496, -8.6109];

// A plain CSS dot (the default Leaflet marker images do not resolve under Next.js), big enough to grab.
const pin = L.divIcon({
    className: '',
    html: '<div style="width:24px;height:24px;border-radius:9999px;background:#171717;border:4px solid #fff;box-shadow:0 1px 8px rgba(0,0,0,.5);cursor:grab"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

function ClickToSet({ onPick }: { onPick: (lat: number, lng: number) => void }) {
    useMapEvents({
        click: (e) => onPick(round6(e.latlng.lat), round6(e.latlng.lng)),
    });
    return null;
}

/**
 * Brings a point set from outside (typed coordinates, pasted link) into view without changing the zoom.
 * A point picked on the map is already visible, so the map does not jump while you click or drag.
 */
function Follow({ point }: { point: [number, number] | null }) {
    const map = useMap();
    const lat = point?.[0];
    const lng = point?.[1];
    useEffect(() => {
        if (lat === undefined || lng === undefined) return;
        if (!map.getBounds().pad(-0.1).contains([lat, lng])) map.setView([lat, lng], map.getZoom(), { animate: true });
    }, [lat, lng, map]);
    return null;
}

/** Staff-only picker: the exact point is shown (the public site only ever shows an approximate area). */
export default function SaleLocationPickerMap({
    lat,
    lng,
    onPick,
}: {
    lat: number | null;
    lng: number | null;
    onPick: (lat: number, lng: number) => void;
}) {
    const point: [number, number] | null = lat !== null && lng !== null ? [lat, lng] : null;
    return (
        <MapContainer
            center={point ?? PORTO}
            zoom={point ? 16 : 12}
            scrollWheelZoom={false}
            className="z-0 h-full w-full"
            style={{ height: '100%', width: '100%', background: '#f1f1f1' }}
        >
            <TileLayer
                url={cartoTileUrl()}
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            <ClickToSet onPick={onPick} />
            <Follow point={point} />
            {point && (
                <Marker
                    position={point}
                    icon={pin}
                    draggable
                    autoPan
                    eventHandlers={{
                        dragend: (e) => {
                            const ll = (e.target as L.Marker).getLatLng();
                            onPick(round6(ll.lat), round6(ll.lng));
                        },
                    }}
                />
            )}
        </MapContainer>
    );
}
