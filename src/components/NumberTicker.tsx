import { useEffect, useState } from "react";

export function NumberTicker({ value, className = "" }: { value: number; className?: string }) {
    const [displayValue, setDisplayValue] = useState(value);

    useEffect(() => {
        let start = displayValue;
        const end = value;
        if (start === end) return;

        const duration = 1000;
        const startTime = performance.now();

        const tick = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out quart
            const ease = 1 - Math.pow(1 - progress, 4);

            const current = start + (end - start) * ease;
            setDisplayValue(current);

            if (progress < 1) {
                requestAnimationFrame(tick);
            }
        };

        requestAnimationFrame(tick);
    }, [value]); // Intentional: we want to animate from current *display* value to new *prop* value

    // Format based on magnitude? For now just raw number or limited decimals
    // Actually, if it's distance, we probably want 2 decimals.
    // If it's exploration, integer.
    // Let's rely on the parent to pass a number and we format it here?
    // No, let's just output the number and let parent handle units, 
    // but we need to know precision...

    // Actually, for simplicity, let's just assume we animate the *number* 
    // and format it inside the render

    return <span className={className}>{displayValue.toFixed(value % 1 === 0 ? 0 : 2)}</span>;
}
