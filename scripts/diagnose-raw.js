
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

async function diagnoseRaw() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("GEMINI_API_KEY not found in process.env");
        return;
    }

    const model = "gemini-1.5-flash";
    // Try both v1 and v1beta
    const versions = ["v1", "v1beta"];

    for (const version of versions) {
        const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`;

        console.log(`\n--- Testing ${version} ---`);
        console.log(`URL: ${url.split('?')[0]}...`);

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "Say OK" }] }]
                })
            });

            const data = await response.json();
            console.log(`Status: ${response.status} ${response.statusText}`);
            console.log("Response:", JSON.stringify(data, null, 2));

            if (response.ok) {
                console.log("✅ SUCCESS with raw fetch!");
                return;
            }
        } catch (err) {
            console.error("Fetch error:", err.message);
        }
    }
}

diagnoseRaw();
