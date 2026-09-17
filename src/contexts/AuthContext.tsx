import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'Super admin' | 'Manager' | 'Support crew' | 'agent';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    profilePicture?: string;
    token?: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (user: User) => void;
    logout: () => void;
    isSuperAdmin: () => boolean;
    isManager: () => boolean;
    isSupportCrew: () => boolean;
    isAgent: () => boolean;
    canDelete: () => boolean;
    getCurrentUser: () => User | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Load user from localStorage on mount
    useEffect(() => {
        const storedUser = localStorage.getItem('edgestone_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (error) {
                console.error('Failed to parse stored user:', error);
                localStorage.removeItem('edgestone_user');
            }
        }
        setIsLoading(false);
    }, []);

    const login = (userData: User) => {
        setUser(userData);
        localStorage.setItem('edgestone_user', JSON.stringify(userData));
        if (userData.profilePicture) {
            localStorage.setItem(`edgestone_avatar_${userData.id}`, userData.profilePicture);
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('edgestone_user');
    };

    const isSuperAdmin = (): boolean => {
        // Fallback or explicit check
        return user?.role === 'Super admin' || user?.role === 'super_admin' as any;
    };

    const isManager = (): boolean => {
        return user?.role === 'Manager';
    };

    const isSupportCrew = (): boolean => {
        return user?.role === 'Support crew' || user?.role === 'agent' as any;
    };

    const isAgent = (): boolean => {
        return user?.role === 'agent';
    };

    const canDelete = (): boolean => {
        return isSuperAdmin() || isManager();
    };

    const getCurrentUser = (): User | null => {
        return user;
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, isSuperAdmin, isManager, isSupportCrew, isAgent, canDelete, getCurrentUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
