// Central application configuration

export const API_BASE_URL: string =
    (import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim() !== '')
        ? import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '')
        : 'https://monkfish-app-663au.ondigitalocean.app';
