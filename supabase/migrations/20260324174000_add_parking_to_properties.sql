-- Add parking column to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS parking JSONB DEFAULT '{
    "available": false,
    "size": {
        "en": "Suitable for most standard cars (e.g. Sedans, compact SUVs)",
        "pt": "Adequado para a maioria dos carros standard (ex. Sedans, SUVs compactos)",
        "he": "מתאים לרוב המכוניות הרגילות (למשל סדאן, רכבי שטח קומפקטיים)"
    },
    "hasElectricCharger": false
}'::jsonb;

-- Update existing records to have the default parking object if needed
UPDATE properties SET parking = '{
    "available": false,
    "size": {
        "en": "Suitable for most standard cars (e.g. Sedans, compact SUVs)",
        "pt": "Adequado para a maioria dos carros standard (ex. Sedans, SUVs compactos)",
        "he": "מתאים לרוב המכוניות הרגילות (למשל סדאן, רכבי שטח קומפקטיים)"
    },
    "hasElectricCharger": false
}'::jsonb WHERE parking IS NULL;
