-- Migration: Add bed_sizes and baby_equipment columns to properties
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS bed_sizes JSONB DEFAULT '{
    "single": "90 x 190 cm",
    "double": "140 x 190 cm",
    "king": "160 x 200 cm",
    "superKing": "180 x 200 cm"
}'::jsonb,
ADD COLUMN IF NOT EXISTS baby_equipment JSONB DEFAULT '{
    "available": true,
    "text": {
        "en": "Baby cot and high chair are available on request at no extra cost.",
        "pt": "Berço e cadeira alta estão disponíveis mediante pedido, sem custo extra.",
        "he": "מיטת תינוק וכיסא אוכל זמינים לפי בקשה ללא עלות נוספת."
    }
}'::jsonb;
