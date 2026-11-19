
import { useEffect, useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loadNotifications } from '../utils/notificationUtils';
import { getUnreadNotificationCount } from '../services/portalApi';
import './Navbar.css';

function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [unreadCount, setUnreadCount] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);

    // UPDATE NOTIFICATION COUNT
    useEffect(() => {
        let isMounted = true;

        async function updateUnreadCount() {
            const email = user?.email?.trim().toLowerCase();

            if (!user || !email) {
                setUnreadCount(0);
                return;
            }

            // Count existing local notifications.
            const localNotifications = loadNotifications();

            const localUnreadCount = localNotifications.filter(
                (notification) =>
                    notification.recipientEmail?.trim().toLowerCase() === email &&
                    !notification.isRead
            ).length;

            try {
                // Get unread notification count from backend.
                const response = await getUnreadNotificationCount();

                const backendUnreadCount = Number(
                    response?.unread_count ?? 0
                );

                if (isMounted) {
                    setUnreadCount(
                        backendUnreadCount + localUnreadCount
                    );
                }
            } catch (error) {
                console.error(
                    'Unable to load backend notification count:',
                    error
                );

                // Keep local notifications working if backend is unavailable.
                if (isMounted) {
                    setUnreadCount(localUnreadCount);
                }
            }
        }

        updateUnreadCount();

        window.addEventListener(
            'notifications-updated',
            updateUnreadCount
        );

        window.addEventListener('storage', updateUnreadCount);

        return () => {
            isMounted = false;

            window.removeEventListener(
                'notifications-updated',
                updateUnreadCount
            );

            window.removeEventListener(
                'storage',
                updateUnreadCount
            );
        };
    }, [user?.email, user?.id]);

    // LOGOUT
    function handleLogout() {
        setMenuOpen(false);
        logout();
        alert('You have logged out successfully!');
        navigate('/');
    }

    // NAVIGATION LINK STYLE
    const navClass = ({ isActive }) =>
        `premium-nav-link ${isActive ? 'active' : ''}`;

    function closeMenu() {
        setMenuOpen(false);
    }

    return (
        <header className="premium-navbar">
            <div className="premium-navbar-inner">

                {/* RECIPE PORTAL BRAND LOGO */}
                <Link
                    to="/"
                    className="premium-brand"
                    onClick={closeMenu}
                >
                    <span className="premium-brand-icon">
                        <svg
                            viewBox="0 0 48 48"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                        >
                            <path
                                d="M17 17C13 13 19 11 17 7"
                                stroke="currentColor"
                                strokeWidth="2.8"
                                strokeLinecap="round"
                            />

                            <path
                                d="M25 16C21 12 27 10 25 6"
                                stroke="currentColor"
                                strokeWidth="2.8"
                                strokeLinecap="round"
                            />

                            <path
                                d="M10 23H38L35 36H13L10 23Z"
                                fill="currentColor"
                                fillOpacity="0.16"
                                stroke="currentColor"
                                strokeWidth="2.8"
                                strokeLinejoin="round"
                            />

                            <path
                                d="M10 26H6V32H12"
                                stroke="currentColor"
                                strokeWidth="2.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />

                            <path
                                d="M38 26H42V32H36"
                                stroke="currentColor"
                                strokeWidth="2.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />

                            <path
                                d="M9 22H39"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                            />

                            <path
                                d="M21 19H27"
                                stroke="currentColor"
                                strokeWidth="2.8"
                                strokeLinecap="round"
                            />

                            <path
                                d="M14 40H34"
                                stroke="currentColor"
                                strokeWidth="2.8"
                                strokeLinecap="round"
                            />
                        </svg>
                    </span>

                    <span className="premium-brand-text">
                        <strong>Recipe</strong>
                        <span>PORTAL</span>
                    </span>
                </Link>

                {/* MOBILE MENU */}
                <button
                    type="button"
                    className="premium-menu-toggle"
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Toggle navigation menu"
                    aria-expanded={menuOpen}
                >
                    {menuOpen ? '✕' : '☰'}
                </button>

                {/* NAVIGATION */}
                <div
                    className={`premium-navigation ${
                        menuOpen ? 'menu-open' : ''
                    }`}
                >
                    <nav className="premium-nav-links">

                        <NavLink
                            to="/"
                            end
                            className={navClass}
                            onClick={closeMenu}
                        >
                            Home
                        </NavLink>

                        <NavLink
                            to="/recipes"
                            className={navClass}
                            onClick={closeMenu}
                        >
                            Explore Recipes
                        </NavLink>

                        {/* GUEST LINKS */}
                        {!user && (
                            <>
                                <NavLink
                                    to="/login"
                                    className={navClass}
                                    onClick={closeMenu}
                                >
                                    Login
                                </NavLink>

                                <NavLink
                                    to="/register"
                                    className={navClass}
                                    onClick={closeMenu}
                                >
                                    Register
                                </NavLink>
                            </>
                        )}

                        {/* USER LINKS */}
                        {user?.role === 'user' && (
                            <>
                                <NavLink to="/dashboard" className={navClass} onClick={closeMenu}>
                                    Dashboard
                                </NavLink>

                                <NavLink to="/profile" className={navClass} onClick={closeMenu}>
                                    My Profile
                                </NavLink>

                                <NavLink to="/my-recipes" className={navClass} onClick={closeMenu}>
                                    My Recipes
                                </NavLink>

                                <NavLink to="/my-drafts" className={navClass} onClick={closeMenu}>
                                    My Drafts
                                </NavLink>

                                <NavLink to="/my-reviews" className={navClass} onClick={closeMenu}>
                                    My Reviews
                                </NavLink>

                                <NavLink to="/favorites" className={navClass} onClick={closeMenu}>
                                    Favorites
                                </NavLink>

                                <NavLink to="/create-recipe" className={navClass} onClick={closeMenu}>
                                    Create Recipe
                                </NavLink>
                            </>
                        )}

                        {/* MODERATOR LINKS */}
                        {user?.role === 'moderator' && (
                            <>
                                <NavLink to="/moderator-dashboard" className={navClass} onClick={closeMenu}>
                                    Dashboard
                                </NavLink>

                                <NavLink to="/moderator/review-reports" className={navClass} onClick={closeMenu}>
                                    Review Reports
                                </NavLink>
                            </>
                        )}

                        {/* ADMIN LINKS */}
                        {user?.role === 'admin' && (
                            <>
                                <NavLink to="/admin-dashboard" className={navClass} onClick={closeMenu}>
                                    Dashboard
                                </NavLink>

                                <NavLink to="/category-management" className={navClass} onClick={closeMenu}>
                                    Categories
                                </NavLink>

                                <NavLink to="/featured-recipes" className={navClass} onClick={closeMenu}>
                                    Featured
                                </NavLink>

                                <NavLink to="/reports" className={navClass} onClick={closeMenu}>
                                    Reports
                                </NavLink>

                                <NavLink to="/moderator/review-reports" className={navClass} onClick={closeMenu}>
                                    Review Reports
                                </NavLink>

                                <NavLink to="/admin-settings" className={navClass} onClick={closeMenu}>
                                    Settings
                                </NavLink>
                            </>
                        )}

                        {/* NOTIFICATIONS */}
                        {user && (
                            <NavLink
                                to="/notifications"
                                className={`${navClass({
                                    isActive: false
                                })} premium-notification-link`}
                                onClick={closeMenu}
                            >
                                <span>🔔</span>
                                Notifications

                                {unreadCount > 0 && (
                                    <span className="premium-notification-badge">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </NavLink>
                        )}

                    </nav>

                    {/* USER DETAILS */}
                    {user && (
                        <div className="premium-user-area">

                            <div className="premium-user-avatar">
                                {user.email?.charAt(0).toUpperCase() || 'U'}
                            </div>

                            <div className="premium-user-info">
                                <strong>{user.email}</strong>
                                <span>{user.role}</span>
                            </div>

                            <button
                                type="button"
                                className="premium-logout-btn"
                                onClick={handleLogout}
                            >
                                Logout <span>↗</span>
                            </button>

                        </div>
                    )}

                </div>
            </div>
        </header>
    );
}

export default Navbar;
