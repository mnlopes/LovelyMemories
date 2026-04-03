/**
 * Shared amenity constants for use in both frontend and backend scraper.
 */

export const SUGGESTED_CATEGORIES = [
    "Bedroom & Laundry",
    "Entertainment",
    "Heating and Cooling",
    "Internet and Office",
    "Kitchen and Dining",
    "Bathroom",
    "Location Features",
    "Outdoor",
    "Safety"
];

export const CATEGORY_TRANSLATIONS: Record<string, Record<string, string>> = {
    "Bedroom & Laundry": { en: "Bedroom & Laundry", pt: "Quarto e Lavandaria", he: "חדר שינה וכביסה" },
    "Bedroom and laundry": { en: "Bedroom & Laundry", pt: "Quarto e Lavandaria", he: "חדר שינה וכביסה" },
    "Entertainment": { en: "Entertainment", pt: "Entretenimento", he: "בידור" },
    "Heating and Cooling": { en: "Heating and Cooling", pt: "Climatização", he: "חימום וקירור" },
    "Internet and Office": { en: "Internet and Office", pt: "Internet e Escritório", he: "אינטרנט ומשרד" },
    "Kitchen and Dining": { en: "Kitchen and Dining", pt: "Cozinha e Área de Jantar", he: "מטבח ופינת אוכל" },
    "Bathroom": { en: "Bathroom", pt: "Casa de Banho", he: "חדר רחצה" },
    "Location Features": { en: "Location Features", pt: "Localização", he: "מאפייני מיקום" },
    "Outdoor": { en: "Outdoor", pt: "Exterior", he: "חוץ" },
    "Safety": { en: "Safety", pt: "Segurança", he: "בטיחות" }
};

export const COMMON_ITEMS: Record<string, string[]> = {
    "Bedroom & Laundry": ["Washing machine", "Iron", "Hangers", "Bed linens", "Extra pillows and blankets", "Room-darkening shades"],
    "Entertainment": ["HDTV with Netflix", "Marshall Bluetooth sound system", "Books and reading material", "Standard cable"],
    "Heating and Cooling": ["Air conditioning", "Central heating", "Portable fans"],
    "Internet and Office": ["High-speed WiFi", "Dedicated workspace", "Ergonomic chair"],
    "Kitchen and Dining": ["Fully equipped kitchen", "Nespresso machine", "Dishwasher", "Wine glasses", "Toaster", "Cooking basics"],
    "Bathroom": ["Hair dryer", "Premium toiletries", "Hot water", "Walk-in shower", "Bathtub"],
    "Outdoor": ["Pool", "Garden", "Private entrance", "Patio or balcony", "Outdoor furniture"],
    "Location Features": ["River view", "Resort access", "Beach access", "City view"]
};

// Map item English keys to translations
export const ITEM_TRANSLATIONS: Record<string, Record<string, string>> = {
    "Washing machine": { en: "Washing machine", pt: "Máquina de Lavar", he: "מכונת כביסה" },
    "Iron": { en: "Iron", pt: "Ferro de Engomar", he: "מגהץ" },
    "Hangers": { en: "Hangers", pt: "Cabides", he: "קולבים" },
    "Bed linens": { en: "Bed linens", pt: "Roupas de Cama", he: "מצעים" },
    "Extra pillows and blankets": { en: "Extra pillows and blankets", pt: "Almofadas e Cobertores Extra", he: "כריות ושמיכות נוספות" },
    "Room-darkening shades": { en: "Room-darkening shades", pt: "Cortinas Opacas", he: "וילונות האפלה" },
    "HDTV with Netflix": { en: "HDTV with Netflix", pt: "Smart TV / Netflix", he: "טלוויזיה חכמה / נטפליקס" },
    "Marshall Bluetooth sound system": { en: "Marshall Bluetooth sound system", pt: "Sistema de Som Marshall", he: "מערכת סאונד מרשל" },
    "Books and reading material": { en: "Books and reading material", pt: "Livros e Leitura", he: "ספרים וחומר קריאה" },
    "Standard cable": { en: "Standard cable", pt: "Canais por Cabo", he: "שידורי כבלים" },
    "Air conditioning": { en: "Air conditioning", pt: "Ar Condicionado", he: "מזגן" },
    "Central heating": { en: "Central heating", pt: "Aquecimento Central", he: "חימום מרכזי" },
    "Portable fans": { en: "Portable fans", pt: "Ventoinhas Portáteis", he: "מאווררים ניידים" },
    "High-speed WiFi": { en: "High-speed WiFi", pt: "Wi-Fi Rápido", he: "אינטרנט אלחוטי מהיר" },
    "Dedicated workspace": { en: "Dedicated workspace", pt: "Area de Trabalho", he: "פינת עבודה" },
    "Ergonomic chair": { en: "Ergonomic chair", pt: "Cadeira Ergonómica", he: "כיסא ארגונומי" },
    "Fully equipped kitchen": { en: "Fully equipped kitchen", pt: "Cozinha Completa", he: "מטבח מאובזר" },
    "Nespresso machine": { en: "Nespresso machine", pt: "Máquina Nespresso", he: "מכונת נספרסו" },
    "Dishwasher": { en: "Dishwasher", pt: "Máquina de Lavar Loiça", he: "מדיח כלים" },
    "Wine glasses": { en: "Wine glasses", pt: "Copos de Vinho", he: "כוסות יין" },
    "Toaster": { en: "Toaster", pt: "Torradeira", he: "טוסטר" },
    "Cooking basics": { en: "Cooking basics", pt: "Básicos de Cozinha", he: "מוצרי יסוד לבישול" },
    "Hair dryer": { en: "Hair dryer", pt: "Secador de Cabelo", he: "מייבש שיער" },
    "Premium toiletries": { en: "Premium toiletries", pt: "Produtos de Banho Premium", he: "מוצרי טיפוח פרימיום" },
    "Hot water": { en: "Hot water", pt: "Água Quente", he: "מים חמים" },
    "Walk-in shower": { en: "Walk-in shower", pt: "Duche", he: "מקלחת" },
    "Bathtub": { en: "Bathtub", pt: "Banheira", he: "אמבטיה" },
    "Pool": { en: "Pool", pt: "Piscina", he: "בריכה" },
    "Garden": { en: "Garden", pt: "Jardim", he: "גינה" },
    "Private entrance": { en: "Private entrance", pt: "Entrada Privada", he: "כניסה פרטית" },
    "Patio or balcony": { en: "Patio or balcony", pt: "Pátio ou Varanda", he: "פטיו או מרפסת" },
    "Outdoor furniture": { en: "Outdoor furniture", pt: "Mobiliário de Exterior", he: "ריהוט גן" },
    "River view": { en: "River view", pt: "Vista de Rio", he: "נוף לנהר" },
    "Resort access": { en: "Resort access", pt: "Acesso ao Resort", he: "גישה למתחם נופש" },
    "Beach access": { en: "Beach access", pt: "Acesso à Praia", he: "גישה לים" },
    "City view": { en: "City view", pt: "Vista da Cidade", he: "נוף לעיר" },
    "Wifi": { en: "High-speed WiFi", pt: "Wi-Fi Rápido", he: "אינטרנט אלחוטי מהיר" },
    "Shampoo": { en: "Shampoo", pt: "Champô", he: "שמפו" },
    "Shower gel": { en: "Shower gel", pt: "Gel de Banho", he: "סבון רחצה" },
    "TV": { en: "HDTV with Netflix", pt: "Smart TV / Netflix", he: "טלוויזיה חכמה / נטפליקס" },
    "Kitchen": { en: "Fully equipped kitchen", pt: "Cozinha Completa", he: "מטבח מאובזר" },
    "Microwave": { en: "Microwave", pt: "Micro-ondas", he: "מיקרוגל" },
    "Fridge": { en: "Fridge", pt: "Frigorífico", he: "מקרר" },
    "Bed linen": { en: "Bed linens", pt: "Roupas de Cama", he: "מצעים" },
    "Heating – split-type ductless system": { en: "Air conditioning", pt: "Ar Condicionado", he: "מזגן" },
    "Fire extinguisher": { en: "Fire extinguisher", pt: "Extintor de Incêndio", he: "מטף" },
    "First aid kit": { en: "First aid kit", pt: "Kit de primeiros socorros", he: "ערכת עזרה ראשונה" },
    "Paid street parking off premises": { en: "Paid street parking", pt: "Estacionamento pago na rua", he: "חניה בתשלום ברחוב" },
    "Pets allowed": { en: "Pets allowed", pt: "Animais de estimação permitidos", he: "מותר להכניס חיות מחמד" },
};

export const AVAILABLE_ICONS = [
    { label: "Heating/Cooling", value: "/icons/heating_navy.png" },
    { label: "Entertainment", value: "/icons/entertainment_navy.png" },
    { label: "Outdoor", value: "/icons/outdoor_navy.png" },
    { label: "Parking", value: "/icons/parking_navy.png" },
    { label: "Bedroom/Laundry", value: "/icons/bedroom_navy.png" },
    { label: "Internet/Office", value: "/icons/internet_navy.png" },
    { label: "Kitchen", value: "/icons/kitchen_navy.png" },
    { label: "Bathroom", value: "/icons/bathroom_navy.png" },
];

export const DEFAULT_ICONS: Record<string, string> = {
    "Bedroom & Laundry": "/icons/bedroom_navy.png",
    "Bedroom and laundry": "/icons/bedroom_navy.png",
    "Entertainment": "/icons/entertainment_navy.png",
    "Heating and Cooling": "/icons/heating_navy.png",
    "Internet and Office": "/icons/internet_navy.png",
    "Kitchen and Dining": "/icons/kitchen_navy.png",
    "Bathroom": "/icons/bathroom_navy.png",
    "Outdoor": "/icons/outdoor_navy.png",
    "Location Features": "/icons/outdoor_navy.png",
    "Safety": "/icons/parking_navy.png"
};
