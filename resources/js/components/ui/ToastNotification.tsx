import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
}

export function ToastNotification({ lightMode = true }: { lightMode?: boolean }) {
    const { flash, errors } = usePage<any>().props;
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    useEffect(() => {
        // Handle flash messages
        if (flash?.success) {
            addToast(flash.success, 'success');
        }
        if (flash?.error) {
            addToast(flash.error, 'error');
        }
        if (flash?.info) {
            addToast(flash.info, 'info');
        }

        // Handle validation errors globally
        if (errors) {
            const errorMessages = Object.values(errors);
            if (errorMessages.length > 0) {
                // Just show the first error to avoid spamming
                addToast(errorMessages[0] as string, 'error');
            }
        }
    }, [flash, errors]);

    const addToast = (message: string, type: ToastType) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
        
        // Auto remove after 4.5 seconds
        setTimeout(() => {
            removeToast(id);
        }, 4500);
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const getIcon = (type: ToastType) => {
        switch (type) {
            case 'success':
                return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
            case 'error':
                return <AlertCircle className="h-5 w-5 text-rose-500" />;
            case 'info':
            default:
                return <Info className="h-5 w-5 text-blue-500" />;
        }
    };

    const getBgColor = () => {
        return lightMode ? 'bg-white/95' : 'bg-slate-900/95';
    };

    const getTextColor = () => {
        return lightMode ? 'text-slate-700' : 'text-slate-200';
    };

    return (
        <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-3 sm:bottom-8 sm:right-8">
            <AnimatePresence>
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, x: 50, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                        className={`pointer-events-auto flex w-[350px] items-start gap-3 rounded-2xl p-4 shadow-xl backdrop-blur-md ${getBgColor()} border ${lightMode ? 'border-slate-200/50' : 'border-slate-800/50'}`}
                        style={{
                            boxShadow: lightMode 
                                ? '0 10px 40px -10px rgba(0,0,0,0.1)' 
                                : '0 10px 40px -10px rgba(0,0,0,0.5)'
                        }}
                    >
                        <div className="mt-0.5 flex-shrink-0">{getIcon(toast.type)}</div>
                        
                        <div className={`flex-1 text-sm font-medium leading-relaxed ${getTextColor()}`}>
                            {toast.message}
                        </div>
                        
                        <button
                            onClick={() => removeToast(toast.id)}
                            className={`flex-shrink-0 rounded-full p-1 transition-colors ${lightMode ? 'hover:bg-slate-100 text-slate-400' : 'hover:bg-slate-800 text-slate-500'}`}
                            aria-label="Tutup notifikasi"
                        >
                            <X size={16} />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
