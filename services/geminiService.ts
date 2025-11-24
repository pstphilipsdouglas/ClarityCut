import { GoogleGenAI } from "@google/genai";
import { CutEvent } from "../types";

// Helper to get the AI instance.
// Note: In a real production app, you might proxy this through a backend.
// We assume process.env.API_KEY is available as per instructions.
const getAI = () => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY is missing. Mocking AI response.");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateEditingReport = async (
  cuts: CutEvent[],
  duration: number
): Promise<string> => {
  const ai = getAI();
  
  // Calculate some stats to feed the AI
  const fillers = cuts.filter(c => c.type === 'filler').length;
  const cliches = cuts.filter(c => c.type === 'cliche').length;
  const silences = cuts.filter(c => c.type === 'silence').length;
  const repetitions = cuts.filter(c => c.type === 'repetition').length;
  const stutters = cuts.filter(c => c.type === 'stutter').length;
  
  const prompt = `
    You are a professional video editor assistant. I have just processed a video of ${duration.toFixed(0)} seconds.
    I automatically removed the following:
    - ${fillers} filler words (like 'um', 'uh')
    - ${cliches} clichés (like 'at the end of the day', 'hallelujah')
    - ${silences} awkward long silences
    - ${repetitions} unintentional phrase repetitions (like 'I mean, I mean')
    - ${stutters} stuttering words (like 'th-th-the')

    Please write a short, punchy, and encouraging summary (max 3 sentences) for the user about how much clearer and more professional their video sounds now. 
    Focus on the audience impact (engagement, retention) and flow. Do not use markdown.
  `;

  if (!ai) {
    return `Analysis complete! We removed ${fillers} fillers, ${cliches} clichés, ${repetitions} repetitions, and ${stutters} stutters to make your video ${((cuts.reduce((acc, c) => acc + (c.end - c.start), 0) / duration) * 100).toFixed(1)}% more concise.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Video optimization complete.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Video processed successfully. Your content is now more concise and engaging.";
  }
};

/**
 * Simulates the "Analysis" phase.
 * In a real app, this would upload the video hash or audio track to a server.
 * Here, we generate mock cuts based on video duration to demonstrate the UI.
 */
export const analyzeVideoMock = async (duration: number): Promise<CutEvent[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 2500));

  const cuts: CutEvent[] = [];
  const numberOfCuts = Math.max(5, Math.floor(duration / 10)); // Approx 1 cut every 10s for demo

  for (let i = 0; i < numberOfCuts; i++) {
    // Random start time, avoiding overlaps is handled simply by sorting later
    const start = Math.random() * (duration - 5); 
    const typeRoll = Math.random();
    
    let type: 'cliche' | 'filler' | 'silence' | 'repetition' | 'stutter' = 'filler';
    let word = 'Um';
    let length = 0.4;

    if (typeRoll < 0.35) {
        // Filler (35%)
        type = 'filler';
        const fillers = ["Um", "Uh", "Like", "You know", "Er"];
        word = fillers[Math.floor(Math.random() * fillers.length)];
    } else if (typeRoll < 0.55) {
        // Cliche (20%)
        type = 'cliche';
        const cliches = ["At the end of the day", "To be honest", "Hallelujah", "Literally", "Basically"];
        word = cliches[Math.floor(Math.random() * cliches.length)];
        length = 1.2;
    } else if (typeRoll < 0.70) {
        // Repetition (15%) - Phrase repetition
        type = 'repetition';
        const reps = ["I mean, I mean", "You know, you know", "It's just, it's just", "I was, I was", "Basically, basically"];
        word = reps[Math.floor(Math.random() * reps.length)];
        length = 1.0;
    } else if (typeRoll < 0.85) {
        // Stutter (15%) - Syllable/Word start repetition
        type = 'stutter';
        const stutters = ["Th-th-the", "P-p-please", "W-w-what", "B-b-but", "I-I", "We-we"];
        word = stutters[Math.floor(Math.random() * stutters.length)];
        length = 0.5;
    } else {
        // Silence (15%)
        type = 'silence';
        word = '(Silence)';
        length = 2.0;
    }

    cuts.push({
      id: `cut-${i}`,
      type,
      word,
      start: parseFloat(start.toFixed(2)),
      end: parseFloat((start + length).toFixed(2)),
      confidence: 0.8 + (Math.random() * 0.19),
      status: 'accepted'
    });
  }

  return cuts.sort((a, b) => a.start - b.start);
};