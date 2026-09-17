const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/auth`;

export interface ForgotPasswordResponse {
    success: boolean;
    message: string;
    resetToken?: string;
    resetLink?: string;
}

export interface ResetPasswordResponse {
    success: boolean;
    message: string;
}

export const authService = {
    forgotPassword: async (email: string): Promise<ForgotPasswordResponse> => {
        const response = await fetch(`${API_URL}/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to send password reset request');
        }

        return data;
    },

    resetPassword: async (email: string, token: string, newPassword: string): Promise<ResetPasswordResponse> => {
        const response = await fetch(`${API_URL}/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, token, newPassword }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to reset password');
        }

        return data;
    }
};
