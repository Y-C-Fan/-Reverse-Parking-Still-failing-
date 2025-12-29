import { GoogleGenAI } from "@google/genai";
import { CarState, ParkingSpot, GameStatus } from "../types";

export const getDrivingAdvice = async (
  carState: CarState,
  parkingSpot: ParkingSpot,
  status: GameStatus,
  lastAction: string
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelId = "gemini-3-flash-preview";
    
    // Normalize coordinates for the AI to understand simpler relative positions
    const relX = (carState.x - parkingSpot.x).toFixed(1);
    const relY = (carState.y - parkingSpot.y).toFixed(1);
    const angleDeg = (carState.rotation * (180 / Math.PI)).toFixed(0);
    const steeringDeg = (carState.steeringAngle * (180 / Math.PI)).toFixed(0);

    let promptContext = "";
    if (status === GameStatus.CRASHED) {
      promptContext = "The user just crashed their car.";
    } else if (status === GameStatus.PARKED) {
      promptContext = "The user successfully parked!";
    } else {
      promptContext = "The user is currently trying to park.";
    }

    const systemInstruction = `
      You are an experienced Chinese driving instructor ("老司机"). 
      Your student is a novice trying to learn perpendicular reverse parking (倒车入库).
      Speak in Chinese (Simplified). Use standard driving terminology (e.g., "方向盘打死", "回正", "后视镜").
      Keep your advice short, punchy, and encouraging. Do not write long paragraphs.
      Analyze the car's position relative to the spot to give specific corrections.
      
      Data:
      - Car Position Relative to Spot Center: X=${relX} units, Y=${relY} units.
      - Car Angle: ${angleDeg} degrees (0 is horizontal facing right, 90 is facing down).
      - Steering: ${steeringDeg} degrees.
      - Status: ${promptContext}
      - Last Action: ${lastAction}
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: "Based on the telemetry, what should I do next or what did I do wrong?",
      config: {
        systemInstruction: systemInstruction,
        thinkingConfig: { thinkingBudget: 0 } // Fast response needed
      }
    });

    return response.text || "老司机正在思考...";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return "网络有点卡，老司机刚才没看清。再试一次？";
  }
};
