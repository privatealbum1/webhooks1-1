// app/api/kols/test-personality/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { KOLProfile } from '../../../types/kol';
import { generateSystemPrompt, addEmojis } from '../../../lib/kol-manager';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { kol_profile, message } = body;

    if (!kol_profile || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing kol_profile or message' },
        { status: 400 }
      );
    }

    // Generate system prompt from KOL profile
    const systemPrompt = generateSystemPrompt(kol_profile as KOLProfile);

    // Use Gemini to generate response
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
        systemInstruction: systemPrompt
      });

      const chat = model.startChat({
        history: [],
        generationConfig: { maxOutputTokens: 500 }
      });

      const result = await chat.sendMessage(message);
      let response = result.response.text();

      // Apply emoji based on KOL style
      response = addEmojis(response, kol_profile.voice_characteristics.emoji_usage);

      return NextResponse.json({
        success: true,
        response
      });
    } catch (aiError: any) {
      console.error('AI Error:', aiError);
      return NextResponse.json(
        { success: false, error: 'AI generation failed: ' + aiError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error testing personality:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to test personality' },
      { status: 500 }
    );
  }
}
