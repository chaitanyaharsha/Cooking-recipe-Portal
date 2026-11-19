
import { apiRequest, toQueryString } from "../api";

const json = (method, data) => ({
    method,
    body: JSON.stringify(data)
});

// ==========================================
// AUTHENTICATION
// ==========================================

export const registerUser = ({ name, display_name, email, password }) =>
    apiRequest(
        "/auth/register",
        json("POST", {
            display_name: display_name ?? name,
            email,
            password
        })
    );

export const loginUser = ({ email, password }) =>
    apiRequest(
        "/auth/login",
        json("POST", { email, password })
    );

export const getMyProfile = () =>
    apiRequest("/users/me");

export const updateMyProfile = (data) =>
    apiRequest("/users/me", json("PUT", data));


// ==========================================
// USER MANAGEMENT
// ==========================================

export const getAllUsers = () =>
    apiRequest("/users/");

export const createModerator = (data) =>
    apiRequest("/users/moderators", json("POST", data));

export const updateUserStatus = (id, status) =>
    apiRequest(`/users/${id}/status`, json("PUT", { status }));

export const deleteUser = (id) =>
    apiRequest(`/users/${id}`, { method: "DELETE" });


// ==========================================
// RECIPES
// ==========================================

export const getRecipes = (params = {}) =>
    apiRequest(`/recipes${toQueryString(params)}`);

export const getRecipe = (id) =>
    apiRequest(`/recipes/${id}`);

export const getMyRecipes = () =>
    apiRequest("/recipes/my-recipes");

export const createRecipe = (data) =>
    apiRequest("/recipes", json("POST", data));

export const updateRecipe = (id, data) =>
    apiRequest(`/recipes/${id}`, json("PUT", data));

export const deleteRecipe = (id) =>
    apiRequest(`/recipes/${id}`, { method: "DELETE" });

export const submitRecipe = (id) =>
    apiRequest(`/recipes/${id}/submit`, { method: "POST" });

export const getFeaturedRecipes = () =>
    apiRequest("/recipes/featured");

export const getAdminFeaturedRecipes = () =>
    apiRequest("/recipes/admin/featured");

export const setRecipeFeatured = (id, is_featured) =>
    apiRequest(
        `/recipes/${id}/featured`,
        json("PUT", { is_featured })
    );

export const getRecipeTags = (id) =>
    apiRequest(`/recipes/${id}/tags`);

export const assignRecipeTag = (recipeId, tagId) =>
    apiRequest(
        `/recipes/${recipeId}/tags`,
        json("POST", { tag_id: Number(tagId) })
    );

export const removeRecipeTag = (recipeId, tagId) =>
    apiRequest(
        `/recipes/${recipeId}/tags/${tagId}`,
        { method: "DELETE" }
    );


// ==========================================
// CATEGORIES
// ==========================================

export const getCategories = () =>
    apiRequest("/categories");

export const getCategory = (id) =>
    apiRequest(`/categories/${id}`);

export const createCategory = (data) =>
    apiRequest("/categories", json("POST", data));

export const updateCategory = (id, data) =>
    apiRequest(`/categories/${id}`, json("PUT", data));

export const deleteCategory = (id) =>
    apiRequest(`/categories/${id}`, { method: "DELETE" });


// ==========================================
// TAGS
// ==========================================

export const getTags = () =>
    apiRequest("/tags");

export const getTag = (id) =>
    apiRequest(`/tags/${id}`);

export const createTag = (data) =>
    apiRequest("/tags", json("POST", data));

export const updateTag = (id, data) =>
    apiRequest(`/tags/${id}`, json("PUT", data));

export const deleteTag = (id) =>
    apiRequest(`/tags/${id}`, { method: "DELETE" });


// ==========================================
// FAVORITES
// ==========================================

export const getFavorites = () =>
    apiRequest("/favorites");

export const addFavorite = (recipeId) =>
    apiRequest(`/favorites/${recipeId}`, { method: "POST" });

export const removeFavorite = (recipeId) =>
    apiRequest(`/favorites/${recipeId}`, { method: "DELETE" });


// ==========================================
// REVIEWS
// ==========================================

export const getRecipeReviews = (id) =>
    apiRequest(`/reviews/recipe/${id}`);

export const createReview = (id, comment) =>
    apiRequest(
        `/reviews/${id}`,
        json("POST", { comment })
    );

export const getStaticRecipeReviews = (id) =>
    apiRequest(`/reviews/static/${encodeURIComponent(id)}`);

export const createStaticReview = (id, comment) =>
    apiRequest(
        `/reviews/static/${encodeURIComponent(id)}`,
        json("POST", { comment })
    );

export const updateReview = (id, comment) =>
    apiRequest(
        `/reviews/${id}`,
        json("PUT", { comment })
    );

export const deleteReview = (id) =>
    apiRequest(`/reviews/${id}`, { method: "DELETE" });

export const getMyReviews = () =>
    apiRequest("/reviews/my-reviews");

export const setReviewVisibility = (id, is_hidden) =>
    apiRequest(
        `/reviews/${id}/visibility${toQueryString({ is_hidden })}`,
        { method: "PUT" }
    );


// ==========================================
// RATINGS
// ==========================================

export const getRatingSummary = (id) =>
    apiRequest(`/ratings/${id}/summary`);

export const getMyRating = (id) =>
    apiRequest(`/ratings/${id}/my-rating`);

export const createRating = (id, score) =>
    apiRequest(
        `/ratings/${id}`,
        json("POST", { score: Number(score) })
    );

export const updateRating = (id, score) =>
    apiRequest(
        `/ratings/${id}`,
        json("PUT", { score: Number(score) })
    );

export const deleteRating = (id) =>
    apiRequest(`/ratings/${id}`, { method: "DELETE" });

export const getStaticRatingSummary = (id) =>
    apiRequest(`/ratings/static/${encodeURIComponent(id)}/summary`);

export const getMyStaticRating = (id) =>
    apiRequest(`/ratings/static/${encodeURIComponent(id)}/my-rating`);

export const createStaticRating = (id, score) =>
    apiRequest(
        `/ratings/static/${encodeURIComponent(id)}`,
        json("POST", { score: Number(score) })
    );

export const updateStaticRating = (id, score) =>
    apiRequest(
        `/ratings/static/${encodeURIComponent(id)}`,
        json("PUT", { score: Number(score) })
    );

export const deleteStaticRating = (id) =>
    apiRequest(
        `/ratings/static/${encodeURIComponent(id)}`,
        { method: "DELETE" }
    );


// ==========================================
// MODERATION
// ==========================================

export const getPendingRecipes = () =>
    apiRequest("/moderation/pending");

export const approveRecipe = (id, comments = "") =>
    apiRequest(
        `/moderation/${id}/approve${toQueryString({ comments })}`,
        { method: "POST" }
    );

export const rejectRecipe = (id, comments) =>
    apiRequest(
        `/moderation/${id}/reject${toQueryString({ comments })}`,
        { method: "POST" }
    );

export const getModerationStats = () =>
    apiRequest("/moderation/stats");

export const getModerationHistory = () =>
    apiRequest("/moderation/history");


// ==========================================
// REPORTS
// ==========================================

export const reportRecipe = (id, data) =>
    apiRequest(
        `/reports/recipe/${id}`,
        json("POST", data)
    );

export const reportStaticRecipe = (id, data) =>
    apiRequest(
        `/reports/static/recipe/${encodeURIComponent(id)}`,
        json("POST", data)
    );

export const reportReview = (id, data) =>
    apiRequest(
        `/reports/review/${id}`,
        json("POST", data)
    );

export const getReports = () =>
    apiRequest("/reports/");

export const getReviewReports = () =>
    apiRequest("/reports/review-reports");

export const resolveReport = (id) =>
    apiRequest(`/reports/${id}/resolve`, { method: "PUT" });
export const updateReportStatus = (id, status) =>
    apiRequest(
        `/reports/${id}/status${toQueryString({ status })}`,
        { method: "PUT" }
    );


// ==========================================
// ADMIN SETTINGS AND ANALYTICS
// ==========================================

export const getAdminSettings = () =>
    apiRequest("/admin/settings");

export const updateAdminSettings = (data) =>
    apiRequest("/admin/settings", json("PUT", data));

export const getAdminAnalytics = () =>
    apiRequest("/admin/settings/analytics");


// ==========================================
// AUDIT LOGS
// ==========================================

export const getAuditLogs = () =>
    apiRequest("/audit-logs/");

// ==========================================
// NOTIFICATIONS
// ==========================================

export const getNotifications = () =>
    apiRequest("/notifications");

export const getUnreadNotificationCount = () =>
    apiRequest("/notifications/unread-count");

export const markNotificationAsRead = (id) =>
    apiRequest(
        `/notifications/${id}/read`,
        { method: "PATCH" }
    );

export const markAllNotificationsAsRead = () =>
    apiRequest(
        "/notifications/read-all",
        { method: "PATCH" }
    );



// ==========================================
// IMAGE UPLOAD
// ==========================================

export async function uploadRecipeImage(file) {

    const form = new FormData();

    form.append("file", file);

    return apiRequest("/uploads/image", {
        method: "POST",
        body: form
    });
}


// ==========================================
// BACKEND DIAGNOSTICS
// ==========================================

export const getBackendHealth = () =>
    apiRequest("/health");

export const checkDatabaseConnection = () =>
    apiRequest("/db-check");
