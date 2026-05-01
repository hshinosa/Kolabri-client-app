/* ============================================
 * Kolabri TypeScript Definitions
 * ============================================ */

// ============ User & Auth Types ============

export type UserRole = 'lecturer' | 'student' | 'admin';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    createdAt?: string;
    updated_at: string;
}

export interface Auth {
    user: User | null;
    token?: string;
}

export interface AuthCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    role: UserRole;
}

// ============ Course Types ============

export type VectorStatus = 'pending' | 'processing' | 'ready' | 'failed' | 'skipped';

export interface Course {
    id: string;
    code: string;
    name: string;
    owner_id: string;
    join_code: string;
    created_at: string;
    updated_at?: string;
    owner?: User;
    students_count?: number;
    groups_count?: number;
    knowledge_base?: KnowledgeBase[];
    ownerName?: string;
}

export interface KnowledgeBase {
    id: string;
    course_id?: string;
    file_name: string;
    file_url?: string;
    uploaded_by?: string;
    vector_status: VectorStatus;
    uploaded_at: string;
    file_size?: number;
    file_type?: string;
    processed_at?: string | null;
    error_message?: string | null;
}

export interface CreateCourseData {
    code: string;
    name: string;
}

// ============ Group Types ============

export interface ChatSpace {
    id: string;
    group_id: string;
    name: string;
    created_at: string;
    messages_count?: number;
}

export interface Group {
    id: string;
    name: string;
    course_id: string;
    join_code?: string;
    created_at: string;
    members?: User[];
    members_count?: number;
    has_goal?: boolean;
    status?: 'green' | 'yellow' | 'red';
    chat_spaces?: ChatSpace[];
}

export interface CreateGroupData {
    name: string;
    course_id: string;
    member_ids?: string[];
}

// ============ Goal Types ============

export interface LearningGoal {
    id: string;
    group_id: string;
    content: string;
    created_by: string;
    created_at: string;
    is_validated: boolean;
    creator?: User;
}

export interface CreateGoalData {
    group_id: string;
    content: string;
}

// ============ Reflection Types ============

export type ReflectionType = 'session' | 'weekly';

export interface Reflection {
    id: string;
    user_id: string;
    course_id: string;
    goal_id: string | null;
    type: ReflectionType;
    content: string;
    ai_feedback?: string;
    chatSpace?: ChatSpace;
    created_at?: string;
    createdAt?: string;
    user?: User;
    goal?: LearningGoal;
    course?: Course;
    group?: Pick<Group, 'id' | 'name'>;
}

export interface CreateReflectionData {
    course_id: string;
    goal_id?: string;
    type: ReflectionType;
    content: string;
}

// ============ Chat Types ============

export type InteractionType = 'planning' | 'question' | 'social' | 'off-topic';
export type SenderType = 'user' | 'ai' | 'system';

export interface RagSource {
    file: string;
    page: number;
}

export interface ChatMessage {
    id: string;
    log_id: string;
    course_id: string;
    group_id: string;
    sender_id: string;
    sender_type: SenderType;
    content: string;
    created_at: string;
    interaction_type?: InteractionType;
    metadata?: {
        is_intervention?: boolean;
        is_silence_trigger?: boolean;
        rag_sources?: RagSource[];
    };
    sender?: User;
}

export interface SendMessageData {
    room: string;
    text: string;
    user_id: string;
}

export interface JoinRoomData {
    course_id: string;
    group_id: string;
}

// ============ Shared Page Props ============

export interface SharedData {
    name: string;
    auth: Auth;
    flash?: {
        success?: string;
        error?: string;
    };
    [key: string]: unknown;
}

// ============ API Response Types ============

export interface ApiResponse<T> {
    data: T;
    meta?: {
        current_page?: number;
        total_pages?: number;
        total_items?: number;
    };
}

export interface ApiError {
    message: string;
    errors?: Record<string, string[]>;
}

// ============ Enrollment Types ============

export interface Enrollment {
    course_id: string;
    user_id: string;
    enrolled_at: string;
    course?: Course;
    user?: User;
}

export interface JoinCourseData {
    join_code: string;
}

// ============ AI Chat Types ============

export interface AiMessage {
    id: string;
    conversation_id?: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

export interface AiConversation {
    id: string;
    user_id: string;
    title: string;
    created_at: string;
    updated_at: string;
    messages?: AiMessage[];
}
