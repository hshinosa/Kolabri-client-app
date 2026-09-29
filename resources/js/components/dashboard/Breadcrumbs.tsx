import { Link } from '@inertiajs/react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
}

/**
 * Colors use `brand-muted` / `brand-dark`, whose CSS variables are overridden
 * under `.dark`, so the breadcrumb adapts to the active theme automatically.
 */
export default function Breadcrumbs({ items }: BreadcrumbsProps) {
    return (
        <nav className="mb-4 flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
            <Link
                href="/dashboard"
                className="flex items-center gap-1 text-brand-muted transition-colors hover:opacity-80"
            >
                <Home className="h-3.5 w-3.5" />
            </Link>
            {items.map((item, index) => (
                <span key={index} className="flex items-center gap-1.5">
                    <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                    {item.href ? (
                        <Link
                            href={item.href}
                            className="text-brand-muted transition-colors hover:opacity-80"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className="font-medium text-brand-dark">{item.label}</span>
                    )}
                </span>
            ))}
        </nav>
    );
}
