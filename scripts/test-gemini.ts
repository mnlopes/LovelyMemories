
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.argv[2];

if (!apiKey) {
    console.error("Please provide an API key as an argument.");
    process.exit(1);
}

async function listModels() {
    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        // There isn't a direct listModels on the client instance in some versions,
        // but usually we can try to generate content to test access, 
        // OR use the model manager if available in this sdk version.
        // The node SDK usually exposes it via a specific manager, but let's try to just run a generation with a few common names.

        // Actually, newer SDKs don't expose listModels easily on the generic client.
        // Let's brute force check common models.

        const models = ["gemini-pro", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro"];

        console.log(`Testing API Key: ${apiKey.substring(0, 8)}...`);

        for (const modelName of models) {
            process.stdout.write(`Checking ${modelName}... `);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Test");
                const response = result.response;
                console.log(`✅ Success!`);
                // console.log(response.text());
            } catch (error: any) {
                if (error.message?.includes('404')) {
                    console.log(`❌ Not Found (404)`);
                } else {
                    console.log(`❌ Error: ${error.message.split('\n')[0]}`);
                }
            }
        }

    } catch (error) {
        console.error("Fatal Error:", error);
    }
}

listModels();
