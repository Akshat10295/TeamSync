const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // There is no listModels in the standard SDK easily, but we can try to guess or use the REST API
    console.log("Checking model availability...");
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro" });
    const result = await model.generateContent("test");
    console.log("Success with gemini-3.1-pro");
  } catch (err) {
    console.error("Error with gemini-1.5-flash:", err.message);
  }
}

listModels();
