import { useState, useEffect, forwardRef } from 'react';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    lightMode?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
    ({ lightMode = true, className = '', style, ...props }, ref) => {
        const [showPassword, setShowPassword] = useState(false);
        const [capsLockActive, setCapsLockActive] = useState(false);

        useEffect(() => {
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.getModifierState) {
                    setCapsLockActive(e.getModifierState('CapsLock'));
                }
            };
            
            // Listen on window to catch caps lock state changes even when input isn't focused
            window.addEventListener('keydown', handleKeyDown);
            window.addEventListener('keyup', handleKeyDown);

            return () => {
                window.removeEventListener('keydown', handleKeyDown);
                window.removeEventListener('keyup', handleKeyDown);
            };
        }, []);

        return (
            <div className="relative w-full">
                <input
                    {...props}
                    ref={ref}
                    type={showPassword ? 'text' : 'password'}
                    className={`mt-2 w-full rounded-xl border px-4 py-3 pr-12 shadow-sm transition-colors focus:border-[#88161c] focus:ring focus:ring-[#88161c] focus:ring-opacity-50 ${className}`}
                    style={style}
                />
                
                <div className="absolute right-3 top-[calc(50%+4px)] flex -translate-y-1/2 items-center gap-2">
                    {capsLockActive && (
                        <div 
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-600"
                            title="Caps Lock is ON"
                        >
                            <AlertTriangle size={14} strokeWidth={2.5} />
                        </div>
                    )}
                    
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                        style={{ color: lightMode ? '#64748b' : '#94a3b8' }}
                        tabIndex={-1}
                        aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
                
                {capsLockActive && (
                    <p className="absolute -bottom-5 right-0 text-xs font-medium text-amber-600">
                        Caps Lock aktif
                    </p>
                )}
            </div>
        );
    }
);

PasswordInput.displayName = 'PasswordInput';
