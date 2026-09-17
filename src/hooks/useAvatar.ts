import { useState, useEffect } from 'react';

export const useAvatar = (agentId: string | undefined) => {
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!agentId) return;
        
        const loadAvatar = () => {
            const stored = localStorage.getItem(`edgestone_avatar_${agentId}`);
            setAvatarUrl(stored || null);
        };

        loadAvatar();

        // Listen for custom event
        const handleAvatarUpdate = (e: CustomEvent) => {
            if (e.detail.agentId === agentId) {
                setAvatarUrl(e.detail.url);
            }
        };

        window.addEventListener('avatarUpdate', handleAvatarUpdate as EventListener);
        return () => window.removeEventListener('avatarUpdate', handleAvatarUpdate as EventListener);
    }, [agentId]);

    const updateAvatar = (url: string) => {
        if (!agentId) return;
        localStorage.setItem(`edgestone_avatar_${agentId}`, url);
        setAvatarUrl(url);
        window.dispatchEvent(new CustomEvent('avatarUpdate', { detail: { agentId, url } }));
    };

    return { avatarUrl, updateAvatar };
};
