const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testV1() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Try to specify v1
    const model = genAI.getGenerativeModel({ model: "gemini-pro" }, { apiVersion: "v1" });
    const result = await model.generateContent("test");
    console.log("Success with gemini-pro on v1");
  } catch (err) {
    console.error("Error on v1:", err.message);
  }
}

testV1();
