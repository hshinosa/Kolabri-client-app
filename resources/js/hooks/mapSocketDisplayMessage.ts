import type { ChatDisplayMessage, ChatSocketMessage } from '@/types/chat';

/** Map socket payload to display message (history, pagination, realtime). */
export function mapSocketToDisplayMessage(msg: ChatSocketMessage): ChatDisplayMessage {
    return {
        id: msg.id,
        clientId: msg.clientId,
        sender_id: msg.senderId,
        sender_type: msg.senderType,
        sender_name: msg.senderName,
        content: msg.content,
        created_at: msg.createdAt,
        edited_at: msg.editedAt ?? null,
        is_intervention: msg.isIntervention,
        reply_to: msg.replyTo,
        attachments: msg.attachments,
        mentions: msg.mentions,
        guardrail_outcome: msg.guardrailOutcome,
        guardrail_reason: msg.guardrailReason,
        intervention_type: msg.interventionType,
        intervention_reason: msg.interventionReason,
        scaffolding_level: msg.scaffoldingLevel,
        is_relevant: msg.isRelevant,
        citations: msg.citations,
    };
}