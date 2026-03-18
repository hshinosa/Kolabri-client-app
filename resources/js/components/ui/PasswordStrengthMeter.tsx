import { motion } from 'framer-motion';

export function PasswordStrengthMeter({ password, lightMode = true }: { password: string; lightMode?: boolean }) {
    // Calculate strength score (0-4)
    let score = 0;
    
    if (password.length > 0) {
        if (password.length >= 8) score += 1; // Length > 8
        if (password.match(/[A-Z]/) && password.match(/[a-z]/)) score += 1; // Mixed case
        if (password.match(/[0-9]/)) score += 1; // Has number
        if (password.match(/[^A-Za-z0-9]/)) score += 1; // Has special char
    }

    const getStrengthColor = () => {
        if (score === 0) return lightMode ? '#e2e8f0' : 'rgba(255,255,255,0.1)';
        if (score === 1) return '#ef4444'; // Red (Weak)
        if (score === 2) return '#f59e0b'; // Yellow (Fair)
        if (score === 3) return '#10b981'; // Green (Good)
        if (score === 4) return '#059669'; // Dark Green (Strong)
        return lightMode ? '#e2e8f0' : 'rgba(255,255,255,0.1)';
    };

    const getStrengthLabel = () => {
        if (score === 0) return '';
        if (score === 1) return 'Lemah';
        if (score === 2) return 'Sedang';
        if (score === 3) return 'Kuat';
        if (score === 4) return 'Sangat Kuat';
        return '';
    };

    const strengthColor = getStrengthColor();

    return (
        <div className="mt-2 w-full">
            <div className="mb-1 flex justify-between text-xs font-medium">
                <span style={{ color: lightMode ? '#64748b' : '#94a3b8' }}>
                    Kekuatan Sandi
                </span>
                <span style={{ color: strengthColor }}>
                    {getStrengthLabel()}
                </span>
            </div>
            
            <div className="flex h-1.5 w-full gap-1 overflow-hidden rounded-full">
                {[1, 2, 3, 4].map((level) => {
                    const isActive = score >= level;
                    const isDefault = score === 0;
                    
                    return (
                        <motion.div
                            key={level}
                            className="h-full flex-1 transition-all duration-300"
                            animate={{
                                backgroundColor: isActive ? strengthColor : (isDefault ? (lightMode ? '#e2e8f0' : 'rgba(255,255,255,0.1)') : (lightMode ? '#f1f5f9' : 'rgba(255,255,255,0.05)'))
                            }}
                        />
                    );
                })}
            </div>
            
            {password.length > 0 && score < 4 && (
                <p className="mt-1.5 text-[10px]" style={{ color: lightMode ? '#64748b' : '#94a3b8' }}>
                    Sandi sebaiknya memiliki minimal 8 karakter, huruf besar & kecil, angka, dan simbol.
                </p>
            )}
        </div>
    );
}
