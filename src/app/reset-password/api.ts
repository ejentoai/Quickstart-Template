import axios from 'axios';

export async function resetPassword(newPassword: string, accessToken: string
): Promise<{
    message: string
}> {
    try {
        const body = {
            token: accessToken,
            new_password: newPassword
        }
        const response = await axios.post<{ message: string }>(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/reset-password`,
            body,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return response.data; // Axios automatically parses JSON responses
    } catch (error: any) {
        if (error.response) {
            // Server responded with a status other than 2xx
            throw new Error(error.response.data.message || "Failed to reset password.");
        }
        // Other errors (network errors, etc.)
        throw new Error("An unexpected error occurred.");
    }
}