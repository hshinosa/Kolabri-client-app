import { Check } from 'lucide-react';
import { InputHTMLAttributes } from 'react';

interface CustomCheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
    lightMode?: boolean;
}

export function CustomCheckbox({ lightMode = true, className = '', checked, onChange, ...props }: CustomCheckboxProps) {
    return (
        <div className={`relative flex h-5 w-5 items-center justify-center ${className}`}>
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
                {...props}
            />
            <div
                className={`pointer-events-none flex h-full w-full items-center justify-center rounded transition-all duration-200 ${
                    checked
                        ? 'bg-[#88161c] border-[#88161c]'
                        : lightMode
                        ? 'bg-white border-slate-300 peer-hover:border-[#88161c]'
                        : 'bg-slate-800/50 border-slate-600 peer-hover:border-[#88161c]'
                }`}
                style={{
                    borderWidth: '1.5px',
                    boxShadow: checked ? '0 0 0 2px rgba(136, 22, 28, 0.2)' : 'none',
                }}
            >
                <Check
                    size={14}
                    strokeWidth={3}
                    className={`transition-all duration-200 ${
                        checked ? 'scale-100 opacity-100 text-white' : 'scale-50 opacity-0 text-white'
                    }`}
                />
            </div>
        </div>
    );
}
