
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

async function listModelsRaw() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("GEMINI_API_KEY not found in process.env");
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    console.log(`\n--- Listing Models ---`);
    console.log(`URL: ${url.split('?')[0]}...`);

    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log(`Status: ${response.status} ${response.statusText}`);

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => console.log(`- ${m.name}`));
        } else {
            console.log("No models found or error in response.");
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (err) {
        console.error("Fetch error:", err.message);
    }
}

listModelsRaw();
