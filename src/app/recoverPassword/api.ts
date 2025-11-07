import axios from 'axios';

export async function recoverPassword(
  email: string,
): Promise<{ message: string }> {
    try {
        const response = await axios.post<{ message: string }>(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/password-recovery/${email}`, // Use the passed baseURL
            {}, // Empty body for POST request
            {
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        return response.data; // Axios automatically parses JSON responses
    } catch (error: any) {
        if (error.response) {
            // Server responded with a status other than 2xx
            throw new Error(error.response.data.message || "Failed to recover password.");
        }
        // Other errors (network errors, etc.)
        throw new Error("An unexpected error occurred.");
    }
}
