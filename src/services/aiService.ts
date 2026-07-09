import { GoogleGenAI, Type } from "@google/genai";
import { ClientToVisit, ItineraryDay } from "../types";

let aiInstance: GoogleGenAI | null = null;

function getAi() {
  if (!aiInstance) {
    // Si la variable d'environnement n'est pas définie, vous pouvez coller votre clé ici
    const HARDCODED_API_KEY = "AIzaSyCLzbEvRxkzPkZjz5GBXoWeUPgZ3dlxlkw";

    const apiKey = process.env.GEMINI_API_KEY || HARDCODED_API_KEY;

    if (!apiKey || apiKey.includes("VOTRE_CLE_API_ICI")) {
      throw new Error("Clé API Gemini manquante. Veuillez configurer GEMINI_API_KEY ou remplacer VOTRE_CLE_API_ICI dans aiService.ts.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function generateItineraries(clientsToVisit: ClientToVisit[]): Promise<ItineraryDay[]> {
  if (clientsToVisit.length === 0) return [];

  const promptStr = `
Tu es un assistant de planification d'itinéraires en Algérie.
Voici une liste de clients chez qui il faut récupérer des documents :
${JSON.stringify(clientsToVisit, null, 2)}

Ta tâche :
Propose un ou plusieurs itinéraires de déplacement optimisés.
Règles strictes :
1. Tu es basé à la wilaya de Tlemcen. Tous les déplacements pour une journée doivent avoir pour point de départ ET point d'arrivée la wilaya de Tlemcen.
2. Un itinéraire journalier (jour) peut jumeler des wilayas proches (ex: Tlemcen, Sidi Bel Abbès, Ain Temouchent, Oran).
3. Le temps de travail max est de 10h par jour (incluant le trajet aller-retour depuis Tlemcen, le trajet entre wilayas, et environ 1h d'entrevue chez chaque client).
4. Regroupe logiquement les clients par proximité géographique pour optimiser les jours.
5. Inclus le clientId et projectId de chaque client visité.
6. Retourne ton résultat au format JSON.
`;

  try {
    const response = await getAi().models.generateContent({
      model: "gemini-2.0-flash",
      contents: promptStr,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              jour: {
                type: Type.NUMBER,
                description: "Le numéro du jour (1, 2, ...)",
              },
              wilayas: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "La ou les wilayas visitées pendant ce jour"
              },
              tempsEstime: {
                type: Type.STRING,
                description: "Temps total estimé pour la journée (trajet + entrevues) (ex: '8h')"
              },
              clients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    wilaya: { type: Type.STRING },
                    clientId: { type: Type.STRING },
                    projectId: { type: Type.STRING },
                    documents: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Liste des documents manquants à récupérer"
                    }
                  },
                  required: ["name", "wilaya", "clientId", "projectId", "documents"]
                }
              }
            },
            required: ["jour", "wilayas", "tempsEstime", "clients"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];

    const data = JSON.parse(text);
    return data as ItineraryDay[];
  } catch (error) {
    console.error("Erreur gènèration itinéraire:", error);
    throw error;
  }
}
