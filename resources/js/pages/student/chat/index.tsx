import { Head, usePage, Link } from '@inertiajs/react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useState, useEffect, useRef, FormEvent, useMemo, ChangeEvent, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { MessageSquare, Send, Paperclip, X, CornerUpLeft, Users } from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import { useStudentNav } from '@/components/navigation/student-nav';
import { Course, SharedData, LearningGoal } from '@/types';
import student from '@/routes/student';
import { LiquidGlassCard } from '@/components/Welcome/utils/helpers';

interface GroupMember {
    id: string;
    name: string;
    email: string;
    avatar?: string;
}

interface ChatSpaceGoal {
    id: string;
    content: string;
    isValidated: boolean;
    createdBy: {
        id: string;
        name: string;
    };
    createdAt: string;
}

interface ChatSpace {
    id: string;
    name: string;
    description?: string;
    isDefault: boolean;
    myGoal?: ChatSpaceGoal | null;
}

interface Group {
    id: string;
    name: string;
    members?: GroupMember[];
    chatSpaces?: ChatSpace[];
}

interface ReplyTo {
    messageId: string;
    senderId: string;
    senderName: string;
    content: string;
}

interface FileAttachment {
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
    previewUrl?: string;
}

interface SocketChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    senderType: string;
    content: string;
    createdAt: string;
    isIntervention?: boolean;
    replyTo?: ReplyTo;
    attachments?: FileAttachment[];
    mentions?: string[];
}

interface DisplayMessage {
    id: string;
    sender_id: string;
    sender_type: string;
    sender_name: string;
    content: string;
    created_at: string;
    is_intervention?: boolean;
    reply_to?: ReplyTo;
    attachments?: FileAttachment[];
    mentions?: string[];
}

interface ProcessedMessage extends DisplayMessage {
    showAvatar: boolean;
    showName: boolean;
    showTime: boolean;
    isGrouped: boolean;
}

interface PendingFile {
    file: File;
    preview?: string;
    id: string;
}

interface OnlineUser {
    odId: string;
    userName: string;
}

interface Props {
    course: Course;
    group: Group;
    goal: LearningGoal | null;
    hasGoal: boolean;
    socketUrl?: string;
}

// Helper to check if two messages are in the same minute
const isSameMinute = (date1: string, date2: string): boolean => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate() &&
           d1.getHours() === d2.getHours() &&
           d1.getMinutes() === d2.getMinutes();
};

// Avatar component
const Avatar = ({ 
    name, 
    type, 
    className = '' 
}: { 
    name: string; 
    type: 'user' | 'ai' | 'bot'; 
    className?: string;
}) => {
    const bgColor = type === 'ai' || type === 'bot' 
        ? 'bg-[rgba(136,22,28,0.08)] border border-[rgba(136,22,28,0.12)]' 
        : 'bg-[rgba(107,114,128,0.08)] border border-[rgba(255,255,255,0.5)]';
    
    return (
        <div className={`flex items-center justify-center rounded-full ${bgColor} ${className}`}>
            {type === 'ai' || type === 'bot' ? (
                <svg className="h-4 w-4 text-[#88161c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
            ) : (
                <span className="text-sm font-bold text-[#4A4A4A]">
                    {name?.charAt(0)?.toUpperCase() || '?'}
                </span>
            )}
        </div>
    );
};

// Style constants matching the design system
const headingStyle = {
    color: '#4A4A4A',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
} as const;

export default function StudentChatIndex({ course, group, goal, hasGoal, socketUrl }: Props) {
    const { auth } = usePage<SharedData>().props;
    const navItems = useStudentNav('chat-room', { courseId: course.id });
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [replyingTo, setReplyingTo] = useState<ReplyTo | null>(null);
    const [isScrolling, setIsScrolling] = useState(false);
    const [showGoalBanner, setShowGoalBanner] = useState(!hasGoal);
    
    // Chat space state - default to first chat space
    const [activeChatSpaceId] = useState<string | null>(
        group.chatSpaces?.[0]?.id || null
    );
    
    // Get active chat space
    const activeChatSpace = useMemo(() => 
        group.chatSpaces?.find(cs => cs.id === activeChatSpaceId) || group.chatSpaces?.[0] || null,
        [group.chatSpaces, activeChatSpaceId]
    );
    
    // File upload state
    const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    
    // Mention state
    const [showMentionList, setShowMentionList] = useState(false);
    const [mentionFilter, setMentionFilter] = useState('');
    const [mentionStartIndex, setMentionStartIndex] = useState(-1);
    const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
    
    // Image preview state
    const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
    const [imageZoom, setImageZoom] = useState(1);
    
    // Online users state
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    
    // Right sidebar state (mobile)
    const [showRightSidebar, setShowRightSidebar] = useState(false);
    
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const socketRef = useRef<Socket | null>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Filter members for mention suggestions
    const filteredMembers = useMemo(() => {
        if (!group.members) return [];
        const filter = mentionFilter.toLowerCase();
        return group.members.filter(
            (member) =>
                member.id !== auth.user?.id &&
                (member.name.toLowerCase().includes(filter) ||
                 member.email.toLowerCase().includes(filter))
        );
    }, [group.members, mentionFilter, auth.user?.id]);

    // Process messages to determine grouping (show avatar on FIRST message of consecutive group - at top)
    const processedMessages = useMemo((): ProcessedMessage[] => {
        return messages.map((message, index) => {
            const nextMessage = messages[index + 1];
            const prevMessage = messages[index - 1];
            
            // Check if this is the last message in a consecutive group from same sender
            const isLastInGroup = !nextMessage || 
                nextMessage.sender_id !== message.sender_id ||
                !isSameMinute(message.created_at, nextMessage.created_at);
            
            // Check if this is the first message in a consecutive group
            const isFirstInGroup = !prevMessage || 
                prevMessage.sender_id !== message.sender_id ||
                !isSameMinute(message.created_at, prevMessage.created_at);

            return {
                ...message,
                showAvatar: isFirstInGroup, // Avatar on FIRST (top) message of group
                showName: isFirstInGroup,
                showTime: isLastInGroup,
                isGrouped: !isFirstInGroup,
            };
        });
    }, [messages]);

    useEffect(() => {
        if (!auth.token) {
            setConnectionError('No authentication token available');
            return;
        }

        if (!course?.id || !group?.id || !activeChatSpace?.id) {
            setConnectionError('Missing course, group, or chat space information');
            return;
        }

        const apiUrl = socketUrl || import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';

        socketRef.current = io(apiUrl, {
            auth: { token: auth.token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socketRef.current.on('connect', () => {
            setConnectionError(null);
            socketRef.current?.emit('join_room', { 
                courseId: course.id, 
                groupId: group.id,
                chatSpaceId: activeChatSpace.id
            });
        });

        socketRef.current.on('connect_error', (error) => {
            setConnectionError(`Connection failed: ${error.message}`);
            setIsConnected(false);
        });

        socketRef.current.on('room_joined', () => {
            setIsConnected(true);
            setConnectionError(null);
        });

        socketRef.current.on('chat_history', (data: { messages: SocketChatMessage[] }) => {
            // Load chat history
            const historyMessages: DisplayMessage[] = data.messages.map((msg) => ({
                id: msg.id,
                sender_id: msg.senderId,
                sender_type: msg.senderType,
                sender_name: msg.senderName,
                content: msg.content,
                created_at: msg.createdAt,
                is_intervention: msg.isIntervention,
                reply_to: msg.replyTo,
                attachments: msg.attachments,
                mentions: msg.mentions,
            }));
            setMessages(historyMessages);
        });

        socketRef.current.on('disconnect', () => {
            setIsConnected(false);
        });

        socketRef.current.on('error', (data: { message: string }) => {
            setConnectionError(data.message);
            setIsConnected(false);
        });

        socketRef.current.on('receive_message', (message: SocketChatMessage) => {
            const displayMessage: DisplayMessage = {
                id: message.id,
                sender_id: message.senderId,
                sender_type: message.senderType,
                sender_name: message.senderName,
                content: message.content,
                created_at: message.createdAt,
                is_intervention: message.isIntervention,
                reply_to: message.replyTo,
                attachments: message.attachments,
                mentions: message.mentions,
            };
            setMessages((prev) => [...prev, displayMessage]);
        });

        socketRef.current.on('message_deleted', (data: { messageId: string }) => {
            setMessages((prev) => prev.filter((msg) => msg.id !== data.messageId));
        });

        socketRef.current.on('user_typing', (data: { userId: string; userName: string; isTyping: boolean }) => {
            setTypingUsers((prev) => {
                if (data.isTyping) {
                    return prev.includes(data.userName) ? prev : [...prev, data.userName];
                }
                return prev.filter((name) => name !== data.userName);
            });
        });

        // Listen for online users updates
        socketRef.current.on('online_users', (data: { users: OnlineUser[] }) => {
            setOnlineUsers(data.users);
        });

        socketRef.current.on('user_joined', (data: { userId: string; userName: string }) => {
            setOnlineUsers((prev) => {
                if (prev.some((u) => u.odId === data.userId)) return prev;
                return [...prev, { odId: data.userId, userName: data.userName }];
            });
        });

        socketRef.current.on('user_left', (data: { userId: string }) => {
            setOnlineUsers((prev) => prev.filter((u) => u.odId !== data.userId));
        });

        return () => {
            // Use chatSpaceId as roomId
            const roomId = activeChatSpace.id;
            socketRef.current?.emit('leave_room', roomId);
            socketRef.current?.disconnect();
        };
    }, [auth.token, course?.id, group?.id, activeChatSpace?.id, socketUrl]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (container) {
            // Use scrollTop instead of scrollIntoView to prevent page scroll
            container.scrollTop = container.scrollHeight;
        }
    }, [messages]);

    // Handle scroll to show/hide scrollbar
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            setIsScrolling(true);
            
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
            
            scrollTimeoutRef.current = setTimeout(() => {
                setIsScrolling(false);
            }, 1500);
        };

        container.addEventListener('scroll', handleScroll);
        return () => {
            container.removeEventListener('scroll', handleScroll);
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    const handleTyping = () => {
        if (!isTyping && activeChatSpace) {
            setIsTyping(true);
            const roomId = activeChatSpace.id;
            socketRef.current?.emit('typing', { roomId, isTyping: true });
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            if (activeChatSpace) {
                const roomId = activeChatSpace.id;
                socketRef.current?.emit('typing', { roomId, isTyping: false });
            }
        }, 2000);
    };

    // Stop typing when input loses focus
    const handleInputBlur = () => {
        if (isTyping && activeChatSpace) {
            setIsTyping(false);
            const roomId = activeChatSpace.id;
            socketRef.current?.emit('typing', { roomId, isTyping: false });
        }
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
        // Delay hiding mention list to allow click on suggestions
        setTimeout(() => setShowMentionList(false), 200);
    };

    // Handle file selection
    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newFiles: PendingFile[] = Array.from(files).map((file) => {
            const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            let preview: string | undefined;
            
            if (file.type.startsWith('image/')) {
                preview = URL.createObjectURL(file);
            }
            
            return { file, preview, id };
        });

        setPendingFiles((prev) => [...prev, ...newFiles]);
        e.target.value = ''; // Reset input
    };

    // Remove pending file
    const removePendingFile = (id: string) => {
        setPendingFiles((prev) => {
            const file = prev.find((f) => f.id === id);
            if (file?.preview) {
                URL.revokeObjectURL(file.preview);
            }
            return prev.filter((f) => f.id !== id);
        });
    };

    // Handle mention input
    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setNewMessage(value);
        handleTyping();

        // Check for @ mentions
        const cursorPos = e.target.selectionStart || 0;
        const textBeforeCursor = value.slice(0, cursorPos);
        const atIndex = textBeforeCursor.lastIndexOf('@');

        if (atIndex !== -1) {
            const textAfterAt = textBeforeCursor.slice(atIndex + 1);
            // Check if there's no space after @ (still typing mention)
            if (!textAfterAt.includes(' ')) {
                setShowMentionList(true);
                setMentionFilter(textAfterAt);
                setMentionStartIndex(atIndex);
                setSelectedMentionIndex(0);
                return;
            }
        }
        setShowMentionList(false);
    };

    // Insert mention
    const insertMention = useCallback((member: GroupMember) => {
        const beforeMention = newMessage.slice(0, mentionStartIndex);
        const cursorPos = inputRef.current?.selectionStart || newMessage.length;
        const afterMention = newMessage.slice(cursorPos);
        
        const newText = `${beforeMention}@${member.name} ${afterMention}`;
        setNewMessage(newText);
        setShowMentionList(false);
        setMentionFilter('');
        inputRef.current?.focus();
    }, [newMessage, mentionStartIndex]);

    // Handle keyboard navigation in mention list
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showMentionList || filteredMembers.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedMentionIndex((prev) => 
                prev < filteredMembers.length - 1 ? prev + 1 : 0
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedMentionIndex((prev) => 
                prev > 0 ? prev - 1 : filteredMembers.length - 1
            );
        } else if (e.key === 'Enter' && showMentionList) {
            e.preventDefault();
            insertMention(filteredMembers[selectedMentionIndex]);
        } else if (e.key === 'Escape') {
            setShowMentionList(false);
        }
    };

    // Extract mentions from message
    const extractMentions = (text: string): string[] => {
        const mentions: string[] = [];
        const mentionRegex = /@(\w+(?:\s\w+)*)/g;
        let match;
        
        while ((match = mentionRegex.exec(text)) !== null) {
            const mentionName = match[1];
            const member = group.members?.find(
                (m) => m.name.toLowerCase() === mentionName.toLowerCase()
            );
            if (member) {
                mentions.push(member.id);
            }
        }
        
        return mentions;
    };

    // Format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Check if file is an image
    const isImageFile = (type: string): boolean => type.startsWith('image/');

    // Open image preview
    const openImagePreview = (url: string, name: string) => {
        setPreviewImage({ url, name });
        setImageZoom(1);
    };

    // Close image preview
    const closeImagePreview = () => {
        setPreviewImage(null);
        setImageZoom(1);
    };

    // Zoom in
    const zoomIn = () => {
        setImageZoom((prev) => Math.min(prev + 0.25, 3));
    };

    // Zoom out
    const zoomOut = () => {
        setImageZoom((prev) => Math.max(prev - 0.25, 0.5));
    };

    // Reset zoom
    const resetZoom = () => {
        setImageZoom(1);
    };

    // Download image
    const downloadImage = (url: string, name: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Handle keyboard for image preview
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!previewImage) return;
            
            if (e.key === 'Escape') {
                closeImagePreview();
            } else if (e.key === '+' || e.key === '=') {
                zoomIn();
            } else if (e.key === '-') {
                zoomOut();
            } else if (e.key === '0') {
                resetZoom();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [previewImage]);

    // Render message content with highlighted mentions
    const renderMessageContent = (content: string, mentions?: string[]) => {
        if (!mentions || mentions.length === 0) {
            return <span>{content}</span>;
        }

        // Simple highlight for @mentions
        const parts = content.split(/(@\w+(?:\s\w+)*)/g);
        return (
            <>
                {parts.map((part, i) => {
                    if (part.startsWith('@')) {
                        const mentionName = part.slice(1);
                        const isMentioned = group.members?.some(
                            (m) => m.name.toLowerCase() === mentionName.toLowerCase() &&
                                   mentions.includes(m.id)
                        );
                        if (isMentioned) {
                            return (
                                <span key={i} className="rounded bg-[rgba(136,22,28,0.12)] px-1 font-semibold text-[#88161c]">
                                    {part}
                                </span>
                            );
                        }
                    }
                    return <span key={i}>{part}</span>;
                })}
            </>
        );
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if ((!newMessage.trim() && pendingFiles.length === 0) || !socketRef.current || !activeChatSpace) return;

        // Use chatSpaceId as roomId
        const roomId = activeChatSpace.id;
        
        // Clear typing state first
        if (isTyping) {
            socketRef.current.emit('typing', { roomId, isTyping: false });
            setIsTyping(false);
        }
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }

        // Extract mentions
        const mentions = extractMentions(newMessage);

        // Upload files if any
        let attachments: FileAttachment[] = [];
        if (pendingFiles.length > 0) {
            setIsUploading(true);
            try {
                // Convert files to base64 data URLs for transmission
                // In production, you would upload to a server/S3 instead
                attachments = await Promise.all(pendingFiles.map(async (pf) => {
                    // Convert file to base64 data URL
                    const base64 = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(pf.file);
                    });
                    
                    return {
                        id: pf.id,
                        name: pf.file.name,
                        type: pf.file.type,
                        size: pf.file.size,
                        url: base64, // Use base64 for transmission
                        previewUrl: pf.file.type.startsWith('image/') ? base64 : undefined,
                    };
                }));
            } catch (error) {
                console.error('File conversion failed:', error);
            }
            setIsUploading(false);
        }
        
        socketRef.current.emit('send_message', { 
            roomId,
            courseId: course.id,
            groupId: group.id,
            content: newMessage,
            replyTo: replyingTo || undefined,
            attachments: attachments.length > 0 ? attachments : undefined,
            mentions: mentions.length > 0 ? mentions : undefined,
        });

        setNewMessage('');
        setReplyingTo(null);
        setPendingFiles([]);
    };

    const handleReply = (message: DisplayMessage) => {
        setReplyingTo({
            messageId: message.id,
            senderId: message.sender_id,
            senderName: message.sender_name,
            content: message.content,
        });
        inputRef.current?.focus();
    };

    const handleDelete = (messageId: string) => {
        if (!socketRef.current || !activeChatSpace) return;
        const roomId = activeChatSpace.id;
        socketRef.current.emit('delete_message', { roomId, messageId });
    };

    const cancelReply = () => {
        setReplyingTo(null);
    };

    const formatTime = (date: string) => {
        return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const isOwnMessage = (message: DisplayMessage) => message.sender_id === auth.user?.id;
    const isAIMessage = (message: DisplayMessage) => message.sender_type === 'ai';
    const isBotMessage = (message: DisplayMessage) => message.sender_type === 'bot';

    const getAvatarType = (message: DisplayMessage): 'user' | 'ai' | 'bot' => {
        if (isAIMessage(message)) return 'ai';
        if (isBotMessage(message)) return 'bot';
        return 'user';
    };

    const getSenderDisplayName = (message: DisplayMessage): string => {
        if (isAIMessage(message)) return 'Asisten AI';
        if (isBotMessage(message)) return 'Bot CoRegula';
        return message.sender_name;
    };

    return (
        <AppLayout title={`Chat - ${group.name}`} navItems={navItems}>
            <Head title={`Chat - ${group.name}`} />

            <div className="flex h-[calc(100vh-8rem)] min-h-0 gap-4 overflow-hidden sm:h-[calc(100vh-10rem)]">
                {/* Main Chat Area */}
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    {/* Chat Header */}
                    <LiquidGlassCard intensity="light" className="mb-4 p-4" lightMode={true}>
                        <div className="flex items-center justify-between">
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                <div 
                                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                                    style={{ 
                                        background: 'rgba(136,22,28,0.08)', 
                                        border: '1px solid rgba(136,22,28,0.12)' 
                                    }}
                                >
                                    <MessageSquare className="h-5 w-5 text-[#88161c]" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="truncate text-lg font-semibold" style={headingStyle}>
                                        {group.name}
                                    </h2>
                                    <p className="truncate text-sm text-[#6B7280]">
                                        {course.name} • Kanal
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-shrink-0 items-center gap-2">
                                {/* Online Users Avatars - compact */}
                                {isConnected && onlineUsers.length > 0 && (
                                    <div className="flex -space-x-2">
                                        {onlineUsers.slice(0, 2).map((user, index) => (
                                            <div
                                                key={user.odId}
                                                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-[#88161c]"
                                                style={{ 
                                                    zIndex: 3 - index,
                                                    background: 'rgba(136,22,28,0.1)',
                                                }}
                                                title={user.userName}
                                            >
                                                {user.userName.charAt(0).toUpperCase()}
                                            </div>
                                        ))}
                                        {onlineUsers.length > 2 && (
                                            <div 
                                                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-medium text-[#6B7280]"
                                                style={{ background: 'rgba(107,114,128,0.15)' }}
                                            >
                                                +{onlineUsers.length - 2}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {/* Mobile: Toggle right sidebar */}
                                <button
                                    onClick={() => setShowRightSidebar(!showRightSidebar)}
                                    className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6B7280] transition-colors hover:bg-white/50 lg:hidden"
                                    style={{ background: 'rgba(255,255,255,0.4)' }}
                                >
                                    <Users className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </LiquidGlassCard>

                    {/* Goal Banner - Set Goal Prompt */}
                    <AnimatePresence>
                        {showGoalBanner && !hasGoal && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-4 overflow-hidden"
                            >
                                <LiquidGlassCard intensity="light" className="p-4" lightMode={true}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <div 
                                                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                                                style={{ 
                                                    background: 'rgba(245,158,11,0.1)', 
                                                    border: '1px solid rgba(245,158,11,0.2)' 
                                                }}
                                            >
                                                <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-[#4A4A4A]" style={headingStyle}>
                                                    Tetapkan tujuan pembelajaran Anda
                                                </p>
                                                <p className="mt-0.5 text-sm text-[#6B7280]">
                                                    Bantu fokus diskusi dengan menetapkan tujuan SMART untuk sesi ini.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {activeChatSpace && (
                                                <Link
                                                    href={student.goals.create.url({ course: course.id, chatSpace: activeChatSpace.id })}
                                                    className="rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
                                                    style={{ 
                                                        background: 'linear-gradient(135deg, rgba(164,18,25,0.92) 0%, rgba(136,22,28,0.96) 100%)',
                                                        boxShadow: '0 8px 32px rgba(136,22,28,0.4)',
                                                    }}
                                                >
                                                    Tetapkan
                                                </Link>
                                            )}
                                            <button
                                                onClick={() => setShowGoalBanner(false)}
                                                className="flex h-9 w-9 items-center justify-center rounded-xl text-[#6B7280] transition-colors hover:bg-white/50"
                                                style={{ background: 'rgba(255,255,255,0.4)' }}
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </LiquidGlassCard>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Connection Error Banner */}
                    {connectionError && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4"
                        >
                            <LiquidGlassCard intensity="light" className="border-l-4 border-red-500 p-3" lightMode={true}>
                                <div className="flex items-center gap-2">
                                    <svg className="h-5 w-5 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="truncate text-sm text-red-700">{connectionError}</span>
                                </div>
                            </LiquidGlassCard>
                        </motion.div>
                    )}

                    {/* Messages Container */}
                    <LiquidGlassCard intensity="medium" className="min-h-0 flex-1 overflow-hidden p-4" lightMode={true}>
                        <div className="flex h-full flex-col">
                            <div 
                                ref={messagesContainerRef}
                                className={`min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2 ${isScrolling ? 'is-scrolling' : ''}`}
                            >
                                <LayoutGroup>
                                    <div className="space-y-1">
                                        <AnimatePresence initial={false}>
                                            {processedMessages.map((message, index) => {
                                                const ownMessage = isOwnMessage(message);
                                                
                                                return (
                                                    <motion.div
                                                        key={message.id || index}
                                                        layout
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0 }}
                                                        transition={{ layout: { duration: 0.2 } }}
                                                        className={`flex items-start gap-2 ${ownMessage ? 'flex-row-reverse' : 'flex-row'} ${message.isGrouped ? 'mt-0.5' : 'mt-3'}`}
                                                    >
                                                        {/* Avatar - show only on FIRST message of group (top), placeholder space otherwise */}
                                                        {!ownMessage && (
                                                            <div className="w-6 flex-shrink-0 pt-0.5 sm:w-8">
                                                                {message.showAvatar && (
                                                                    <Avatar 
                                                                        name={message.sender_name} 
                                                                        type={getAvatarType(message)}
                                                                        className="h-6 w-6 sm:h-8 sm:w-8"
                                                                    />
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Message Content */}
                                                        <div className={`group flex max-w-[85%] flex-col sm:max-w-[70%] ${ownMessage ? 'items-end' : 'items-start'}`}>
                                                            {/* Sender name - only on first message of group */}
                                                            {!ownMessage && message.showName && (
                                                                <span className="mb-1 ml-1 text-xs font-medium text-[#6B7280]">
                                                                    {getSenderDisplayName(message)}
                                                                </span>
                                                            )}

                                                            {/* Reply context - show what message this is replying to */}
                                                            {message.reply_to && (
                                                                <div 
                                                                    className={`mb-1 flex items-center gap-1 rounded-xl px-2 py-1 text-xs sm:px-3 sm:py-1.5 ${
                                                                        ownMessage 
                                                                            ? 'text-white' 
                                                                            : 'text-[#6B7280]'
                                                                    }`}
                                                                    style={{
                                                                        background: ownMessage 
                                                                            ? 'rgba(136,22,28,0.3)' 
                                                                            : 'rgba(107,114,128,0.15)',
                                                                    }}
                                                                >
                                                                    <CornerUpLeft className="hidden h-3 w-3 flex-shrink-0 sm:block" />
                                                                    <span className="font-medium">{message.reply_to.senderName}:</span>
                                                                    <span className="max-w-[100px] truncate sm:max-w-[150px]">{message.reply_to.content}</span>
                                                                </div>
                                                            )}

                                                            {/* File Attachments */}
                                                            {message.attachments && message.attachments.length > 0 && (
                                                                <div className="mb-1 flex flex-wrap gap-1.5 sm:gap-2">
                                                                    {message.attachments.map((attachment) => (
                                                                        <div key={attachment.id}>
                                                                            {isImageFile(attachment.type) ? (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => openImagePreview(attachment.url, attachment.name)}
                                                                                    className="block overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-[#88161c]"
                                                                                >
                                                                                    <img 
                                                                                        src={attachment.url} 
                                                                                        alt={attachment.name}
                                                                                        className="max-h-32 max-w-[180px] rounded-xl object-cover transition-transform hover:scale-105 sm:max-h-48 sm:max-w-[250px]"
                                                                                        onError={(e) => {
                                                                                            // Fallback if image fails to load
                                                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                                                        }}
                                                                                    />
                                                                                </button>
                                                                            ) : (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => downloadImage(attachment.url, attachment.name)}
                                                                                    className={`flex items-center gap-1.5 rounded-xl px-2 py-1.5 transition-colors sm:gap-2 sm:px-3 sm:py-2 ${
                                                                                        ownMessage
                                                                                            ? 'text-white'
                                                                                            : 'text-[#4A4A4A]'
                                                                                    }`}
                                                                                    style={{
                                                                                        background: ownMessage
                                                                                            ? 'rgba(136,22,28,0.3)'
                                                                                            : 'rgba(107,114,128,0.15)',
                                                                                    }}
                                                                                >
                                                                                    <svg className="h-4 w-4 flex-shrink-0 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                                    </svg>
                                                                                    <div className="min-w-0 text-left">
                                                                                        <p className="max-w-[100px] truncate text-xs font-medium sm:max-w-none sm:text-sm">{attachment.name}</p>
                                                                                        <p className="text-xs opacity-70">{formatFileSize(attachment.size)}</p>
                                                                                    </div>
                                                                                    <svg className="h-3.5 w-3.5 flex-shrink-0 opacity-60 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                                    </svg>
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            
                                                            {/* Message bubble with action buttons */}
                                                            {message.content && (
                                                                <div className="flex items-center gap-1">
                                                                    {/* Action buttons - show on left for own messages */}
                                                                    {ownMessage && (
                                                                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                                            <button
                                                                                onClick={() => handleDelete(message.id)}
                                                                                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-red-100 hover:text-red-600"
                                                                                title="Hapus pesan"
                                                                            >
                                                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                                </svg>
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleReply(message)}
                                                                                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-white/50 hover:text-[#88161c]"
                                                                                title="Balas"
                                                                            >
                                                                                <CornerUpLeft className="h-4 w-4" />
                                                                            </button>
                                                                        </div>
                                                                    )}

                                                                    <div 
                                                                        className={`rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2 ${
                                                                            ownMessage
                                                                                ? 'text-white'
                                                                                : isAIMessage(message) || isBotMessage(message)
                                                                                ? 'text-[#4A4A4A]'
                                                                                : 'text-[#4A4A4A]'
                                                                        }`}
                                                                        style={{
                                                                            background: ownMessage
                                                                                ? 'linear-gradient(135deg, rgba(164,18,25,0.92) 0%, rgba(136,22,28,0.96) 100%)'
                                                                                : isAIMessage(message) || isBotMessage(message)
                                                                                ? 'rgba(136,22,28,0.08)'
                                                                                : 'rgba(255,255,255,0.7)',
                                                                            border: ownMessage
                                                                                ? '1px solid rgba(255,255,255,0.18)'
                                                                                : isAIMessage(message) || isBotMessage(message)
                                                                                ? '1px solid rgba(136,22,28,0.15)'
                                                                                : '1px solid rgba(255,255,255,0.5)',
                                                                        }}
                                                                    >
                                                                        <p className="whitespace-pre-wrap text-sm">
                                                                            {renderMessageContent(message.content, message.mentions)}
                                                                        </p>
                                                                    </div>

                                                                    {/* Action buttons - show on right for others' messages */}
                                                                    {!ownMessage && (
                                                                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                                            <button
                                                                                onClick={() => handleReply(message)}
                                                                                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-white/50 hover:text-[#88161c]"
                                                                                title="Balas"
                                                                            >
                                                                                <CornerUpLeft className="h-4 w-4" />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Time - only on last message of group */}
                                                            {message.showTime && (
                                                                <span className="mt-1 text-xs text-[#9CA3AF]">
                                                                    {formatTime(message.created_at)}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Own message avatar placeholder for alignment */}
                                                        {ownMessage && <div className="w-6 flex-shrink-0 sm:w-8" />}
                                                    </motion.div>
                                                );
                                            })}
                                        </AnimatePresence>

                                        {/* Typing Indicator - with smooth layout animation */}
                                        <AnimatePresence mode="popLayout">
                                            {typingUsers.length > 0 && (
                                                <motion.div
                                                    layout
                                                    initial={{ opacity: 0, y: 10, height: 0 }}
                                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                                    exit={{ opacity: 0, y: -10, height: 0 }}
                                                    transition={{ 
                                                        duration: 0.3,
                                                        ease: 'easeInOut',
                                                        layout: { duration: 0.2 }
                                                    }}
                                                    className="mt-3 flex items-center gap-2 overflow-hidden"
                                                >
                                                    <motion.div 
                                                        className="flex items-center gap-1 rounded-full px-3 py-2"
                                                        style={{ background: 'rgba(107,114,128,0.1)' }}
                                                        initial={{ scale: 0.8 }}
                                                        animate={{ scale: 1 }}
                                                        exit={{ scale: 0.8 }}
                                                    >
                                                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#6B7280]" style={{ animationDelay: '0ms' }} />
                                                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#6B7280]" style={{ animationDelay: '150ms' }} />
                                                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#6B7280]" style={{ animationDelay: '300ms' }} />
                                                    </motion.div>
                                                    <motion.span 
                                                        className="text-xs text-[#6B7280]"
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -10 }}
                                                    >
                                                        {typingUsers.join(', ')} sedang mengetik...
                                                    </motion.span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </LayoutGroup>
                            </div>

                            {/* Message Input */}
                            <div className="mt-4 border-t border-white/50 pt-4">
                                {/* Reply Preview */}
                                <AnimatePresence>
                                    {replyingTo && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="mb-2 flex items-center justify-between rounded-xl border-l-4 border-[#88161c] px-3 py-2"
                                            style={{ background: 'rgba(136,22,28,0.06)' }}
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <CornerUpLeft className="hidden h-4 w-4 flex-shrink-0 text-[#88161c] sm:block" />
                                                <div className="min-w-0">
                                                    <span className="text-xs font-medium text-[#88161c]">
                                                        Membalas {replyingTo.senderName}
                                                    </span>
                                                    <p className="truncate text-xs text-[#6B7280]">{replyingTo.content}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={cancelReply}
                                                className="ml-2 flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-white/50"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Pending Files Preview */}
                                <AnimatePresence>
                                    {pendingFiles.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="mb-2 flex flex-wrap gap-1.5 sm:mb-3 sm:gap-2"
                                        >
                                            {pendingFiles.map((pf) => (
                                                <motion.div
                                                    key={pf.id}
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.8 }}
                                                    className="relative"
                                                >
                                                    {pf.preview ? (
                                                        <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-white/50 sm:h-20 sm:w-20">
                                                            <img src={pf.preview} alt={pf.file.name} className="h-full w-full object-cover" />
                                                            <button
                                                                onClick={() => removePendingFile(pf.id)}
                                                                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="relative flex items-center gap-1.5 rounded-xl border border-white/50 px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-2" style={{ background: 'rgba(255,255,255,0.5)' }}>
                                                            <svg className="h-4 w-4 text-[#6B7280] sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                            <div className="max-w-[80px] sm:max-w-[100px]">
                                                                <p className="truncate text-xs font-medium text-[#4A4A4A]">{pf.file.name}</p>
                                                                <p className="text-xs text-[#6B7280]">{formatFileSize(pf.file.size)}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => removePendingFile(pf.id)}
                                                                className="ml-1 flex h-6 w-6 items-center justify-center rounded text-[#6B7280] transition-colors hover:bg-white/50"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Mention Suggestions Popup */}
                                <AnimatePresence>
                                    {showMentionList && filteredMembers.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className="mb-2 max-h-32 overflow-y-auto rounded-xl border border-white/50 bg-white/90 shadow-lg backdrop-blur-sm sm:max-h-40"
                                        >
                                            {filteredMembers.map((member, index) => (
                                                <button
                                                    key={member.id}
                                                    onClick={() => insertMention(member)}
                                                    className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
                                                        index === selectedMentionIndex
                                                            ? 'bg-[rgba(136,22,28,0.08)]'
                                                            : 'hover:bg-[rgba(107,114,128,0.08)]'
                                                    }`}
                                                >
                                                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full sm:h-8 sm:w-8" style={{ background: 'rgba(136,22,28,0.08)' }}>
                                                        <span className="text-xs font-bold text-[#88161c] sm:text-sm">
                                                            {member.name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium text-[#4A4A4A]">{member.name}</p>
                                                        <p className="hidden truncate text-xs text-[#6B7280] sm:block">{member.email}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <form onSubmit={handleSubmit} className="flex gap-2">
                                    {/* Hidden file input */}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                    
                                    {/* File upload button */}
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={!isConnected}
                                        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-white/50 text-[#6B7280] transition-colors hover:border-[#88161c] hover:text-[#88161c] disabled:opacity-50"
                                        style={{ background: 'rgba(255,255,255,0.5)' }}
                                        title="Lampirkan file"
                                    >
                                        <Paperclip className="h-5 w-5" />
                                    </button>

                                    <div className="relative flex-1">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={newMessage}
                                            onChange={handleInputChange}
                                            onBlur={handleInputBlur}
                                            onKeyDown={handleKeyDown}
                                            placeholder={replyingTo ? `Balas ${replyingTo.senderName}...` : "Ketik @ untuk menyebut..."}
                                            className="h-11 w-full rounded-xl border border-white/50 bg-white/60 px-4 text-sm text-[#4A4A4A] placeholder-[#9CA3AF] shadow-sm outline-none transition-all focus:border-[#88161c] focus:ring-2 focus:ring-[rgba(136,22,28,0.1)] sm:text-base"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={(!newMessage.trim() && pendingFiles.length === 0) || !isConnected || isUploading}
                                        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-white transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-4"
                                        style={{
                                            background: 'linear-gradient(135deg, rgba(164,18,25,0.92) 0%, rgba(136,22,28,0.96) 100%)',
                                            boxShadow: '0 8px 32px rgba(136,22,28,0.4)',
                                        }}
                                    >
                                        {isUploading ? (
                                            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                        ) : (
                                            <>
                                                <span className="hidden sm:mr-1 sm:inline text-sm font-medium">Kirim</span>
                                                <Send className="h-4 w-4" />
                                            </>
                                        )}
                                    </button>
                                </form>
                                <p className="mt-2 text-center text-xs text-[#9CA3AF]">
                                    Tips: Sebut <span className="font-medium text-[#88161c]">@agent</span> untuk memberikan tugas atau merangkum diskusi.
                                </p>
                            </div>
                        </div>
                    </LiquidGlassCard>
                </div>

                {/* Right Sidebar - Desktop */}
                <aside className="hidden w-72 flex-shrink-0 flex-col gap-4 overflow-y-auto lg:flex">
                    {/* My Goal Section */}
                    {hasGoal && goal && (
                        <LiquidGlassCard intensity="light" className="p-4" lightMode={true}>
                            <div className="mb-2 flex items-center gap-2">
                                <div 
                                    className="flex h-8 w-8 items-center justify-center rounded-xl"
                                    style={{ background: 'rgba(136,22,28,0.08)', border: '1px solid rgba(136,22,28,0.12)' }}
                                >
                                    <svg className="h-4 w-4 text-[#88161c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#88161c]">
                                    Tujuan Saya
                                </h3>
                            </div>
                            <p className="text-sm text-[#4A4A4A]">
                                {goal.content}
                            </p>
                        </LiquidGlassCard>
                    )}

                    {/* Set Goal Prompt - Desktop */}
                    {!hasGoal && (
                        <LiquidGlassCard intensity="light" className="p-4" lightMode={true}>
                            <div className="mb-2 flex items-center gap-2">
                                <div 
                                    className="flex h-8 w-8 items-center justify-center rounded-xl"
                                    style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}
                                >
                                    <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                </div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                                    Belum Ada Tujuan
                                </h3>
                            </div>
                            <p className="mb-3 text-xs text-[#6B7280]">
                                Tetapkan tujuan untuk membantu fokus diskusi Anda.
                            </p>
                            {activeChatSpace && (
                                <Link
                                    href={student.goals.create.url({ course: course.id, chatSpace: activeChatSpace.id })}
                                    className="block w-full rounded-xl px-3 py-2 text-center text-xs font-medium text-white transition-opacity hover:opacity-90"
                                    style={{ 
                                        background: 'linear-gradient(135deg, rgba(164,18,25,0.92) 0%, rgba(136,22,28,0.96) 100%)',
                                        boxShadow: '0 8px 32px rgba(136,22,28,0.4)',
                                    }}
                                >
                                    Tetapkan Tujuan
                                </Link>
                            )}
                        </LiquidGlassCard>
                    )}

                    {/* Members Section */}
                    <LiquidGlassCard intensity="light" className="p-4" lightMode={true}>
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                                Anggota
                            </h3>
                            <span className="text-xs text-[#9CA3AF]">{group.members?.length || 0}</span>
                        </div>
                        <div className="space-y-2">
                            {group.members?.map((member) => {
                                const isOnline = onlineUsers.some(u => u.odId === member.id);
                                return (
                                    <div key={member.id} className="flex items-center gap-3">
                                        <div className="relative">
                                            <div 
                                                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-[#88161c]"
                                                style={{ background: 'rgba(136,22,28,0.08)', border: '1px solid rgba(136,22,28,0.12)' }}
                                            >
                                                {member.name.charAt(0).toUpperCase()}
                                            </div>
                                            {isOnline && (
                                                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-[#4A4A4A]">
                                                {member.name}
                                                {member.id === auth.user?.id && (
                                                    <span className="ml-1 text-xs text-[#9CA3AF]">(kamu)</span>
                                                )}
                                            </p>
                                            <p className="truncate text-xs text-[#6B7280]">
                                                {isOnline ? 'Aktif' : 'Tidak aktif'}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </LiquidGlassCard>

                    {/* Shared Resources Section */}
                    <LiquidGlassCard intensity="light" className="p-4" lightMode={true}>
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                            Sumber Daya Bersama
                        </h3>
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/30">
                                <div 
                                    className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold text-blue-600"
                                    style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}
                                >
                                    DOC
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-[#4A4A4A]">
                                        Panduan Mata Kuliah
                                    </p>
                                    <p className="text-xs text-[#6B7280]">Dibagikan oleh dosen</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/30">
                                <div 
                                    className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold text-green-600"
                                    style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}
                                >
                                    PDF
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-[#4A4A4A]">
                                        Template Tugas
                                    </p>
                                    <p className="text-xs text-[#6B7280]">Ditambahkan 2 jam lalu</p>
                                </div>
                            </div>
                        </div>
                    </LiquidGlassCard>
                </aside>

                {/* Right Sidebar - Mobile Overlay */}
                <AnimatePresence>
                    {showRightSidebar && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.5 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                onClick={() => setShowRightSidebar(false)}
                                className="fixed inset-0 z-40 bg-black lg:hidden"
                            />
                            <motion.aside
                                initial={{ x: 288 }}
                                animate={{ x: 0 }}
                                exit={{ x: 288 }}
                                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                                className="fixed inset-y-0 right-0 z-50 w-72 overflow-y-auto border-l border-white/50 p-4 lg:hidden"
                                style={{ 
                                    background: 'linear-gradient(135deg, #f5f0f0 0%, #e8e4f0 50%, #f0e8e8 100%)',
                                }}
                            >
                                {/* Close button */}
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="font-semibold text-[#4A4A4A]" style={headingStyle}>Detail</h2>
                                    <button
                                        onClick={() => setShowRightSidebar(false)}
                                        className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6B7280] transition-colors hover:bg-white/50"
                                        style={{ background: 'rgba(255,255,255,0.4)' }}
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                {/* My Goal Section - Mobile */}
                                {hasGoal && goal && (
                                    <LiquidGlassCard intensity="light" className="mb-4 p-3" lightMode={true}>
                                        <div className="mb-2 flex items-center gap-2">
                                            <div 
                                                className="flex h-8 w-8 items-center justify-center rounded-xl"
                                                style={{ background: 'rgba(136,22,28,0.08)', border: '1px solid rgba(136,22,28,0.12)' }}
                                            >
                                                <svg className="h-4 w-4 text-[#88161c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#88161c]">
                                                Tujuan Saya
                                            </h3>
                                        </div>
                                        <p className="text-sm text-[#4A4A4A]">
                                            {goal.content}
                                        </p>
                                    </LiquidGlassCard>
                                )}

                                {/* Set Goal Prompt - Mobile */}
                                {!hasGoal && (
                                    <LiquidGlassCard intensity="light" className="mb-4 p-3" lightMode={true}>
                                        <div className="mb-2 flex items-center gap-2">
                                            <div 
                                                className="flex h-8 w-8 items-center justify-center rounded-xl"
                                                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}
                                            >
                                                <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                                </svg>
                                            </div>
                                            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                                                Belum Ada Tujuan
                                            </h3>
                                        </div>
                                        <p className="mb-3 text-xs text-[#6B7280]">
                                            Tetapkan tujuan untuk membantu fokus diskusi Anda.
                                        </p>
                                        {activeChatSpace && (
                                            <Link
                                                href={student.goals.create.url({ course: course.id, chatSpace: activeChatSpace.id })}
                                                className="block w-full rounded-xl px-3 py-2 text-center text-xs font-medium text-white transition-opacity hover:opacity-90"
                                                style={{ 
                                                    background: 'linear-gradient(135deg, rgba(164,18,25,0.92) 0%, rgba(136,22,28,0.96) 100%)',
                                                    boxShadow: '0 8px 32px rgba(136,22,28,0.4)',
                                                }}
                                            >
                                                Tetapkan Tujuan
                                            </Link>
                                        )}
                                    </LiquidGlassCard>
                                )}

                                {/* Members Section */}
                                <div className="mb-6">
                                    <div className="mb-3 flex items-center justify-between">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                                            Anggota
                                        </h3>
                                        <span className="text-xs text-[#9CA3AF]">{group.members?.length || 0}</span>
                                    </div>
                                    <div className="space-y-2">
                                        {group.members?.map((member) => {
                                            const isOnline = onlineUsers.some(u => u.odId === member.id);
                                            return (
                                                <div key={member.id} className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <div 
                                                            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-[#88161c]"
                                                            style={{ background: 'rgba(136,22,28,0.08)', border: '1px solid rgba(136,22,28,0.12)' }}
                                                        >
                                                            {member.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        {isOnline && (
                                                            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium text-[#4A4A4A]">
                                                            {member.name}
                                                            {member.id === auth.user?.id && (
                                                                <span className="ml-1 text-xs text-[#9CA3AF]">(kamu)</span>
                                                            )}
                                                        </p>
                                                        <p className="truncate text-xs text-[#6B7280]">
                                                            {isOnline ? 'Aktif' : 'Tidak aktif'}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Shared Resources Section */}
                                <div>
                                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                                        Sumber Daya Bersama
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/30">
                                            <div 
                                                className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold text-blue-600"
                                                style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}
                                            >
                                                DOC
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-[#4A4A4A]">
                                                    Panduan Mata Kuliah
                                                </p>
                                                <p className="text-xs text-[#6B7280]">Dibagikan oleh dosen</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/30">
                                            <div 
                                                className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold text-green-600"
                                                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}
                                            >
                                                PDF
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-[#4A4A4A]">
                                                    Template Tugas
                                                </p>
                                                <p className="text-xs text-[#6B7280]">Ditambahkan 2 jam lalu</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.aside>
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* Image Preview Modal */}
            <AnimatePresence>
                {previewImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-4"
                        onClick={closeImagePreview}
                    >
                        {/* Close button */}
                        <button
                            onClick={closeImagePreview}
                            className="absolute right-2 top-2 rounded-full bg-white/10 p-1.5 text-white transition-colors hover:bg-white/20 sm:right-4 sm:top-4 sm:p-2"
                        >
                            <X className="h-5 w-5 sm:h-6 sm:w-6" />
                        </button>

                        {/* Image name */}
                        <div className="absolute left-2 top-2 max-w-[50%] truncate text-xs text-white/70 sm:left-4 sm:top-4 sm:max-w-none sm:text-sm">
                            {previewImage.name}
                        </div>

                        {/* Zoom controls */}
                        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/10 px-2 py-1.5 backdrop-blur-sm sm:bottom-4 sm:gap-2 sm:px-4 sm:py-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); zoomOut(); }}
                                disabled={imageZoom <= 0.5}
                                className="rounded-full p-1.5 text-white transition-colors hover:bg-white/20 disabled:opacity-50 sm:p-2"
                                title="Perkecil (-)"
                            >
                                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                                </svg>
                            </button>
                            
                            <button
                                onClick={(e) => { e.stopPropagation(); resetZoom(); }}
                                className="min-w-[50px] rounded-full px-2 py-0.5 text-xs font-medium text-white transition-colors hover:bg-white/20 sm:min-w-[60px] sm:px-3 sm:py-1 sm:text-sm"
                                title="Reset zoom (0)"
                            >
                                {Math.round(imageZoom * 100)}%
                            </button>
                            
                            <button
                                onClick={(e) => { e.stopPropagation(); zoomIn(); }}
                                disabled={imageZoom >= 3}
                                className="rounded-full p-1.5 text-white transition-colors hover:bg-white/20 disabled:opacity-50 sm:p-2"
                                title="Perbesar (+)"
                            >
                                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                </svg>
                            </button>

                            <div className="mx-1 h-5 w-px bg-white/30 sm:mx-2 sm:h-6" />

                            <button
                                onClick={(e) => { e.stopPropagation(); downloadImage(previewImage.url, previewImage.name); }}
                                className="rounded-full p-1.5 text-white transition-colors hover:bg-white/20 sm:p-2"
                                title="Unduh gambar"
                            >
                                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </button>
                        </div>

                        {/* Image container */}
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="flex max-h-[75vh] max-w-[95vw] items-center justify-center overflow-hidden sm:max-h-[80vh] sm:max-w-[90vw]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img
                                src={previewImage.url}
                                alt={previewImage.name}
                                className="max-h-[75vh] max-w-[95vw] object-contain transition-transform duration-200 sm:max-h-[80vh] sm:max-w-[90vw]"
                                style={{ transform: `scale(${imageZoom})` }}
                                draggable={false}
                            />
                        </motion.div>

                        {/* Keyboard shortcuts hint - hidden on mobile */}
                        <div className="absolute bottom-2 right-2 hidden text-xs text-white/50 sm:bottom-4 sm:right-4 sm:block">
                            <span className="rounded bg-white/10 px-1.5 py-0.5">Esc</span> tutup
                            <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5">+/-</span> zoom
                            <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5">0</span> reset
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </AppLayout>
    );
}
