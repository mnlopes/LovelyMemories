const fs = require('fs');

const en = JSON.parse(fs.readFileSync('./messages/en.json', 'utf8'));
const pt = JSON.parse(fs.readFileSync('./messages/pt.json', 'utf8'));

// Delete the old root-level AmenitiesTab if it exists
if (en.AmenitiesTab) delete en.AmenitiesTab;
if (pt.AmenitiesTab) delete pt.AmenitiesTab;

const enAmenitiesTab = {
    Categories: {
        "BedroomLaundry": "Bedroom & Laundry",
        "Entertainment": "Entertainment",
        "HeatingandCooling": "Heating and Cooling",
        "InternetandOffice": "Internet and Office",
        "KitchenandDining": "Kitchen and Dining",
        "Bathroom": "Bathroom",
        "Outdoor": "Outdoor",
        "LocationFeatures": "Location Features",
        "Safety": "Safety"
    },
    CommonItems: {
        "Washingmachine": "Washing machine",
        "Iron": "Iron",
        "Hangers": "Hangers",
        "Bedlinens": "Bed linens",
        "Extrapillowsandblankets": "Extra pillows and blankets",
        "Roomdarkeningshades": "Room-darkening shades",
        "HDTVwithNetflix": "HDTV with Netflix",
        "MarshallBluetoothsoundsystem": "Marshall Bluetooth sound system",
        "Booksandreadingmaterial": "Books and reading material",
        "Standardcable": "Standard cable",
        "Airconditioning": "Air conditioning",
        "Centralheating": "Central heating",
        "Portablefans": "Portable fans",
        "HighspeedWiFi": "High-speed WiFi",
        "Dedicatedworkspace": "Dedicated workspace",
        "Ergonomicchair": "Ergonomic chair",
        "Fullyequippedkitchen": "Fully equipped kitchen",
        "Nespressomachine": "Nespresso machine",
        "Dishwasher": "Dishwasher",
        "Wineglasses": "Wine glasses",
        "Toaster": "Toaster",
        "Cookingbasics": "Cooking basics",
        "Hairdryer": "Hair dryer",
        "Premiumtoiletries": "Premium toiletries",
        "Hotwater": "Hot water",
        "Walkinshower": "Walk-in shower",
        "Bathtub": "Bathtub",
        "Pool": "Pool",
        "Garden": "Garden",
        "Privateentrance": "Private entrance",
        "Patioorbalcony": "Patio or balcony",
        "Outdoorfurniture": "Outdoor furniture",
        "Riverview": "River view",
        "Resortaccess": "Resort access",
        "Beachaccess": "Beach access",
        "Cityview": "City view"
    },
    VIPServices: {
        "Concierge": "Concierge",
        "Chef": "Private Chef",
        "Chauffeur": "Chauffeur",
        "Transfer": "Transfer",
        "Tours": "Tours",
        "Dining": "Fine Dining",
        "Wine": "Wine Tasting",
        "Drinks": "Premium Drinks",
        "Music": "Live Music",
        "Wellness": "Wellness & Spa",
        "Security": "Security",
        "Tickets": "Event Tickets",
        "Calendar": "Planning"
    }
};

const ptAmenitiesTab = {
    Categories: {
        "BedroomLaundry": "Quarto e Lavandaria",
        "Entertainment": "Entretenimento",
        "HeatingandCooling": "Climatização",
        "InternetandOffice": "Internet e Escritório",
        "KitchenandDining": "Cozinha e Área de Jantar",
        "Bathroom": "Casa de Banho",
        "Outdoor": "Exterior",
        "LocationFeatures": "Localização",
        "Safety": "Segurança"
    },
    CommonItems: {
        "Washingmachine": "Máquina de Lavar",
        "Iron": "Ferro de Engomar",
        "Hangers": "Cabides",
        "Bedlinens": "Roupas de Cama",
        "Extrapillowsandblankets": "Almofadas e Cobertores Extra",
        "Roomdarkeningshades": "Cortinas Opacas",
        "HDTVwithNetflix": "Smart TV / Netflix",
        "MarshallBluetoothsoundsystem": "Sistema de Som Marshall",
        "Booksandreadingmaterial": "Livros e Leitura",
        "Standardcable": "Canais por Cabo",
        "Airconditioning": "Ar Condicionado",
        "Centralheating": "Aquecimento Central",
        "Portablefans": "Ventoinhas Portáteis",
        "HighspeedWiFi": "Wi-Fi Rápido",
        "Dedicatedworkspace": "Área de Trabalho",
        "Ergonomicchair": "Cadeira Ergonómica",
        "Fullyequippedkitchen": "Cozinha Completa",
        "Nespressomachine": "Máquina Nespresso",
        "Dishwasher": "Máquina de Lavar Loiça",
        "Wineglasses": "Copos de Vinho",
        "Toaster": "Torradeira",
        "Cookingbasics": "Básicos de Cozinha",
        "Hairdryer": "Secador de Cabelo",
        "Premiumtoiletries": "Produtos de Banho Premium",
        "Hotwater": "Água Quente",
        "Walkinshower": "Duche",
        "Bathtub": "Banheira",
        "Pool": "Piscina",
        "Garden": "Jardim",
        "Privateentrance": "Entrada Privada",
        "Patioorbalcony": "Pátio ou Varanda",
        "Outdoorfurniture": "Mobiliário de Exterior",
        "Riverview": "Vista de Rio",
        "Resortaccess": "Acesso ao Resort",
        "Beachaccess": "Acesso à Praia",
        "Cityview": "Vista da Cidade"
    },
    VIPServices: {
        "Concierge": "Concierge",
        "Chef": "Chef Privado",
        "Chauffeur": "Motorista Privado",
        "Transfer": "Transfer",
        "Tours": "Tours",
        "Dining": "Jantares Exclusivos",
        "Wine": "Provas de Vinho",
        "Drinks": "Bebidas Premium",
        "Music": "Música ao Vivo",
        "Wellness": "Bem-estar e Spa",
        "Security": "Segurança",
        "Tickets": "Bilhetes para Eventos",
        "Calendar": "Planeamento"
    }
};

// Also verify that PropertyEditor exists
if (!en.PropertyEditor) en.PropertyEditor = {};
if (!pt.PropertyEditor) pt.PropertyEditor = {};

en.PropertyEditor.AmenitiesTab = enAmenitiesTab;
pt.PropertyEditor.AmenitiesTab = ptAmenitiesTab;

fs.writeFileSync('./messages/en.json', JSON.stringify(en, null, 4));
fs.writeFileSync('./messages/pt.json', JSON.stringify(pt, null, 4));

console.log("Translations successfully updated.");
