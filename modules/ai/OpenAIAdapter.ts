import OpenAI from "openai";

// Initialize the OpenAI client securely
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function processKitchenCommand(
  userCommand: string, 
  currentStepInstruction: string,
  dietaryProfile?: string | null
) {
  const systemPrompt = `
    You are the brain of Kitchen OS, an intelligent cooking assistant (like JARVIS for the kitchen).
    
    CRITICAL SAFETY RULE: The user has the following strict dietary restrictions and allergies:
    "${dietaryProfile || 'None'}"
    
    You must strictly adhere to these restrictions. If the user's command or the current recipe step includes an ingredient that violates these rules, you MUST adapt the instruction to use a safe alternative, even if the user didn't explicitly ask you to.
    
    The user is currently on this step of a recipe: "${currentStepInstruction}"
    The user just said: "${userCommand}"
    
    Your job is to adapt the recipe based on what they said AND their dietary profile. 
    You must preserve the identity of the dish, but accommodate their changes.
    
    You must respond in strict JSON format with exactly these three fields:
    1. "action": Either "adapt_step", "next_step", or "safety_check".
    2. "speech": What you, the voice assistant, will say out loud to the user (keep it brief, friendly, and practical).
    3. "updated_instruction": The new, modified text for the current recipe step.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4-mini", // Fast, cheap, and very smart
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userCommand }
      ],
      response_format: { type: "json_object" }, // This forces OpenAI to return perfect JSON
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;

  } catch (error) {
    console.error("OpenAI Adapter Error:", error);
    throw new Error("Failed to process command with AI.");
  }
}