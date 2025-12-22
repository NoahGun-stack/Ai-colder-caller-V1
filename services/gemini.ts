
import { GoogleGenAI } from "@google/genai";
import { ROOFING_AGENT_PROMPT } from "../constants";

export class GeminiAgentService {
  private ai: GoogleGenAI;
  private chat: any;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    this.chat = null;
  }

  async startCall(leadName: string, agentName: string) {
    const personalizedPrompt = ROOFING_AGENT_PROMPT
      .replace("[FirstName]", leadName)
      .replace("[AgentName]", agentName);

    this.chat = this.ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: personalizedPrompt,
        temperature: 0.7,
      },
    });

    const response = await this.chat.sendMessage({ message: `Start the call with: "Hi, is this ${leadName}?"` });
    return response.text;
  }

  async sendResponse(message: string) {
    if (!this.chat) throw new Error("Call not started");
    const response = await this.chat.sendMessage({ message });
    return response.text;
  }

  async getCallSummary() {
    if (!this.chat) return null;
    const summaryPrompt = "Please summarize this call. Format as JSON with fields: 'outcome' (e.g. Appointment Booked, Not Interested), 'sentiment' (Positive, Neutral, Negative), 'objections' (list of strings), and 'appointmentDetails' (null or object with day/time).";
    const response = await this.chat.sendMessage({ message: summaryPrompt });
    
    try {
        // Find JSON block if it exists
        const text = response.text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return { outcome: 'Unknown', sentiment: 'Neutral', objections: [], appointmentDetails: null };
    } catch (e) {
        return { outcome: 'Unknown', sentiment: 'Neutral', objections: [], appointmentDetails: null };
    }
  }
}
