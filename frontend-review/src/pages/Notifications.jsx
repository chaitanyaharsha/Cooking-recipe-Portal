
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loadNotifications } from '../utils/notificationUtils';
import {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead
} from '../services/portalApi';
import './Notifications.css';

const NOTIFICATION_KEY = 'recipe-notifications';

// ==========================================
// LOCAL NOTIFICATIONS
// ==========================================

function getUserNotifications(email) {
    if (!email) return [];

    return loadNotifications()
        .filter(
            (notification) =>
                notification.recipientEmail?.trim().toLowerCase() ===
                email.trim().toLowerCase()
        )
        .map((notification) => ({
            ...notification,
            id: `local-${notification.id}`,
            originalId: notification.id,
            source: 'local',
            isRead: Boolean(notification.isRead),
            recipeId: notification.recipeId ?? null,
            createdAt: notification.createdAt
        }));
}


// ==========================================
// BACKEND NOTIFICATIONS
// ==========================================

function normalizeBackendNotifications(data) {
    if (!Array.isArray(data)) return [];

    return data.map((notification) => ({
        ...notification,
        id: `backend-${notification.id}`,
        originalId: notification.id,
        source: 'backend',
        isRead: Boolean(notification.is_read),
        recipeId: notification.recipe_id ?? null,
        createdAt: notification.created_at
    }));
}


// ==========================================
// RECIPE LINK HANDLING
// ==========================================

function getRecipePath(notification) {
    const recipeId = String(notification.recipeId ?? '').trim();

    if (!recipeId) return null;

    // Locally submitted recipes use their own route prefix.
    if (recipeId.startsWith('submitted-')) {
        return `/recipes/${recipeId}`;
    }

    // Explicit database IDs must never be treated as static recipe IDs.
    if (
        recipeId.startsWith('db-') ||
        recipeId.startsWith('database-')
    ) {
        return `/recipes/${recipeId}`;
    }

    // Backend notifications always refer to database recipes.
    // Older local recipe-submitted notifications also stored a plain DB ID.
    if (
        notification.source === 'backend' ||
        notification.type === 'recipe-submitted'
    ) {
        return `/recipes/db-${recipeId}`;
    }

    // Other local notifications retain their original static recipe route.
    return `/recipes/${recipeId}`;
}


// ==========================================
// DATE FORMATTING
// ==========================================

function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return 'Date unavailable';
    }

    return date.toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}


// ==========================================
// NOTIFICATION ICONS
// ==========================================

function getNotificationIcon(type) {
    switch (type) {
        case 'recipe-approved':
            return '✓';

        case 'recipe-rejected':
            return '×';

        case 'new-review':
            return '★';

        default:
            return '♧';
    }
}


// ==========================================
// NOTIFICATION CSS CLASSES
// ==========================================

function getNotificationClass(type) {
    switch (type) {
        case 'recipe-approved':
            return 'approved';

        case 'recipe-rejected':
            return 'rejected';

        case 'new-review':
            return 'review';

        default:
            return 'general';
    }
}


// ==========================================
// NOTIFICATIONS COMPONENT
// ==========================================

function Notifications() {
    const { user } = useAuth();

    const [notifications, setNotifications] = useState(() =>
        getUserNotifications(user?.email)
    );

    const [activeFilter, setActiveFilter] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');

    // ==========================================
    // LOAD LOCAL + BACKEND NOTIFICATIONS
    // ==========================================

    async function refreshNotifications() {
        const localNotifications = getUserNotifications(user?.email);

        try {
            const backendData = await getNotifications();

            const backendNotifications =
                normalizeBackendNotifications(backendData);

            setNotifications([
                ...backendNotifications,
                ...localNotifications
            ].sort(
                (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
            ));

            setError('');
        } catch (err) {
            console.error('Unable to load backend notifications:', err);

            // Keep local notifications visible if the backend is unavailable.
            setNotifications(localNotifications);

            setError('Unable to load notifications from the server.');
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            setIsLoading(false);
            return;
        }

        refreshNotifications();

        function handleNotificationUpdate() {
            refreshNotifications();
        }

        window.addEventListener(
            'notifications-updated',
            handleNotificationUpdate
        );

        window.addEventListener('storage', handleNotificationUpdate);

        return () => {
            window.removeEventListener(
                'notifications-updated',
                handleNotificationUpdate
            );

            window.removeEventListener(
                'storage',
                handleNotificationUpdate
            );
        };
    }, [user?.email, user?.id]);


    // ==========================================
    // NOTIFICATION COUNTS
    // ==========================================

    const unreadCount = notifications.filter(
        (notification) => !notification.isRead
    ).length;

    const readCount = notifications.length - unreadCount;


    // ==========================================
    // FILTER NOTIFICATIONS
    // ==========================================

    const filteredNotifications = notifications.filter((notification) => {
        if (activeFilter === 'unread') {
            return !notification.isRead;
        }

        if (activeFilter === 'read') {
            return notification.isRead;
        }

        return true;
    });


    // ==========================================
    // SAVE LOCAL NOTIFICATIONS
    // ==========================================

    function saveLocalNotifications(updatedNotifications) {
        const allNotifications = loadNotifications();

        const updatedById = new Map(
            updatedNotifications.map((notification) => [
                String(notification.originalId),
                notification
            ])
        );

        const updatedAll = allNotifications.map((notification) => {
            const updated = updatedById.get(String(notification.id));

            if (updated) {
                return {
                    ...notification,
                    isRead: updated.isRead
                };
            }

            return notification;
        });

        localStorage.setItem(
            NOTIFICATION_KEY,
            JSON.stringify(updatedAll)
        );

        window.dispatchEvent(new Event('notifications-updated'));
    }


    // ==========================================
    // MARK ONE NOTIFICATION AS READ
    // ==========================================

    async function markAsRead(id) {
        const selectedNotification = notifications.find(
            (notification) => notification.id === id
        );

        if (!selectedNotification || selectedNotification.isRead) {
            return;
        }

        try {
            setActionLoading(true);

            if (selectedNotification.source === 'backend') {
                await markNotificationAsRead(
                    selectedNotification.originalId
                );
            } else {
                saveLocalNotifications([
                    {
                        ...selectedNotification,
                        isRead: true
                    }
                ]);
            }

            setNotifications((previous) =>
                previous.map((notification) =>
                    notification.id === id
                        ? { ...notification, isRead: true }
                        : notification
                )
            );

            setError('');
        } catch (err) {
            console.error('Unable to mark notification as read:', err);

            setError(
                err.message || 'Unable to update notification.'
            );
        } finally {
            setActionLoading(false);
        }
    }


    // ==========================================
    // MARK ALL NOTIFICATIONS AS READ
    // ==========================================

    async function markAllAsRead() {
        if (unreadCount === 0) return;

        try {
            setActionLoading(true);

            const hasBackendUnread = notifications.some(
                (notification) =>
                    notification.source === 'backend' &&
                    !notification.isRead
            );

            if (hasBackendUnread) {
                await markAllNotificationsAsRead();
            }

            const localUnread = notifications.filter(
                (notification) =>
                    notification.source === 'local' &&
                    !notification.isRead
            );

            if (localUnread.length > 0) {
                saveLocalNotifications(
                    localUnread.map((notification) => ({
                        ...notification,
                        isRead: true
                    }))
                );
            }

            setNotifications((previous) =>
                previous.map((notification) => ({
                    ...notification,
                    isRead: true
                }))
            );

            setError('');
        } catch (err) {
            console.error('Unable to mark all notifications as read:', err);

            setError(
                err.message || 'Unable to update all notifications.'
            );
        } finally {
            setActionLoading(false);
        }
    }


    // ==========================================
    // PAGE UI
    // ==========================================

    return (
        <main className="notifications-page">
            <div className="notifications-container">

                {/* HERO */}
                <section className="notification-hero">
                    <div className="hero-decoration hero-decoration-one">✦</div>
                    <div className="hero-decoration hero-decoration-two">✧</div>

                    <div className="hero-content">
                        <span className="notifications-eyebrow">
                            YOUR RECIPE JOURNEY
                        </span>

                        <h1>
                            Notifications<span className="hero-star">.</span>
                        </h1>

                        <p>
                            Every update, every review, every little achievement.
                            <br />
                            Stay connected with your cooking community.
                        </p>

                        <div className="hero-bottom">
                            <span className="hero-status">
                                <span className="status-dot"></span>
                                {unreadCount > 0
                                    ? `${unreadCount} unread updates waiting for you`
                                    : "You're all caught up on your activity"}
                            </span>
                        </div>
                    </div>

                    <div className="hero-illustration" aria-hidden="true">
                        <div className="hero-circle">
                            <span className="hero-bell">♧</span>
                            <span className="bell-sparkle sparkle-one">✦</span>
                            <span className="bell-sparkle sparkle-two">✧</span>
                        </div>

                        <div className="hero-floating-card">
                            <span className="floating-icon">✦</span>
                            <div>
                                <strong>{unreadCount} New</strong>
                                <small>Updates waiting</small>
                            </div>
                        </div>
                    </div>

                    {unreadCount > 0 && (
                        <button
                            className="mark-all-btn"
                            type="button"
                            onClick={markAllAsRead}
                            disabled={actionLoading}
                        >
                            ✓ Mark all as read
                        </button>
                    )}
                </section>


                {/* STATISTICS */}
                <section className="notification-stats">
                    <article className="notification-stat stat-total">
                        <div className="stat-icon">▤</div>
                        <div className="stat-info">
                            <span className="stat-label">ALL ACTIVITY</span>
                            <strong>{notifications.length}</strong>
                            <p>Total Notifications</p>
                        </div>
                    </article>

                    <article className="notification-stat stat-unread">
                        <div className="stat-icon">✧</div>
                        <div className="stat-info">
                            <span className="stat-label">NEW UPDATES</span>
                            <strong>{unreadCount}</strong>
                            <p>Unread Notifications</p>
                        </div>
                    </article>

                    <article className="notification-stat stat-read">
                        <div className="stat-icon">✓</div>
                        <div className="stat-info">
                            <span className="stat-label">COMPLETED</span>
                            <strong>{readCount}</strong>
                            <p>Read Notifications</p>
                        </div>
                    </article>
                </section>


                {/* ACTIVITY */}
                <section className="activity-section">
                    <div className="activity-heading">
                        <div>
                            <span className="section-eyebrow">
                                WHAT'S HAPPENING
                            </span>

                            <h2>Recent Activity</h2>

                            <p>
                                All your latest recipe and community updates.
                            </p>
                        </div>

                        <span className="activity-count">
                            {filteredNotifications.length} shown
                        </span>
                    </div>


                    {/* FILTERS */}
                    <div className="notification-toolbar">
                        <div className="filter-heading">
                            <span>☷</span>
                            Filter:
                        </div>

                        <div className="notification-filters">
                            {[
                                {
                                    id: 'all',
                                    label: 'All',
                                    count: notifications.length
                                },
                                {
                                    id: 'unread',
                                    label: 'Unread',
                                    count: unreadCount
                                },
                                {
                                    id: 'read',
                                    label: 'Read',
                                    count: readCount
                                }
                            ].map((filter) => (
                                <button
                                    key={filter.id}
                                    type="button"
                                    className={`filter-btn ${
                                        activeFilter === filter.id ? 'active' : ''
                                    }`}
                                    onClick={() => setActiveFilter(filter.id)}
                                >
                                    {filter.label}
                                    <span>{filter.count}</span>
                                </button>
                            ))}
                        </div>
                    </div>


                    {/* ERROR MESSAGE */}
                    {error && (
                        <p role="alert">
                            {error}
                        </p>
                    )}


                    {/* LOADING */}
                    {isLoading ? (
                        <div className="notifications-empty">
                            <div className="empty-illustration">♧</div>
                            <h2>Loading Notifications...</h2>
                            <p>Please wait while we load your updates.</p>
                        </div>
                    ) : notifications.length === 0 ? (

                        /* NO NOTIFICATIONS */
                        <div className="notifications-empty">
                            <div className="empty-illustration">♧</div>
                            <span className="section-eyebrow">NOTHING NEW</span>
                            <h2>You're All Caught Up!</h2>

                            <p>
                                Your notification space is waiting for exciting
                                updates. Recipe approvals, reviews and community
                                activities will appear here.
                            </p>

                            <Link
                                to="/recipes"
                                className="explore-notifications-btn"
                            >
                                Explore Recipes <span>→</span>
                            </Link>
                        </div>

                    ) : filteredNotifications.length === 0 ? (

                        /* FILTER EMPTY */
                        <div className="filter-empty">
                            <span className="filter-empty-icon">✧</span>
                            <h3>No {activeFilter} notifications</h3>

                            <p>
                                Try selecting another filter to see your updates.
                            </p>

                            <button
                                type="button"
                                onClick={() => setActiveFilter('all')}
                            >
                                View all notifications →
                            </button>
                        </div>

                    ) : (

                        /* NOTIFICATION LIST */
                        <div className="notifications-list">
                            {filteredNotifications.map((notification) => (
                                <article
                                    key={notification.id}
                                    className={`notification-card ${
                                        notification.isRead ? 'read' : 'unread'
                                    }`}
                                >
                                    <div
                                        className={`notification-icon ${getNotificationClass(
                                            notification.type
                                        )}`}
                                    >
                                        {getNotificationIcon(notification.type)}
                                    </div>

                                    <div className="notification-content">
                                        <div className="notification-title-row">
                                            <div>
                                                <span className="notification-category">
                                                    {notification.type?.replace(
                                                        /-/g,
                                                        ' '
                                                    ) || 'General Update'}
                                                </span>

                                                <h3>
                                                    {notification.title ||
                                                        'Recipe Portal Update'}
                                                </h3>
                                            </div>

                                            {!notification.isRead && (
                                                <span className="new-label">
                                                    <span></span>
                                                    NEW
                                                </span>
                                            )}
                                        </div>

                                        <p>{notification.message}</p>

                                        <div className="notification-footer">
                                            <span className="notification-date">
                                                ◷ {formatDate(notification.createdAt)}
                                            </span>

                                            <div className="notification-actions">
                                                {getRecipePath(notification) && (
                                                    <Link
                                                        to={getRecipePath(notification)}
                                                        className="view-recipe-link"
                                                    >
                                                        View Recipe →
                                                    </Link>
                                                )}

                                                {!notification.isRead && (
                                                    <button
                                                        type="button"
                                                        className="mark-read-btn"
                                                        onClick={() =>
                                                            markAsRead(notification.id)
                                                        }
                                                        disabled={actionLoading}
                                                    >
                                                        ✓ Mark as Read
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>


                {/* BOTTOM NOTE */}
                <div className="notification-bottom-note">
                    <span>✦</span>
                    Made with love for your cooking journey.
                    <span>✦</span>
                </div>

            </div>
        </main>
    );
}

export default Notifications;
