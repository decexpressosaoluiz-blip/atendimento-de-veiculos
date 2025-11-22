
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Vehicle } from "../types";

const getAI = () => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY not found in environment.");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// --- VISION: Analyze Service Photos ---
export const analyzeServicePhoto = async (base64Image: string): Promise<{
  isVehicle: boolean;
  qualityScore: number;
  description: string;
  issues: string[];
}> => {
  const ai = getAI();
  if (!ai) return { isVehicle: true, qualityScore: 10, description: "AI Indisponível", issues: [] };

  try {
    // Remove header if present (data:image/jpeg;base64,)
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          { text: "Analise esta imagem para um relatório logístico de comprovação de presença de veículo." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isVehicle: { type: Type.BOOLEAN, description: "Se a imagem contém claramente um veículo de carga, caminhão ou utilitário." },
            qualityScore: { type: Type.INTEGER, description: "Nota de 1 a 10 para a clareza e iluminação da foto." },
            description: { type: Type.STRING, description: "Descrição ultra-breve (max 10 palavras) do que é visto." },
            issues: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING }, 
              description: "Lista de problemas (ex: 'Imagem escura', 'Placa ilegível', 'Não é um veículo')." 
            }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    throw new Error("Empty response");
  } catch (error) {
    console.error("Vision Error:", error);
    return { isVehicle: true, qualityScore: 5, description: "Erro na análise", issues: ["Falha na IA"] };
  }
};

// --- REASONING: Thinking Mode for Justifications ---
export const analyzeJustificationThinking = async (
  vehicleNumber: string,
  route: string,
  delayMinutes: number,
  category: string,
  details: string
): Promise<string> => {
  const ai = getAI();
  if (!ai) return "Serviço de IA indisponível.";

  try {
    const prompt = `
      Atue como um auditor sênior de logística. Analise esta justificativa de atraso.
      
      Veículo: ${vehicleNumber}
      Rota: ${route}
      Atraso: ${delayMinutes} minutos
      Categoria: ${category}
      Detalhes do Motorista: "${details}"
      
      Use seu raciocínio profundo para determinar se a justificativa é consistente com operações logísticas reais.
      Considere se o tempo de atraso é proporcional ao motivo alegado.
      Forneça um veredito curto para o painel administrativo.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 }, // Max thinking budget
      }
    });

    return response.text || "Análise não gerada.";
  } catch (error) {
    console.error("Thinking Error:", error);
    return "Erro ao processar análise profunda.";
  }
};

// --- CHAT: Operational Assistant ---
export const createChatSession = (vehicles: Vehicle[], context: string) => {
  const ai = getAI();
  if (!ai) return null;

  // Prepare context data about the fleet
  const vehicleContext = vehicles.map(v => {
    const stops = v.stops.map(s => `[${s.type}] ${s.unitId}: ${s.status}`).join(' -> ');
    return `- ${v.number} (${v.route}): ${stops}`;
  }).join('\n');

  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: `
        Você é o "Luiz", assistente virtual da São Luiz Express.
        Ajude o operador com dúvidas sobre o sistema ou sobre a frota atual.
        Seja conciso, amigável e profissional.
        
        Dados atuais das viagens:
        ${vehicleContext}
        
        Contexto do Usuário: ${context}
      `
    }
  });
};
