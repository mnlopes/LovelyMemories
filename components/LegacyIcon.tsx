"use client";

import React from 'react';

// Common mapping of amenity keys to our legacy icon names
const AMENITY_ICON_MAP: Record<string, string> = {
    'wifi': 'wifi',
    'internet': 'wifi',
    'bathroom': 'bathroom',
    'bath': 'bathroom',
    'bedroom': 'bedroom',
    'bed': 'bedroom',
    'arrival': 'arrival',
    'departure': 'departure',
    'location': 'destination',
    'address': 'destination',
    'phone': 'phone',
    'email': 'mail',
    'check': 'check',
    'security': 'padlock',
    'lock': 'padlock',
    'clock': 'clock',
    'time': 'clock',
    'calendar': 'calendar',
    'stats': 'graph',
    'guests': 'guest',
    'people': 'people',
    'search': 'search',
    'clean': 'sparkles',
    'download': 'download',
    'facebook': 'facebook',
    'instagram': 'instagram',
    'linkedin': 'linkedin',
};

interface LegacyIconProps {
    name: string;
    className?: string;
    size?: number;
}

/**
 * Component to render legacy icons from the SVG sprite.
 * Uses the <use> tag to reference IDs in the public/legacy/properties/images/lovelyicons.svg
 */
export const LegacyIcon = ({ name, className = "", size = 20 }: LegacyIconProps) => {
    // Check if we need to map the name (e.g. from an amenity label)
    const iconName = AMENITY_ICON_MAP[name.toLowerCase()] || name;

    return (
        <svg
            className={className}
            width={size}
            height={size}
            viewBox="0 0 1024 1024" // The original SVG uses 1024 as units-per-em
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
        >
            <use xlinkHref={`/legacy/properties/images/lovelyicons.svg#${iconName}`} />
        </svg>
    );
};
