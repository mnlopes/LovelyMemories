-- Migration: Add missing policy and home truth columns to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS good_to_know JSONB DEFAULT '[]',
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
COMMENT ON COLUMN public.properties.good_to_know IS 'List of home truths / important notes';
COMMENT ON COLUMN public.properties.house_rules IS 'House rules flags';
COMMENT ON COLUMN public.properties.check_in IS 'Arrival and departure times';
COMMENT ON COLUMN public.properties.cancellation IS 'Cancellation policy details';
