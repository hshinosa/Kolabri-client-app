import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, Edit3, Trash2, Pin, PinOff, Copy } from 'lucide-react';

interface MessageActionsProps {
    messageId: string;
    isOwn: boolean;
    isDeleted: boolean;
    isPinned: boolean;
    canPin: boolean;
    canDeleteOthers: boolean;
    canEdit: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onPin: () => void;
    onUnpin: () => void;
    onCopy: () => void;
}

export function MessageActions({
    messageId,
    isOwn,
    isDeleted,
    isPinned,
    canPin,
    canDeleteOthers,
    canEdit,
    onEdit,
    onDelete,
    onPin,
    onUnpin,
    onCopy,
}: MessageActionsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
                buttonRef.current?.focus();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    if (isDeleted) return null;

    const showEdit = isOwn && canEdit;
    // Hapus pesan orang lain tetap moderator/dosen; pin kini terbuka untuk semua (F6)
    const showDelete = isOwn || canDeleteOthers;
    const showPin = canPin;

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="flex h-6 w-6 items-center justify-center rounded-full opacity-0 transition-opacity hover:bg-black/10 group-hover:opacity-100 dark:hover:bg-white/10"
                aria-label="Aksi pesan"
                aria-haspopup="menu"
                aria-expanded={isOpen}
            >
                <MoreHorizontal className="h-3.5 w-3.5 text-gray-500 dark:text-gray-600" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        ref={menuRef}
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.15 }}
                        role="menu"
                        aria-label="Menu aksi pesan"
                        className={`absolute ${isOwn ? 'right-0' : 'left-0'} top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800`}
                    >
                        <button
                            role="menuitem"
                            onClick={() => { onCopy(); setIsOpen(false); }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            <Copy className="h-4 w-4" />
                            Salin teks
                        </button>

                        {showEdit && (
                            <button
                                role="menuitem"
                                onClick={() => { onEdit(); setIsOpen(false); }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                <Edit3 className="h-4 w-4" />
                                Ubah pesan
                            </button>
                        )}

                        {showPin && (
                            isPinned ? (
                                <button
                                    role="menuitem"
                                    onClick={() => { onUnpin(); setIsOpen(false); }}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    <PinOff className="h-4 w-4" />
                                    Lepas sematan
                                </button>
                            ) : (
                                <button
                                    role="menuitem"
                                    onClick={() => { onPin(); setIsOpen(false); }}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    <Pin className="h-4 w-4" />
                                    Sematkan pesan
                                </button>
                            )
                        )}

                        {showDelete && (
                            <>
                                <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                                <button
                                    role="menuitem"
                                    onClick={() => { onDelete(); setIsOpen(false); }}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Hapus pesan
                                </button>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
