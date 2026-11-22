'use client';

import { Circle, MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

/** Approximate area only: a ~400 m circle on the already rounded coordinates, no pin, no popup. */
export default function SaleAreaMapLeaflet({ lat, lng }: { lat: number; lng: number }) {
    return (
        <MapContainer
            center={[lat, lng]}
            zoom={15}
            scrollWheelZoom={false}
            className="z-0 h-full w-full"
            style={{ height: '100%', width: '100%', background: '#f1f1f1' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png"
            />
            <Circle
                center={[lat, lng]}
                radius={400}
                pathOptions={{ color: '#b09e80', weight: 2, fillColor: '#b09e80', fillOpacity: 0.22 }}
            />
        </MapContainer>
    );
}
