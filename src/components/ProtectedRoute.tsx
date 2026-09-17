import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireSuperAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireSuperAdmin = false }) => {
    const { user, isLoading, isSuperAdmin } = useAuth();

    // Wait for auth state to be restored from localStorage before making any redirect decisions
    if (isLoading) {
        return null;
    }

    // If no user is logged in, redirect to login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // If super admin access is required but user is not a super admin, redirect to overview
    if (requireSuperAdmin && !isSuperAdmin()) {
        return <Navigate to={`/dashboard/${user.id}/overview`} replace />;
    }

    return <>{children}</>;
};
