const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI;
let model;

if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
}

/**
 * Sends a prompt to Gemini with optional code context
 */
async function askAI(prompt, context = "") {
  if (!model) {
    return "AI simulation mode active. (Add GEMINI_API_KEY to .env for real AI). \n\nHow can I help you today?";
  }

  try {
    const fullPrompt = context 
      ? `You are an AI pair programmer inside the TeamSync IDE.\nContext (Current Code):\n${context}\n\nUser Question:\n${prompt}`
      : prompt;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    return response.text();
  } catch (err) {
    console.error('Gemini API Error:', err);
    if (err.message.includes('404')) {
      return "I'm having trouble connecting to my brain (Model Not Found). Please check the model configuration in aiService.js.";
    }
    if (err.message.includes('429')) {
      return "I'm a bit overwhelmed with requests right now! Please wait a few seconds and try again.";
    }
    throw new Error('The AI assistant is busy or unavailable. Please try again.');
  }
}

module.exports = { askAI };
