import axios from 'axios';
import { getErrorMessage } from './errorHandler';

export interface AiMessage {
    id: string;
    conversation_id?: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
    created_at: string;
}

export async function fetchChatMessages(chatId: string, token: string): Promise<AiMessage[]> {
    try {
        const response = await axios.get<{ data: AiMessage[] }>(
            `/student/ai-chat/${chatId}/messages`,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        return response.data.data.map(msg => ({
            ...msg,
            created_at: msg.createdAt || msg.created_at,
        }));
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}
