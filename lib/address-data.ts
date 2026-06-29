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
    }
};

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
    { code: "+351", country: "Portugal", flag: "🇵🇹" },
    { code: "+1", country: "USA/Canada", flag: "🇺🇸" },
    { code: "+44", country: "UK", flag: "🇬🇧" },
    { code: "+33", country: "France", flag: "🇫🇷" },
    { code: "+49", country: "Germany", flag: "🇩🇪" },
    { code: "+34", country: "Spain", flag: "🇪🇸" },
    { code: "+39", country: "Italy", flag: "🇮🇹" },
    { code: "+55", country: "Brazil", flag: "🇧🇷" },
    { code: "+41", country: "Switzerland", flag: "🇨🇭" },
    { code: "+32", country: "Belgium", flag: "🇧🇪" },
    { code: "+31", country: "Netherlands", flag: "🇳🇱" },
    { code: "+353", country: "Ireland", flag: "🇮🇪" },
    { code: "+244", country: "Angola", flag: "🇦🇴" },
    { code: "+238", country: "Cape Verde", flag: "🇨🇻" },
    { code: "+258", country: "Mozambique", flag: "🇲🇿" },
    { code: "+30", country: "Greece", flag: "🇬🇷" },
];
