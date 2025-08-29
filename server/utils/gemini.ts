

import {
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
} from '@google/genai';

export async function aiChat(prompt:any) {
  const ai = new GoogleGenAI({
    apiKey: Bun.env.GEMINI_API_KEY,
  });
  const config = {
    thinkingConfig: {
      thinkingBudget: -1,
    },
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,  
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,  
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,  
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE, 
      },
    ],
    systemInstruction: [
        {
          text: `You are a Retrieval-Augmented Generation (RAG) chatbot. 
You receive three inputs: 
1. Conversation history (optional, may be irrelevant). 
2. The user's latest query. 
3. Retrieved database results. 

Rules:
- Always prioritize database results when answering. 
- Clearly explain "From the database, I found..." before reasoning. 
- Ignore conversation history if it is unrelated to the current query. 
- If database results don’t contain enough info, say so explicitly. 
- Do not mix topics from unrelated past conversation.  

Additional Rules:
- If the user asks to do external research about something, you can go ahead and try making the response more fruitful.

`,
        }
    ],
  };
  const model = 'gemini-2.5-flash';
  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: JSON.stringify(prompt),
        },
      ],
    },
  ];

  const response = await ai.models.generateContent({
    model,
    config,
    contents,
  });
  
  return response.text;

}

