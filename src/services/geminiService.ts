import { ChatMessage, HabitTask, UserStats, AIAction, ChatImageAttachment } from '../types';

export interface GeminiChatResponse {
  success: boolean;
  message: string;
  actions: AIAction[];
}

export const sendGeminiChatMessage = async (
  message: string,
  history: ChatMessage[],
  currentHabits: HabitTask[],
  stats: UserStats,
  image?: ChatImageAttachment
): Promise<GeminiChatResponse> => {
  const response = await fetch('/api/gemini/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      history,
      currentHabits,
      stats,
      image,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Server error: ${response.statusText}`);
  }

  const data: GeminiChatResponse = await response.json();
  return data;
};
