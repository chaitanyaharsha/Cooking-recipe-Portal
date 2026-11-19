
// Central API client for the Cooking Recipe Portal FastAPI backend.

// Backend URL
export const API_BASE_URL = (
    import.meta.env.VITE_API_BASE_URL ||
    "http://127.0.0.1:8000"
).replace(/\/$/, "");


// ==========================================
// CENTRAL API REQUEST FUNCTION
// ==========================================

export async function apiRequest(endpoint, options = {}) {

    const {
        token: explicitToken,
        ...fetchOptions
    } = options;

    const token =
        explicitToken ?? localStorage.getItem("portalToken");

    const headers = new Headers(
        fetchOptions.headers || {}
    );

    const isFormData =
        fetchOptions.body instanceof FormData;

    // Add JWT authentication
    if (token && !headers.has("Authorization")) {
        headers.set(
            "Authorization",
            `Bearer ${token}`
        );
    }

    // Add JSON content type when required
    if (
        fetchOptions.body != null &&
        !isFormData &&
        !headers.has("Content-Type")
    ) {
        headers.set(
            "Content-Type",
            "application/json"
        );
    }

    // Send request to FastAPI
    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
            ...fetchOptions,
            headers
        }
    );

    // Read response
    const contentType =
        response.headers.get("content-type") || "";

    let data = null;

    if (contentType.includes("application/json")) {
        data = await response.json();
    } else if (response.status !== 204) {
        const raw = await response.text();

        data = raw
            ? { detail: raw }
            : null;
    }

    // Handle API errors
    if (!response.ok) {

        let message =
            data?.detail ||
            data?.message ||
            `Request failed (${response.status})`;

        if (Array.isArray(message)) {
            message = message
                .map(item => item.msg || String(item))
                .join("; ");
        }

        const error = new Error(message);

        error.status = response.status;
        error.data = data;

        throw error;
    }

    return data;
}


// ==========================================
// QUERY STRING BUILDER
// ==========================================

export function toQueryString(params = {}) {

    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {

        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {
            query.set(key, String(value));
        }

    });

    const value = query.toString();

    return value ? `?${value}` : "";
}


// ==========================================
// IMAGE URL BUILDER
// ==========================================

export function getImageUrl(value) {

    if (!value) {
        return "";
    }

    if (/^(https?:|data:|blob:)/i.test(value)) {
        return value;
    }

    return `${API_BASE_URL}${
        value.startsWith("/") ? "" : "/"
    }${value}`;
}
