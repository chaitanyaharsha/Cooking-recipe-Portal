
import './UserDashboard.css';

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { recipes } from '../data/recipes';
import {
    getRecipes,
    getFavorites,
    getCategories
} from '../services/portalApi';


function loadFavoriteItems() {
    const savedFavorites = localStorage.getItem('favorites');

    if (!savedFavorites) return [];

    const parsedFavorites = JSON.parse(savedFavorites);

    return Array.isArray(parsedFavorites) ? parsedFavorites : [];
}


function loadApprovedRecipes() {
    try {
        const savedRecipes = JSON.parse(
            localStorage.getItem('moderatorRecipes') || '[]'
        );

        if (!Array.isArray(savedRecipes)) return [];

        return savedRecipes.filter((recipe) => {
            const status = String(recipe?.status || '').toLowerCase();

            return status === 'approved' || status === 'published';
        });
    } catch (error) {
        console.error('Unable to load approved recipes:', error);
        return [];
    }
}


function getRecipeId(recipe) {
    return recipe?.id ?? recipe?._id ?? recipe?.recipeId;
}


function getFavoriteKey(favorite) {
    if (favorite === null || favorite === undefined) {
        return null;
    }

    if (typeof favorite === 'object') {
        const id = getRecipeId(favorite);

        return id !== undefined && id !== null
            ? String(id)
            : JSON.stringify(favorite);
    }

    return String(favorite);
}


async function getAllPublishedRecipes() {
    const firstResponse = await getRecipes({
        page: 1,
        page_size: 100
    });

    const firstPageRecipes = Array.isArray(firstResponse?.items)
        ? firstResponse.items
        : [];

    const totalPages = firstResponse?.total_pages || 1;

    if (totalPages <= 1) {
        return firstPageRecipes;
    }

    const remainingPages = await Promise.allSettled(
        Array.from(
            { length: totalPages - 1 },
            (_, index) => getRecipes({
                page: index + 2,
                page_size: 100
            })
        )
    );

    const additionalRecipes = remainingPages
        .filter((result) => result.status === 'fulfilled')
        .flatMap((result) =>
            Array.isArray(result.value?.items)
                ? result.value.items
                : []
        );

    return [...firstPageRecipes, ...additionalRecipes];
}


function UserDashboard() {
    const { user } = useAuth();

    const [favoriteCount, setFavoriteCount] = useState(0);
    const [allRecipes, setAllRecipes] = useState([
        ...(Array.isArray(recipes) ? recipes : []),
        ...loadApprovedRecipes()
    ]);
    const [categoryCount, setCategoryCount] = useState(0);
    const [instructionCount, setInstructionCount] = useState(0);
    const [dashboardLoading, setDashboardLoading] = useState(true);

    useEffect(() => {
        async function loadDashboardData() {
            const results = await Promise.allSettled([
                getAllPublishedRecipes(),
                getFavorites(),
                getCategories()
            ]);

            let backendRecipes = [];
            let backendFavorites = [];
            let backendCategories = [];

            if (results[0].status === 'fulfilled') {
                backendRecipes = results[0].value;
            } else {
                console.error(
                    'Unable to load published recipes:',
                    results[0].reason
                );
            }

            if (results[1].status === 'fulfilled') {
                backendFavorites = results[1].value;
            } else {
                console.error(
                    'Unable to load favorites:',
                    results[1].reason
                );
            }

            if (results[2].status === 'fulfilled') {
                backendCategories = results[2].value;
            } else {
                console.error(
                    'Unable to load categories:',
                    results[2].reason
                );
            }

            // Preserve static recipes and approved local recipes.
            // Backend recipes take priority when IDs match.
            const staticRecipes = [
                ...(Array.isArray(recipes) ? recipes : []),
                ...loadApprovedRecipes()
            ];

            const combinedRecipes = [
                ...backendRecipes,
                ...staticRecipes
            ].filter(
                (recipe, index, self) => {
                    const id = getRecipeId(recipe);

                    if (id === undefined || id === null) {
                        return true;
                    }

                    return self.findIndex(
                        (item) =>
                            String(getRecipeId(item)) === String(id)
                    ) === index;
                }
            );

            setAllRecipes(combinedRecipes);

            // Combine backend favorites with existing static favorites.
            const localFavorites = loadFavoriteItems();

            const favoriteKeys = new Set(
                [
                    ...backendFavorites,
                    ...localFavorites
                ]
                    .map(getFavoriteKey)
                    .filter(Boolean)
            );

            setFavoriteCount(favoriteKeys.size);

            // Count active backend categories and static recipe categories.
            const categoryNames = [
                ...backendCategories.map((category) =>
                    category.name?.trim().toLowerCase()
                ),
                ...combinedRecipes.map((recipe) => {
                    if (typeof recipe.category === 'string') {
                        return recipe.category.trim().toLowerCase();
                    }

                    return (
                        recipe.category?.name ||
                        recipe.category_name ||
                        ''
                    ).trim().toLowerCase();
                })
            ].filter(Boolean);

            setCategoryCount(new Set(categoryNames).size);

            // Calculate cooking steps from available recipes.
            const totalInstructions = combinedRecipes.reduce(
                (total, recipe) =>
                    total +
                    (Array.isArray(recipe.steps)
                        ? recipe.steps.length
                        : Array.isArray(recipe.instructions)
                            ? recipe.instructions.length
                            : 0),
                0
            );

            setInstructionCount(totalInstructions);

            setDashboardLoading(false);
        }

        loadDashboardData();

    }, []);


    const displayName =
        user?.name ||
        user?.display_name ||
        user?.full_name ||
        user?.email?.split('@')[0] ||
        'Food Lover';


    const stats = [
        {
            icon: '🍲',
            count: dashboardLoading ? '...' : allRecipes.length,
            label: 'Available Recipes',
            color: 'orange'
        },
        {
            icon: '❤️',
            count: dashboardLoading ? '...' : favoriteCount,
            label: 'My Favorites',
            color: 'pink'
        },
        {
            icon: '📂',
            count: dashboardLoading ? '...' : categoryCount,
            label: 'Recipe Categories',
            color: 'yellow'
        },
        {
            icon: '👨‍🍳',
            count: dashboardLoading ? '...' : instructionCount,
            label: 'Cooking Steps',
            color: 'green'
        }
    ];


    const quickLinks = [
        {
            title: 'My Profile',
            description: 'View and update your profile',
            image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=700&auto=format&fit=crop&q=85',
            icon: '👤',
            path: '/profile'
        },
        {
            title: 'My Recipes',
            description: 'Manage your created recipes',
            image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=700&auto=format&fit=crop&q=85',
            icon: '🍲',
            path: '/my-recipes'
        },
        {
            title: 'My Drafts',
            description: 'Continue editing your drafts',
            image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=700&auto=format&fit=crop&q=85',
            icon: '📝',
            path: '/my-drafts'
        },
        {
            title: 'Favorites',
            description: 'Your saved favourite dishes',
            image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=700&auto=format&fit=crop&q=85',
            icon: '❤️',
            path: '/favorites'
        },
        {
            title: 'My Reviews',
            description: 'View your recipe reviews',
            image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=700&auto=format&fit=crop&q=85',
            icon: '⭐',
            path: '/my-reviews'
        },
        {
            title: 'Explore Recipes',
            description: 'Discover something delicious',
            image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=700&auto=format&fit=crop&q=85',
            icon: '🔍',
            path: '/recipes'
        }
    ];


    // User-specific recent activity API is not available yet.
    const activities = [];


    const heroRecipe = recipes.find((recipe) => recipe.image);


    return (
        <main className="user-dashboard">

            {/* HERO BANNER */}
            <section className="dashboard-hero">
                <div className="dashboard-hero-content">
                    <span className="dashboard-eyebrow">
                        YOUR PERSONAL RECIPE SPACE
                    </span>

                    <h1>
                        Welcome Back,
                        <span>{displayName}! 👋</span>
                    </h1>

                    <p>
                        Discover delicious ideas, manage your recipes
                        and share your love for cooking with the world.
                    </p>

                    <div className="dashboard-hero-actions">
                        <Link to="/create-recipe" className="dashboard-create-btn">
                            + Create Recipe <span>→</span>
                        </Link>

                        <Link to="/recipes" className="dashboard-explore-btn">
                            Explore Recipes
                        </Link>
                    </div>

                    <div className="dashboard-hero-note">
                        <span>✦</span> Cook it. Share it. Inspire someone.
                    </div>
                </div>

                <div className="dashboard-hero-image">
                    <img
                        src={heroRecipe?.image || 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=1200&auto=format&fit=crop&q=90'}
                        alt="Freshly prepared pasta with vegetables"
                    />

                    <div className="dashboard-image-tag">
                        <span>🍃</span>
                        Made with love
                    </div>
                </div>
            </section>


            {/* STATISTICS */}
            <section className="dashboard-section dashboard-statistics">
                <div className="dashboard-section-heading">
                    <div>
                        <span className="dashboard-small-label">AT A GLANCE</span>
                        <h2>My Statistics</h2>
                    </div>
                    <p>Your cooking journey in numbers</p>
                </div>

                <div className="dashboard-stats-grid">
                    {stats.map((item) => (
                        <article
                            className={`dashboard-stat-card ${item.color}`}
                            key={item.label}
                        >
                            <div className="dashboard-stat-icon">
                                {item.icon}
                            </div>

                            <div>
                                <h3>{item.count}</h3>
                                <p>{item.label}</p>
                            </div>

                            <span className="dashboard-stat-decoration">✦</span>
                        </article>
                    ))}
                </div>
            </section>


            {/* QUICK ACCESS */}
            <section className="dashboard-section dashboard-quick-access">
                <div className="dashboard-section-heading">
                    <div>
                        <span className="dashboard-small-label">YOUR SPACE</span>
                        <h2>Quick Access</h2>
                    </div>
                    <p>Everything you need, just one click away</p>
                </div>

                <div className="dashboard-quick-grid">
                    {quickLinks.map((item) => (
                        <Link
                            to={item.path}
                            className="dashboard-quick-card"
                            key={item.title}
                        >
                            <div className="dashboard-quick-image">
                                <img
                                    src={item.image}
                                    alt={item.title}
                                    loading="lazy"
                                />

                                <span className="dashboard-quick-icon">
                                    {item.icon}
                                </span>
                            </div>

                            <div className="dashboard-quick-info">
                                <div>
                                    <h3>{item.title}</h3>
                                    <p>{item.description}</p>
                                </div>
                                <span className="dashboard-quick-arrow">→</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>


            {/* RECENT ACTIVITY AND SIDE PANEL */}
            <section className="dashboard-bottom-grid">

                <div className="dashboard-activity-panel">
                    <div className="dashboard-panel-heading">
                        <div>
                            <span className="dashboard-small-label">
                                YOUR LATEST UPDATES
                            </span>
                            <h2>Recent Activity</h2>
                        </div>
                        <span className="dashboard-activity-badge">
                            {activities.length} Activities
                        </span>
                    </div>

                    {activities.length === 0 ? (
                        <div className="dashboard-empty">
                            <span>🍽️</span>
                            <h3>No Recent Activity</h3>
                            <p>Your cooking activities will appear here.</p>
                        </div>
                    ) : (
                        <div className="dashboard-activity-list">
                            {activities.map((item) => (
                                <article className="dashboard-activity-item" key={item.id}>
                                    <img
                                        src={item.image}
                                        alt=""
                                        loading="lazy"
                                    />

                                    <div className="dashboard-activity-text">
                                        <h3>{item.activity}</h3>
                                        <p>{item.date}</p>
                                    </div>

                                    <span className="dashboard-activity-check">
                                        ✓
                                    </span>
                                </article>
                            ))}
                        </div>
                    )}
                </div>


                <aside className="dashboard-inspiration-panel">
                    <img
                        src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&auto=format&fit=crop&q=85"
                        alt="Healthy fresh food ingredients"
                        loading="lazy"
                    />

                    <div className="dashboard-inspiration-overlay">
                        <span>✦ A LITTLE INSPIRATION</span>
                        <h2>Good food brings people together.</h2>
                        <p>
                            Every dish has a story. Create yours and
                            share it with our food-loving community.
                        </p>
                        <Link to="/create-recipe">
                            Share Your Recipe →
                        </Link>
                    </div>
                </aside>

            </section>


            {/* FOOTER */}
            <footer className="dashboard-footer">
                <p>Made with ❤️ for food lovers</p>
                <span>Cooking Recipe Portal © 2026</span>
            </footer>

        </main>
    );
}

export default UserDashboard;
