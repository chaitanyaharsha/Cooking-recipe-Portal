
import './AdminDashboard.css';
import { useEffect, useState, useCallback } from 'react';

import {
    getAllUsers,
    updateUserStatus,
    deleteUser,
    getModerationStats,
    getRecipes,
    getPendingRecipes,
    getModerationHistory,
    approveRecipe,
    rejectRecipe,
    deleteRecipe,
    getCategories
} from '../services/portalApi';

function readStorage(key, fallback) {
    try {
        return JSON.parse(
            localStorage.getItem(key) || JSON.stringify(fallback)
        ) ?? fallback;
    } catch {
        return fallback;
    }
}

function AdminDashboard() {
    const [users, setUsers] = useState([]);
    const [recipes, setRecipes] = useState([]);

    const [stats, setStats] = useState({
        total_users: 0,
        total_recipes: 0,
        pending_recipes: 0,
        approved_recipes: 0,
        rejected_recipes: 0
    });

    const [activeTab, setActiveTab] = useState('users');

    const [searchUser, setSearchUser] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');

    const [recipeSearch, setRecipeSearch] = useState('');
    const [recipeFilter, setRecipeFilter] = useState('All');

    const [currentPage, setCurrentPage] = useState(1);

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');

    const usersPerPage = 5;
    const currentUser = readStorage('portalUser', null);

    // ==========================================
    // LOAD USERS, RECIPES AND STATISTICS
    // ==========================================

    const loadDashboardData = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const [
                usersResponse,
                statsResponse,
                publishedResponse,
                pendingResponse,
                historyResponse,
                categoriesResponse
            ] = await Promise.all([
                getAllUsers(),
                getModerationStats(),
                getRecipes({ page: 1, page_size: 100 }),
                getPendingRecipes(),
                getModerationHistory(),
                getCategories()
            ]);

            const loadedUsers = Array.isArray(usersResponse)
                ? usersResponse
                : [];

            const publishedRecipes = Array.isArray(publishedResponse?.items)
                ? publishedResponse.items
                : [];

            const pendingRecipes = Array.isArray(pendingResponse)
                ? pendingResponse
                : [];

            const moderationHistory = Array.isArray(historyResponse)
                ? historyResponse
                : [];

            const categories = Array.isArray(categoriesResponse)
                ? categoriesResponse
                : [];

            const categoryMap = new Map(
                categories.map(category => [
                    category.id,
                    category.name
                ])
            );

            const userMap = new Map(
                loadedUsers.map(user => [
                    user.id,
                    user.display_name
                ])
            );

            const published = publishedRecipes.map(recipe => ({
                id: recipe.id,
                name: recipe.title,
                category:
                    categoryMap.get(recipe.category_id) ||
                    `Category ${recipe.category_id}`,
                submittedBy:
                    userMap.get(recipe.author_id) ||
                    `User ${recipe.author_id}`,
                status: 'Approved'
            }));

            const pending = pendingRecipes.map(recipe => ({
                id: recipe.id,
                name: recipe.title,
                category:
                    categoryMap.get(recipe.category_id) ||
                    `Category ${recipe.category_id}`,
                submittedBy:
                    userMap.get(recipe.author_id) ||
                    `User ${recipe.author_id}`,
                status: 'Pending'
            }));

            const rejected = moderationHistory
                .filter(item => item.status === 'rejected')
                .map(item => ({
                    id: item.recipe_id,
                    name: item.recipe_title,
                    category: '—',
                    submittedBy:
                        userMap.get(item.author_id) ||
                        `User ${item.author_id}`,
                    status: 'Rejected'
                }));

            // Avoid duplicate recipes in the table.
            const recipeMap = new Map();

            [...published, ...pending, ...rejected].forEach(recipe => {
                recipeMap.set(recipe.id, recipe);
            });

            setUsers(loadedUsers);
            setRecipes(Array.from(recipeMap.values()));

            setStats({
                total_users: statsResponse.total_users ?? loadedUsers.length,
                total_recipes: statsResponse.total_recipes ?? 0,
                pending_recipes: statsResponse.pending_recipes ?? 0,
                approved_recipes: statsResponse.approved_recipes ?? 0,
                rejected_recipes: statsResponse.rejected_recipes ?? 0
            });

        } catch (err) {
            setError(
                err.message ||
                'Unable to load dashboard information from the backend.'
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    // ==========================================
    // ADMIN CHECK
    // ==========================================

    function isCurrentAdmin(user) {
        return (
            user.email?.toLowerCase() ===
            currentUser?.email?.toLowerCase()
        );
    }

    // ==========================================
    // USER FILTERING
    // ==========================================

    const filteredUsers = users.filter(user => {
        const search = searchUser.toLowerCase();

        const matchesSearch =
            (user.display_name || '').toLowerCase().includes(search) ||
            (user.email || '').toLowerCase().includes(search);

        const matchesRole =
            roleFilter === 'All' ||
            (user.role || 'user').toLowerCase() ===
            roleFilter.toLowerCase();

        const matchesStatus =
            statusFilter === 'All' ||
            (
                user.status?.toLowerCase() === 'active'
                    ? 'Active'
                    : 'Inactive'
            ) === statusFilter;

        return matchesSearch && matchesRole && matchesStatus;
    });

    // ==========================================
    // USER PAGINATION
    // ==========================================

    const totalPages = Math.max(
        1,
        Math.ceil(filteredUsers.length / usersPerPage)
    );

    const displayedUsers = filteredUsers.slice(
        (currentPage - 1) * usersPerPage,
        currentPage * usersPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchUser, roleFilter, statusFilter]);

    // ==========================================
    // RECIPE FILTERING
    // ==========================================

    const filteredRecipes = recipes.filter(recipe => {
        const search = recipeSearch.toLowerCase();

        const matchesSearch =
            (recipe.name || '').toLowerCase().includes(search) ||
            (recipe.submittedBy || '').toLowerCase().includes(search);

        const matchesStatus =
            recipeFilter === 'All' ||
            recipe.status === recipeFilter;

        return matchesSearch && matchesStatus;
    });

    // ==========================================
    // ACTIVATE / DEACTIVATE USER
    // ==========================================

    async function toggleUserStatus(id) {
        const selectedUser = users.find(user => user.id === id);

        if (!selectedUser) return;

        if (isCurrentAdmin(selectedUser)) {
            window.alert(
                'You cannot deactivate your own Admin account.'
            );
            return;
        }

        const newStatus =
            selectedUser.status?.toLowerCase() === 'active'
                ? 'inactive'
                : 'active';

        try {
            setActionLoading(true);

            await updateUserStatus(id, newStatus);

            await loadDashboardData();

            window.alert(
                `User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully.`
            );

        } catch (err) {
            window.alert(err.message || 'Unable to update user.');
        } finally {
            setActionLoading(false);
        }
    }

    // ==========================================
    // DELETE USER
    // ==========================================

    async function handleDeleteUser(id) {
        const selectedUser = users.find(user => user.id === id);

        if (!selectedUser) return;

        if (isCurrentAdmin(selectedUser)) {
            window.alert(
                'You cannot delete your own Admin account.'
            );
            return;
        }

        if (!window.confirm('Are you sure you want to delete this user?')) {
            return;
        }

        try {
            setActionLoading(true);

            await deleteUser(id);

            await loadDashboardData();

            window.alert('User deleted successfully.');

        } catch (err) {
            window.alert(err.message || 'Unable to delete user.');
        } finally {
            setActionLoading(false);
        }
    }

    // ==========================================
    // APPROVE RECIPE
    // ==========================================

    async function handleApproveRecipe(id) {
        if (!window.confirm('Approve this recipe?')) {
            return;
        }

        try {
            setActionLoading(true);

            await approveRecipe(id);

            await loadDashboardData();

            window.alert('Recipe approved successfully.');

        } catch (err) {
            window.alert(err.message || 'Unable to approve recipe.');
        } finally {
            setActionLoading(false);
        }
    }

    // ==========================================
    // REJECT RECIPE
    // ==========================================

    async function handleRejectRecipe(id) {
        const reason = window.prompt(
            'Enter the reason for rejecting this recipe:'
        );

        if (reason === null) return;

        if (!reason.trim()) {
            window.alert('A rejection reason is required.');
            return;
        }

        try {
            setActionLoading(true);

            await rejectRecipe(id, reason.trim());

            await loadDashboardData();

            window.alert('Recipe rejected successfully.');

        } catch (err) {
            window.alert(err.message || 'Unable to reject recipe.');
        } finally {
            setActionLoading(false);
        }
    }

    // ==========================================
    // DELETE / ARCHIVE RECIPE
    // ==========================================

    async function handleDeleteRecipe(id) {
        if (
            !window.confirm(
                'Are you sure you want to archive this recipe?'
            )
        ) {
            return;
        }

        try {
            setActionLoading(true);

            await deleteRecipe(id);

            await loadDashboardData();

            window.alert('Recipe archived successfully.');

        } catch (err) {
            window.alert(err.message || 'Unable to archive recipe.');
        } finally {
            setActionLoading(false);
        }
    }

    // ==========================================
    // STATUS FORMAT
    // ==========================================

    function formatUserStatus(status) {
        return status?.toLowerCase() === 'active'
            ? 'Active'
            : 'Inactive';
    }

    return (
        <main className="admin-dashboard">

            {/* HERO BANNER */}

            <section className="admin-hero">

                <div className="hero-content">

                    <span className="hero-label">
                        <span>🛡️</span> ADMIN PANEL
                    </span>

                    <h1>Admin Dashboard</h1>

                    <p>
                        Welcome, Admin! Manage users and recipes,
                        review submissions, and keep your community
                        engaged.
                    </p>

                    <div className="hero-line"></div>

                </div>

                <div className="hero-food-decoration" aria-hidden="true">
                    <img
                        src="https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1400&q=90"
                        alt=""
                        onError={event => {
                            event.currentTarget.style.display = 'none';
                            event.currentTarget.parentElement.classList.add(
                                'image-unavailable'
                            );
                        }}
                    />
                </div>

                <span className="hero-leaf hero-leaf-one">🌿</span>
                <span className="hero-leaf hero-leaf-two">✦</span>
                <span className="hero-chef-decoration">♨</span>

            </section>

            {/* DATABASE STATISTICS */}

            <section className="admin-stats">

                <article className="admin-stat-card users-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-info">
                        <h2>{loading ? '...' : stats.total_users}</h2>
                        <p>Total Users</p>
                        <span>Registered platform users</span>
                    </div>
                    <span className="stat-arrow">›</span>
                </article>

                <article className="admin-stat-card recipes-card">
                    <div className="stat-icon">🍲</div>
                    <div className="stat-info">
                        <h2>{loading ? '...' : stats.total_recipes}</h2>
                        <p>Total Recipes</p>
                        <span>All submitted recipes</span>
                    </div>
                    <span className="stat-arrow">›</span>
                </article>

                <article className="admin-stat-card pending-card">
                    <div className="stat-icon">⏳</div>
                    <div className="stat-info">
                        <h2>{loading ? '...' : stats.pending_recipes}</h2>
                        <p>Pending Recipes</p>
                        <span>Awaiting approval</span>
                    </div>
                    <span className="stat-arrow">›</span>
                </article>

                <article className="admin-stat-card approved-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-info">
                        <h2>{loading ? '...' : stats.approved_recipes}</h2>
                        <p>Approved Recipes</p>
                        <span>Live on platform</span>
                    </div>
                    <span className="stat-arrow">›</span>
                </article>

            </section>

            {/* ERROR MESSAGE */}

            {error && (
                <p className="admin-empty" role="alert">
                    {error}
                    <button
                        type="button"
                        onClick={loadDashboardData}
                    >
                        Retry
                    </button>
                </p>
            )}

            {/* MANAGEMENT PANEL */}

            <section className="admin-management">

                <div className="admin-tabs">

                    <button
                        type="button"
                        className={activeTab === 'users' ? 'active-tab' : ''}
                        onClick={() => setActiveTab('users')}
                    >
                        👥 Manage Users
                    </button>

                    <button
                        type="button"
                        className={activeTab === 'recipes' ? 'active-tab' : ''}
                        onClick={() => setActiveTab('recipes')}
                    >
                        🍲 Manage Recipes
                    </button>

                    <span className="tabs-decoration">🌿</span>

                </div>

                {/* ================================== */}
                {/* USER MANAGEMENT */}
                {/* ================================== */}

                {activeTab === 'users' && (

                    <div className="admin-table-section">

                        <div className="section-toolbar">

                            <div className="section-heading">
                                <span className="heading-icon">👤</span>
                                <div>
                                    <h2>Registered Users</h2>
                                    <p>Search, filter and manage user accounts</p>
                                </div>
                            </div>

                            <div className="admin-user-filters">

                                <label className="admin-search-box">
                                    <span>⌕</span>
                                    <input
                                        type="search"
                                        placeholder="Search by name or email..."
                                        value={searchUser}
                                        onChange={event =>
                                            setSearchUser(event.target.value)
                                        }
                                    />
                                </label>

                                <select
                                    value={roleFilter}
                                    onChange={event =>
                                        setRoleFilter(event.target.value)
                                    }
                                >
                                    <option value="All">All Roles</option>
                                    <option value="user">User</option>
                                    <option value="moderator">Moderator</option>
                                    <option value="admin">Admin</option>
                                </select>

                                <select
                                    value={statusFilter}
                                    onChange={event =>
                                        setStatusFilter(event.target.value)
                                    }
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>

                            </div>

                        </div>

                        <div className="admin-table-wrapper">

                            <table className="admin-table">

                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Status</th>
                                        <th className="actions-column">Actions</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    {displayedUsers.map(user => {
                                        const status = formatUserStatus(user.status);
                                        const role = user.role || 'user';
                                        const isAdmin = isCurrentAdmin(user);

                                        return (
                                            <tr key={user.id}>

                                                <td>{user.id}</td>

                                                <td>
                                                    <div className="user-name-cell">
                                                        <span className="user-avatar">
                                                            {(user.display_name || 'U')
                                                                .charAt(0)
                                                                .toUpperCase()}
                                                        </span>
                                                        <span>
                                                            {user.display_name || 'Unnamed'}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td>{user.email}</td>

                                                <td>
                                                    <span className={`role-badge ${role.toLowerCase()}`}>
                                                        {role.charAt(0).toUpperCase() + role.slice(1)}
                                                    </span>
                                                </td>

                                                <td>
                                                    <span className={`admin-status ${status.toLowerCase()}`}>
                                                        <span className="status-dot"></span>
                                                        {status}
                                                    </span>
                                                </td>

                                                <td className="actions-cell">
                                                    <div className="admin-action-buttons">

                                                        <button
                                                            type="button"
                                                            className="toggle-user-btn"
                                                            disabled={isAdmin || actionLoading}
                                                            onClick={() => toggleUserStatus(user.id)}
                                                        >
                                                            {status === 'Active'
                                                                ? 'Ⅱ Deactivate'
                                                                : '▶ Activate'}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="delete-admin-btn"
                                                            disabled={isAdmin || actionLoading}
                                                            onClick={() => handleDeleteUser(user.id)}
                                                        >
                                                            ▤ Delete
                                                        </button>

                                                    </div>
                                                </td>

                                            </tr>
                                        );
                                    })}

                                </tbody>

                            </table>

                            {loading && (
                                <p className="admin-empty">
                                    Loading users from MySQL...
                                </p>
                            )}

                            {!loading && filteredUsers.length === 0 && (
                                <p className="admin-empty">
                                    No users found.
                                </p>
                            )}

                        </div>

                        <div className="admin-pagination">

                            <p>
                                Showing{' '}
                                {filteredUsers.length === 0
                                    ? 0
                                    : (currentPage - 1) * usersPerPage + 1}
                                –
                                {Math.min(
                                    currentPage * usersPerPage,
                                    filteredUsers.length
                                )}
                                {' '}of {filteredUsers.length} users
                            </p>

                            <div className="pagination-buttons">

                                <button
                                    type="button"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(page => page - 1)}
                                >
                                    ‹
                                </button>

                                {Array.from(
                                    { length: totalPages },
                                    (_, index) => index + 1
                                ).map(page => (
                                    <button
                                        type="button"
                                        key={page}
                                        className={currentPage === page ? 'current-page' : ''}
                                        onClick={() => setCurrentPage(page)}
                                    >
                                        {page}
                                    </button>
                                ))}

                                <button
                                    type="button"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(page => page + 1)}
                                >
                                    ›
                                </button>

                            </div>

                        </div>

                    </div>
                )}

                {/* ================================== */}
                {/* RECIPE MANAGEMENT */}
                {/* ================================== */}

                {activeTab === 'recipes' && (

                    <div className="admin-table-section">

                        <div className="section-toolbar">

                            <div className="section-heading">
                                <span className="heading-icon">🍲</span>
                                <div>
                                    <h2>Manage Recipes</h2>
                                    <p>
                                        Review, approve and manage submitted recipes
                                    </p>
                                </div>
                            </div>

                            <div className="admin-user-filters recipe-filters">

                                <label className="admin-search-box">
                                    <span>⌕</span>
                                    <input
                                        type="search"
                                        placeholder="Search recipes..."
                                        value={recipeSearch}
                                        onChange={event =>
                                            setRecipeSearch(event.target.value)
                                        }
                                    />
                                </label>

                                <select
                                    value={recipeFilter}
                                    onChange={event =>
                                        setRecipeFilter(event.target.value)
                                    }
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Rejected">Rejected</option>
                                </select>

                            </div>

                        </div>

                        <div className="admin-table-wrapper">

                            <table className="admin-table recipe-admin-table">

                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Recipe Name</th>
                                        <th>Category</th>
                                        <th>Submitted By</th>
                                        <th>Status</th>
                                        <th className="actions-column">Actions</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    {filteredRecipes.map(recipe => (

                                        <tr key={recipe.id}>

                                            <td>{recipe.id}</td>

                                            <td>
                                                <strong className="recipe-name">
                                                    🍽️ {recipe.name}
                                                </strong>
                                            </td>

                                            <td>{recipe.category}</td>

                                            <td>{recipe.submittedBy}</td>

                                            <td>
                                                <span className={`admin-status ${recipe.status.toLowerCase()}`}>
                                                    <span className="status-dot"></span>
                                                    {recipe.status}
                                                </span>
                                            </td>

                                            <td className="actions-cell">

                                                <div className="admin-action-buttons">

                                                    {recipe.status === 'Pending' && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                className="approve-admin-btn"
                                                                disabled={actionLoading}
                                                                onClick={() =>
                                                                    handleApproveRecipe(recipe.id)
                                                                }
                                                            >
                                                                ✓ Approve
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="reject-admin-btn"
                                                                disabled={actionLoading}
                                                                onClick={() =>
                                                                    handleRejectRecipe(recipe.id)
                                                                }
                                                            >
                                                                ✕ Reject
                                                            </button>
                                                        </>
                                                    )}

                                                    <button
                                                        type="button"
                                                        className="delete-admin-btn"
                                                        disabled={actionLoading}
                                                        onClick={() =>
                                                            handleDeleteRecipe(recipe.id)
                                                        }
                                                    >
                                                        ▤ Delete
                                                    </button>

                                                </div>

                                            </td>

                                        </tr>

                                    ))}

                                </tbody>

                            </table>

                            {loading && (
                                <p className="admin-empty">
                                    Loading recipes from MySQL...
                                </p>
                            )}

                            {!loading && filteredRecipes.length === 0 && (
                                <p className="admin-empty">
                                    🍲 No recipes found.
                                </p>
                            )}

                        </div>

                    </div>
                )}

            </section>

        </main>
    );
}

export default AdminDashboard;
