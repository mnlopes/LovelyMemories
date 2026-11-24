/**
 * CARTO raster basemaps. Since September 2026 CARTO serves raster tiles only with a Basemaps API
 * key (without it every tile carries an "API KEY REQUIRED" watermark). The key is public by design
 * (it travels in each tile request from the browser), so it lives in a NEXT_PUBLIC_ variable; set it
 * in Vercel for Production and Preview and redeploy, because NEXT_PUBLIC_ values are inlined at build.
 */
const CARTO_KEY = process.env.NEXT_PUBLIC_CARTO_BASEMAPS_KEY;

export type CartoStyle = 'light_all' | 'dark_nolabels';

export function cartoTileUrl(style: CartoStyle = 'light_all'): string {
    const base = `https://{s}.basemaps.cartocdn.com/rastertiles/${style}/{z}/{x}/{y}{r}.png`;
    return CARTO_KEY ? `${base}?key=${encodeURIComponent(CARTO_KEY)}` : base;
}

export const CARTO_ATTRIBUTION =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
