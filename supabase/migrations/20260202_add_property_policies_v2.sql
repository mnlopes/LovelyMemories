-- Migration: Ensure all policy and home truth columns exist with proper defaults
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS home_truths JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS good_to_know JSONB DEFAULT '[]', -- Adding both for compatibility
ADD COLUMN IF NOT EXISTS house_rules JSONB DEFAULT '{
    "childrenAllowed": true,
    "infantsAllowed": true,
    "petsAllowed": false,
    "partiesAllowed": false,
    "smokingAllowed": false
}',
ADD COLUMN IF NOT EXISTS check_in JSONB DEFAULT '{
    "arrivalStart": "15:00",
    "departureEnd": "11:00"
}',
ADD COLUMN IF NOT EXISTS cancellation JSONB DEFAULT '{
    "text": "Moderate",
    "refundText": "50% refund",
    "deadline": "7 days"
}';

-- Comment for documentation
COMMENT ON COLUMN public.properties.amenities IS 'List of amenity categories and items';
COMMENT ON COLUMN public.properties.home_truths IS 'List of home truths / important notes (matches data.ts structure)';
COMMENT ON COLUMN public.properties.house_rules IS 'House rules flags';
COMMENT ON COLUMN public.properties.check_in IS 'Arrival and departure times';
COMMENT ON COLUMN public.properties.cancellation IS 'Cancellation policy details';
