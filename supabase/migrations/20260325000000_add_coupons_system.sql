-- Create coupons table
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL NOT NULL,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Policies for coupons (Admin access)
CREATE POLICY "Admins can manage coupons" 
ON coupons FOR ALL 
USING (auth.jwt() ->> 'role' IN ('super_admin', 'admin'));

-- Public/Guest can only view active and valid coupons
CREATE POLICY "Anyone can view valid coupons" 
ON coupons FOR SELECT 
USING (
    active = true AND 
    (expires_at IS NULL OR expires_at > NOW()) AND
    (max_uses IS NULL OR used_count < max_uses)
);

-- Add coupon columns to reservations
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'reservations' AND COLUMN_NAME = 'coupon_code') THEN
        ALTER TABLE reservations ADD COLUMN coupon_code TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'reservations' AND COLUMN_NAME = 'coupon_discount_amount') THEN
        ALTER TABLE reservations ADD COLUMN coupon_discount_amount DECIMAL DEFAULT 0;
    END IF;
END $$;

-- Function to track coupon usage
CREATE OR REPLACE FUNCTION handle_coupon_usage() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.coupon_code IS NOT NULL THEN
        UPDATE coupons 
        SET used_count = used_count + 1 
        WHERE code = NEW.coupon_code;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for coupon usage on new reservation
DROP TRIGGER IF EXISTS tr_track_coupon_usage ON reservations;
CREATE TRIGGER tr_track_coupon_usage
AFTER INSERT ON reservations
FOR EACH ROW
EXECUTE FUNCTION handle_coupon_usage();

-- Add comments for documentation
COMMENT ON TABLE coupons IS 'Table to manage coupon codes and discounts.';
COMMENT ON COLUMN reservations.coupon_code IS 'Applied coupon code for the reservation.';
COMMENT ON COLUMN reservations.coupon_discount_amount IS 'Fixed or percentage discount amount from the coupon.';
