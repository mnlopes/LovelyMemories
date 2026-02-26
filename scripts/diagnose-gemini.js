
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

async function finalDiagnose() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("GEMINI_API_KEY not found in process.env");
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelsToTry = [
            "gemini-flash-latest",
            "gemini-2.0-flash",
            "gemini-1.5-pro"
        ];

        for (const modelName of modelsToTry) {
            try {
                process.stdout.write(`Testing models/${modelName}... `);
                const model = genAI.getGenerativeModel({ model: `models/${modelName}` });
                const result = await model.generateContent("Say 'OK'");
                console.log(`✅ Success: "${result.response.text().trim()}"`);
            } catch (err) {
                console.log(`❌ Failed: ${err.message.split('\n')[0]}`);
            }
        }
    } catch (err) {
        console.error("Diagnostic failed:", err.message);
    }
}

finalDiagnose();
