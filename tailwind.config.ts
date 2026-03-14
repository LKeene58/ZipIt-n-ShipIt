import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                'neon-blue': '#00D1FF',
            },
            keyframes: {
                aurora: {
                    '0%, 100%': { transform: 'translateY(0px) scale(1.2)', opacity: '0.5' },
                    '50%': { transform: 'translateY(-60px) scale(1.3)', opacity: '0.8' },
                },
            },
            animation: {
                'aurora-thick': 'aurora 20s ease-in-out infinite',
            },
        },
    },
    plugins: [],
};
export default config;