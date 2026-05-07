require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run() {
  try {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      console.log('No API key found in .env');
      return;
    }
    
    // There is no listModels in the JS SDK? Let's try direct fetch
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    console.log(data.models.map(m => m.name).join('\n'));
  } catch (err) {
    console.error(err);
  }
}
run();
