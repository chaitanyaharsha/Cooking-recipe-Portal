
const NOTIFICATION_KEY = 'recipe-notifications';

// Load all notifications
export function loadNotifications() {
    try {
        const saved = localStorage.getItem(NOTIFICATION_KEY);
        const parsed = saved ? JSON.parse(saved) : [];

        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Unable to load notifications:', error);
        return [];
    }
}

// Save a notification for a particular user
export function addNotification({
    recipientEmail,
    actorEmail = '',
    type,
    title,
    message,
    recipeId,
    recipeName
}) {
    const recipient = String(recipientEmail || '')
        .trim()
        .toLowerCase();

    const actor = String(actorEmail || '')
        .trim()
        .toLowerCase();

    if (!recipient || recipient === actor) {
        return false;
    }

    if (!type || !title || !message) {
        console.warn('Notification requires type, title and message.');
        return false;
    }

    const notifications = loadNotifications();

    // Prevent duplicate notifications for the same recipe and action
    const alreadyExists = notifications.some(
        (notification) =>
            notification.recipientEmail === recipient &&
            notification.type === type &&
            String(notification.recipeId) === String(recipeId) &&
            notification.title === title
    );

    if (alreadyExists) {
        return false;
    }

    const newNotification = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        recipientEmail: recipient,
        actorEmail: actor,
        type,
        title,
        message,
        recipeId: recipeId ?? null,
        recipeName: recipeName || '',
        createdAt: new Date().toISOString(),
        isRead: false
    };

    localStorage.setItem(
        NOTIFICATION_KEY,
        JSON.stringify([...notifications, newNotification])
    );

    window.dispatchEvent(new Event('notifications-updated'));

    return true;
}

// Find the owner email of a recipe
export function getRecipeOwnerEmail(recipeId) {
    try {
        const savedRecipes = JSON.parse(
            localStorage.getItem('moderatorRecipes') || '[]'
        );

        if (!Array.isArray(savedRecipes)) {
            return '';
        }

        const recipe = savedRecipes.find(
            (item) => String(item.id) === String(recipeId)
        );

        return String(
            recipe?.submittedByEmail || recipe?.submittedById || ''
        ).trim().toLowerCase();

    } catch (error) {
        console.error('Unable to find recipe owner:', error);
        return '';
    }
}
