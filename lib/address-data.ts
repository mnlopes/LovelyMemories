export type CountryData = {
    code: string;
    name: string;
    flag: string;
    zipRegex: RegExp;
    zipFormat: string; // e.g., "0000-000"
    cities: string[]; // Major cities for autocomplete
};

export const ADDRESS_DATA: Record<string, CountryData> = {
    "PT": {
        code: "PT",
        name: "Portugal",
        flag: "🇵🇹",
        zipRegex: /^\d{4}-\d{3}$/,
        zipFormat: "0000-000",
        cities: [
            "Lisbon", "Porto", "Amadora", "Braga", "Setúbal", "Coimbra",
            "Queluz", "Funchal", "Cacém", "Vila Nova de Gaia", "Algueirão-Mem Martins",
            "Loures", "Rio de Mouro", "Odivelas", "Aveiro", "Amora", "Corroios",
            "Barreiro", "Monsanto", "Rio Tinto", "São Domingos de Rana", "Leiria",
            "Évora", "Sesimbra", "Faro", "Guimarães", "Viseu", "Ermesinde",
            "Viana do Castelo", "Vila Real", "Castelo Branco", "Cascais", "Sintra"
        ]
    },
    "UK": {
        code: "UK",
        name: "United Kingdom",
        flag: "🇬🇧",
        zipRegex: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
        zipFormat: "SW1A 1AA",
        cities: [
            "London", "Birmingham", "Manchester", "Glasgow", "Liverpool",
            "Bristol", "Sheffield", "Leeds", "Edinburgh", "Leicester"
        ]
    },
    "FR": {
        code: "FR",
        name: "France",
        flag: "🇫🇷",
        zipRegex: /^\d{5}$/,
        zipFormat: "00000",
        cities: [
            "Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes",
            "Montpellier", "Strasbourg", "Bordeaux", "Lille", "Rennes",
            "Reims", "Le Havre", "Saint-Étienne", "Toulon", "Grenoble",
            "Dijon", "Angers", "Nîmes", "Villeurbanne", "Saint-Denis",
            "Le Mans", "Aix-en-Provence", "Clermont-Ferrand", "Brest",
            "Limoges", "Tours", "Amiens", "Perpignan", "Metz"
        ]
    },
    "DE": {
        code: "DE",
        name: "Germany",
        flag: "🇩🇪",
        zipRegex: /^\d{5}$/,
        zipFormat: "00000",
        cities: [
            "Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt", "Stuttgart",
            "Düsseldorf", "Dortmund", "Essen", "Leipzig"
        ]
    },
    "ES": {
        code: "ES",
        name: "Spain",
        flag: "🇪🇸",
        zipRegex: /^\d{5}$/,
        zipFormat: "00000",
        cities: [
            "Madrid", "Barcelona", "Valencia", "Seville", "Zaragoza", "Málaga",
            "Murcia", "Palma", "Las Palmas", "Bilbao", "Alicante", "Córdoba",
            "Valladolid", "Vigo", "Gijón", "L'Hospitalet de Llobregat", "Vitoria-Gasteiz"
        ]
    },
    "IT": {
        code: "IT",
        name: "Italy",
        flag: "🇮🇹",
        zipRegex: /^\d{5}$/,
        zipFormat: "00000",
        cities: ["Rome", "Milan", "Naples", "Turin", "Palermo", "Genoa", "Bologna", "Florence"]
    },
    "BR": {
        code: "BR",
        name: "Brazil",
        flag: "🇧🇷",
        zipRegex: /^\d{5}-\d{3}$/,
        zipFormat: "00000-000",
        cities: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Fortaleza", "Belo Horizonte", "Manaus"]
    },
    "US": {
        code: "US",
        name: "United States",
        flag: "🇺🇸",
        zipRegex: /^\d{5}(-\d{4})?$/,
        zipFormat: "00000",
        cities: [
            "New York", "Los Angeles", "Chicago", "Houston", "Phoenix",
            "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose"
        ]
    },
    "BE": {
        code: "BE",
        name: "Belgium",
        flag: "🇧🇪",
        zipRegex: /^\d{4}$/,
        zipFormat: "0000",
        cities: ["Brussels", "Antwerp", "Ghent", "Charleroi", "Liège", "Bruges", "Namur"]
    },
    "NL": {
        code: "NL",
        name: "Netherlands",
        flag: "🇳🇱",
        zipRegex: /^\d{4}\s?[A-Z]{2}$/i,
        zipFormat: "1234 AB",
        cities: ["Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven", "Tilburg", "Groningen"]
    },
    "CH": {
        code: "CH",
        name: "Switzerland",
        flag: "🇨🇭",
        zipRegex: /^\d{4}$/,
        zipFormat: "0000",
        cities: ["Zürich", "Geneva", "Basel", "Lausanne", "Bern", "Winterthur", "Lucerne"]
    },
    "IE": {
        code: "IE",
        name: "Ireland",
        flag: "🇮🇪",
        zipRegex: /^[A-Z0-9]{3}\s?[A-Z0-9]{4}$/i,
        zipFormat: "A65 F4E2",
        cities: ["Dublin", "Cork", "Limerick", "Galway", "Waterford", "Drogheda"]
    },
    "AO": {
        code: "AO",
        name: "Angola",
        flag: "🇦🇴",
        zipRegex: /.*/,
        zipFormat: "N/A",
        cities: ["Luanda", "Lubango", "Huambo", "Benguela"]
    },
    "MZ": {
        code: "MZ",
        name: "Mozambique",
        flag: "🇲🇿",
        zipRegex: /^\d{4}$/,
        zipFormat: "0000",
        cities: ["Maputo", "Matola", "Beira", "Nampula"]
    },
    "CV": {
        code: "CV",
        name: "Cape Verde",
        flag: "🇨🇻",
        zipRegex: /^\d{4}$/,
        zipFormat: "0000",
        cities: ["Praia", "Mindelo", "Espargos", "Assomada"]
    },
    "GR": {
        code: "GR",
        name: "Greece",
        flag: "🇬🇷",
        zipRegex: /^\d{3}\s?\d{2}$/,
        zipFormat: "846 00",
        cities: ["Athens", "Thessaloniki", "Mykonos", "Santorini", "Heraklion", "Patras", "Rhodes", "Corfu"]
    },
    "IL": {
        code: "IL",
        name: "Israel",
        flag: "🇮🇱",
        zipRegex: /^\d{5}(\d{2})?$/,
        zipFormat: "0000000",
        cities: ["Tel Aviv", "Jerusalem", "Haifa", "Rishon LeZion", "Netanya"]
    },
    "AT": {
        code: "AT",
        name: "Austria",
        flag: "🇦🇹",
        zipRegex: /^\d{4}$/,
        zipFormat: "0000",
        cities: []
    },
    "PL": {
        code: "PL",
        name: "Poland",
        flag: "🇵🇱",
        zipRegex: /^\d{2}-\d{3}$/,
        zipFormat: "00-000",
        cities: []
    },
    "SE": {
        code: "SE",
        name: "Sweden",
        flag: "🇸🇪",
        zipRegex: /^\d{3}\s?\d{2}$/,
        zipFormat: "000 00",
        cities: []
    },
    "DK": {
        code: "DK",
        name: "Denmark",
        flag: "🇩🇰",
        zipRegex: /^\d{4}$/,
        zipFormat: "0000",
        cities: []
    },
    "NO": {
        code: "NO",
        name: "Norway",
        flag: "🇳🇴",
        zipRegex: /^\d{4}$/,
        zipFormat: "0000",
        cities: []
    },
    "FI": {
        code: "FI",
        name: "Finland",
        flag: "🇫🇮",
        zipRegex: /^\d{5}$/,
        zipFormat: "00000",
        cities: []
    },
    "LU": {
        code: "LU",
        name: "Luxembourg",
        flag: "🇱🇺",
        zipRegex: /^\d{4}$/,
        zipFormat: "0000",
        cities: []
    },
    "CZ": {
        code: "CZ",
        name: "Czech Republic",
        flag: "🇨🇿",
        zipRegex: /^\d{3}\s?\d{2}$/,
        zipFormat: "000 00",
        cities: []
    },
    "HU": {
        code: "HU",
        name: "Hungary",
        flag: "🇭🇺",
        zipRegex: /^\d{4}$/,
        zipFormat: "0000",
        cities: []
    },
    "RO": {
        code: "RO",
        name: "Romania",
        flag: "🇷🇴",
        zipRegex: /^\d{6}$/,
        zipFormat: "000000",
        cities: []
    },
    "HR": {
        code: "HR",
        name: "Croatia",
        flag: "🇭🇷",
        zipRegex: /^\d{5}$/,
        zipFormat: "00000",
        cities: []
    },
    "CA": {
        code: "CA",
        name: "Canada",
        flag: "🇨🇦",
        zipRegex: /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/,
        zipFormat: "A1A 1A1",
        cities: []
    },
    "AU": {
        code: "AU",
        name: "Australia",
        flag: "🇦🇺",
        zipRegex: /^\d{4}$/,
        zipFormat: "0000",
        cities: []
    },
    "NZ": {
        code: "NZ",
        name: "New Zealand",
        flag: "🇳🇿",
        zipRegex: /^\d{4}$/,
        zipFormat: "0000",
        cities: []
    },
    "JP": {
        code: "JP",
        name: "Japan",
        flag: "🇯🇵",
        zipRegex: /^\d{3}-?\d{4}$/,
        zipFormat: "000-0000",
        cities: []
    },
    "KR": {
        code: "KR",
        name: "South Korea",
        flag: "🇰🇷",
        zipRegex: /^\d{5}$/,
        zipFormat: "00000",
        cities: []
    },
    "CN": {
        code: "CN",
        name: "China",
        flag: "🇨🇳",
        zipRegex: /^\d{6}$/,
        zipFormat: "000000",
        cities: []
    },
    "IN": {
        code: "IN",
        name: "India",
        flag: "🇮🇳",
        zipRegex: /^\d{6}$/,
        zipFormat: "000000",
        cities: []
    },
    "AE": {
        code: "AE",
        name: "United Arab Emirates",
        flag: "🇦🇪",
        zipRegex: /.*/,
        zipFormat: "N/A",
        cities: []
    },
    "TR": {
        code: "TR",
        name: "Turkey",
        flag: "🇹🇷",
        zipRegex: /^\d{5}$/,
        zipFormat: "00000",
        cities: []
    },
    "MX": {
        code: "MX",
        name: "Mexico",
        flag: "🇲🇽",
        zipRegex: /^\d{5}$/,
        zipFormat: "00000",
        cities: []
    },
    "AR": {
        code: "AR",
        name: "Argentina",
        flag: "🇦🇷",
        zipRegex: /^[A-Za-z]?\d{4}[A-Za-z]{0,3}$/,
        zipFormat: "C1425",
        cities: []
    },
    "ZA": {
        code: "ZA",
        name: "South Africa",
        flag: "🇿🇦",
        zipRegex: /^\d{4}$/,
        zipFormat: "0000",
        cities: []
    }
};

/**
 * Real flag image URL (Windows/Chrome renders flag emojis as letter pairs).
 * Returns null for non-ISO entries like OTHER — fall back to the emoji.
 */
export function flagImageUrl(code: string): string | null {
    if (code === "OTHER") return null;
    const iso = code === "UK" ? "gb" : code.toLowerCase();
    return `https://flagcdn.com/w40/${iso}.png`;
}

export const OTHER_COUNTRY: CountryData = {
    code: "OTHER",
    name: "Other",
    flag: "🌍",
    zipRegex: /.+/,
    zipFormat: "Any",
    cities: []
};

// Basic Phone Codes for the dropdown
export const COUNTRY_CODES = [
    { code: "+351", country: "Portugal", flag: "🇵🇹", iso: "PT" },
    { code: "+1", country: "USA/Canada", flag: "🇺🇸", iso: "US" },
    { code: "+44", country: "UK", flag: "🇬🇧", iso: "UK" },
    { code: "+33", country: "France", flag: "🇫🇷", iso: "FR" },
    { code: "+49", country: "Germany", flag: "🇩🇪", iso: "DE" },
    { code: "+34", country: "Spain", flag: "🇪🇸", iso: "ES" },
    { code: "+39", country: "Italy", flag: "🇮🇹", iso: "IT" },
    { code: "+55", country: "Brazil", flag: "🇧🇷", iso: "BR" },
    { code: "+41", country: "Switzerland", flag: "🇨🇭", iso: "CH" },
    { code: "+32", country: "Belgium", flag: "🇧🇪", iso: "BE" },
    { code: "+31", country: "Netherlands", flag: "🇳🇱", iso: "NL" },
    { code: "+353", country: "Ireland", flag: "🇮🇪", iso: "IE" },
    { code: "+244", country: "Angola", flag: "🇦🇴", iso: "AO" },
    { code: "+238", country: "Cape Verde", flag: "🇨🇻", iso: "CV" },
    { code: "+258", country: "Mozambique", flag: "🇲🇿", iso: "MZ" },
    { code: "+30", country: "Greece", flag: "🇬🇷", iso: "GR" },
    { code: "+972", country: "Israel", flag: "🇮🇱", iso: "IL" },
    { code: "+43", country: "Austria", flag: "🇦🇹", iso: "AT" },
    { code: "+48", country: "Poland", flag: "🇵🇱", iso: "PL" },
    { code: "+46", country: "Sweden", flag: "🇸🇪", iso: "SE" },
    { code: "+45", country: "Denmark", flag: "🇩🇰", iso: "DK" },
    { code: "+47", country: "Norway", flag: "🇳🇴", iso: "NO" },
    { code: "+358", country: "Finland", flag: "🇫🇮", iso: "FI" },
    { code: "+352", country: "Luxembourg", flag: "🇱🇺", iso: "LU" },
    { code: "+420", country: "Czech Republic", flag: "🇨🇿", iso: "CZ" },
    { code: "+36", country: "Hungary", flag: "🇭🇺", iso: "HU" },
    { code: "+40", country: "Romania", flag: "🇷🇴", iso: "RO" },
    { code: "+385", country: "Croatia", flag: "🇭🇷", iso: "HR" },
    { code: "+61", country: "Australia", flag: "🇦🇺", iso: "AU" },
    { code: "+64", country: "New Zealand", flag: "🇳🇿", iso: "NZ" },
    { code: "+81", country: "Japan", flag: "🇯🇵", iso: "JP" },
    { code: "+82", country: "South Korea", flag: "🇰🇷", iso: "KR" },
    { code: "+86", country: "China", flag: "🇨🇳", iso: "CN" },
    { code: "+91", country: "India", flag: "🇮🇳", iso: "IN" },
    { code: "+971", country: "UAE", flag: "🇦🇪", iso: "AE" },
    { code: "+90", country: "Turkey", flag: "🇹🇷", iso: "TR" },
    { code: "+52", country: "Mexico", flag: "🇲🇽", iso: "MX" },
    { code: "+54", country: "Argentina", flag: "🇦🇷", iso: "AR" },
    { code: "+27", country: "South Africa", flag: "🇿🇦", iso: "ZA" },
];
