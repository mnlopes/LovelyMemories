'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const PORTO: [number, number] = [41.1496, -8.6109];

// A plain CSS dot: the default Leaflet marker images do not resolve under Next.js.
const pin = L.divIcon({
    className: '',
    html: '<div style="width:18px;height:18px;border-radius:9999px;background:#171717;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.45)"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
});

function ClickToSet({ onPick }: { onPick: (lat: number, lng: number) => void }) {
    useMapEvents({
        click: (e) => onPick(Math.round(e.latlng.lat * 1e6) / 1e6, Math.round(e.latlng.lng * 1e6) / 1e6),
    });
    return null;
}

/** Follows a point set from outside (typed coordinates, pasted link) without changing the zoom. */
function Follow({ point }: { point: [number, number] | null }) {
    const map = useMap();
    const lat = point?.[0];
    const lng = point?.[1];
    useEffect(() => {
        if (lat !== undefined && lng !== undefined) map.setView([lat, lng], map.getZoom(), { animate: false });
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
                url="https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            <ClickToSet onPick={onPick} />
            <Follow point={point} />
            {point && <Marker position={point} icon={pin} interactive={false} />}
        </MapContainer>
    );
}
