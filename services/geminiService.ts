import { GoogleGenAI, Type, Modality } from "@google/genai";

// Utility to get AI instance.
// Note: For Veo, we re-instantiate to ensure fresh key if selected via UI.
const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  // 1. Text Generation (Chat/Thinking/Grounding) with Multimodal Support
  chat: async (
    history: any[], // Accepts mixed content history
    message: string,
    images: { mimeType: string; data: string }[] = [],
    mode: 'fast' | 'reasoning' | 'search' = 'fast'
  ) => {
    const ai = getAi();
    let model = 'gemini-3-pro-preview';
    let config: any = {};

    if (mode === 'fast') {
      model = 'gemini-flash-lite-latest'; // Fast responses
    } else if (mode === 'reasoning') {
        model = 'gemini-3-pro-preview';
        config = { thinkingConfig: { thinkingBudget: 16000 } }; // Thinking mode
    } else if (mode === 'search') {
      model = 'gemini-3-flash-preview';
      config = { tools: [{ googleSearch: {} }] }; // Grounding
    }

    const chatSession = ai.chats.create({
      model,
      config: {
        systemInstruction: "You are the RizqUp Agent, a hyper-intelligent AI for RaisinEx.uz. You are capable of analyzing images, reasoning deeply, and writing code. If asked to visualize something simple, prefer writing SVG code.",
        ...config
      },
      history
    });

    const msgContent: any[] = [{ text: message }];
    images.forEach(img => {
        msgContent.push({ inlineData: img });
    });

    const result = await chatSession.sendMessage({ message: msgContent });
    return result;
  },

  // 2. Maps Grounding
  askMaps: async (query: string, userLoc?: { lat: number; lng: number }) => {
    const ai = getAi();
    const config: any = {
      tools: [{ googleMaps: {} }],
    };

    if (userLoc) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: userLoc.lat,
            longitude: userLoc.lng
          }
        }
      };
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: query,
      config
    });
    return response;
  },

  // 3. Image Generation (Imagen / Nano Banana)
  generateImage: async (
    prompt: string, 
    size: '1K' | '2K' | '4K' = '1K',
    options?: { style?: string; negativePrompt?: string; seed?: number }
  ) => {
    const ai = getAi();
    
    let finalPrompt = prompt;
    if (options?.style && options.style !== 'None') {
      finalPrompt += `\n\nStyle: ${options.style}`;
    }
    if (options?.negativePrompt) {
      finalPrompt += `\n\nNegative Prompt: ${options.negativePrompt}`;
    }

    const config: any = {
      imageConfig: {
        imageSize: size,
        aspectRatio: "1:1"
      }
    };

    if (options?.seed !== undefined && !isNaN(options.seed)) {
      config.seed = options.seed;
    }
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: finalPrompt }] },
      config
    });

    return response;
  },

  // 4. Image Editing (Nano Banana)
  editImage: async (base64Image: string, prompt: string, mimeType: string) => {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: base64Image, mimeType } },
                { text: prompt }
            ]
        }
    });
    return response;
  },

  // 5. Image Analysis (Multimodal)
  analyzeImage: async (base64Image: string, prompt: string, mimeType: string) => {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType } },
          { text: prompt }
        ]
      }
    });
    return response.text;
  },

  // 6. Text to Speech
  generateSpeech: async (text: string, voiceName: string = 'Fenrir') => {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  },

  // 7. Video Generation (Veo)
  generateVideo: async (prompt: string, aspectRatio: '16:9' | '9:16', image?: { data: string, mimeType: string }) => {
    // Veo requires fresh instance for key selection
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let operation;
    const model = 'veo-3.1-fast-generate-preview';
    const config = {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio
    };

    if (image) {
        // Image-to-Video
        operation = await ai.models.generateVideos({
            model,
            prompt, 
            image: {
                imageBytes: image.data,
                mimeType: image.mimeType
            },
            config
        });
    } else {
        // Text-to-Video
        operation = await ai.models.generateVideos({
            model,
            prompt,
            config
        });
    }

    // Polling logic
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    return operation.response?.generatedVideos?.[0]?.video?.uri;
  },

  // 8. Data Analysis
  analyzeData: async (rawData: string, userQuery: string) => {
    const ai = getAi();
    const prompt = `
      You are a specialized Data Analysis Module. 
      Analyze the following raw data and the user's query.
      
      Raw Data:
      ${rawData}

      User Query:
      ${userQuery}

      Task:
      1. Clean and interpret the data.
      2. Identify the most relevant data points to visualize based on the query.
      3. Generate a JSON object strictly following this schema:
      {
        "summary": "A high-level executive summary of the insight (max 50 words).",
        "details": "Bullet points of key findings.",
        "chartConfig": {
          "type": "bar", // or "line" or "area"
          "title": "Chart Title",
          "xAxisLabel": "X Axis Label",
          "yAxisLabel": "Y Axis Label",
          "labels": ["Label1", "Label2", ...], // X-axis categories
          "data": [10, 25, ...] // Y-axis values
        }
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || "{}");
  }
};