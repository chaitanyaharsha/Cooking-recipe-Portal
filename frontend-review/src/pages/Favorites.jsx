
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { recipes } from '../data/recipes';
import { useFavorites } from '../context/FavoritesContext';
import RecipeCard from '../components/RecipeCard';
import './Favorites.css';

// Load approved user-submitted recipes safely.
function loadApprovedRecipes() {
    try {
        const savedRecipes = JSON.parse(
            localStorage.getItem('moderatorRecipes') || '[]'
        );

        if (!Array.isArray(savedRecipes)) return [];

        return savedRecipes.filter(recipe =>
            recipe &&
            (
                String(recipe.status || '').toLowerCase() === 'approved' ||
                String(recipe.status || '').toLowerCase() === 'published'
            )
        );
    } catch (error) {
        console.error('Unable to load approved recipes:', error);
        return [];
    }
}

// Normalize database recipes for the existing RecipeCard.
function normalizeDatabaseRecipe(recipe) {
    const apiBaseUrl = (
        import.meta.env.VITE_API_BASE_URL ||
        'http://127.0.0.1:8000'
    ).replace(/\/+$/, '');

    const rawImage = recipe.image_url || recipe.image || '';

    let image = rawImage;

    if (
        typeof rawImage === 'string' &&
        rawImage.startsWith('/')
    ) {
        image = `${apiBaseUrl}${rawImage}`;
    }

    return {
        ...recipe,

        id: recipe.id,

        // Keep database IDs separate from static recipe IDs.
        routeId: `db-${recipe.id}`,

        name: recipe.title || recipe.name || 'Untitled Recipe',

        image,

        category:
            recipe.category?.name ||
            recipe.category_name ||
            recipe.category ||
            'Other',

        time:
            recipe.cook_time_minutes ??
            recipe.time ??
            '',

        cookingTime:
            recipe.cook_time_minutes ??
            recipe.cookingTime ??
            '',

        preparationTime:
            recipe.prep_time_minutes ??
            recipe.preparationTime ??
            '',

        prepTime:
            recipe.prep_time_minutes ??
            recipe.prepTime ??
            '',

        description: recipe.description || '',

        isDatabaseRecipe: true
    };
}

function Favorites() {
    const {
        favorites = [],
        favoritesLoading
    } = useFavorites();

    // Combine static recipes and approved locally submitted recipes.
    const allRecipes = useMemo(() => {
        const approvedRecipes = loadApprovedRecipes();

        const combinedRecipes = [
            ...recipes,
            ...approvedRecipes
        ];

        return combinedRecipes.filter(
            (recipe, index, self) =>
                recipe &&
                self.findIndex(
                    item =>
                        String(item.id) === String(recipe.id)
                ) === index
        );
    }, []);

    // Convert favorite identities into actual recipe cards.
    const favoriteRecipes = useMemo(() => {
        if (!Array.isArray(favorites)) return [];

        // Static favorites are stored as IDs.
        const staticFavoriteIds = favorites
            .filter(favorite =>
                favorite === null ||
                typeof favorite !== 'object'
            )
            .map(String);

        // Database favorites are complete recipe objects.
        const databaseFavoriteRecipes = favorites.filter(
            favorite =>
                favorite &&
                typeof favorite === 'object' &&
                favorite.id !== undefined &&
                favorite.id !== null
        );

        // Find static and locally approved favorite recipes.
        const staticResults = allRecipes
            .filter(recipe =>
                staticFavoriteIds.includes(String(recipe.id))
            )
            .map(recipe => ({
                ...recipe,
                routeId: recipe.routeId || recipe.id
            }));

        // Convert backend favorite objects.
        const databaseResults = databaseFavoriteRecipes.map(
            normalizeDatabaseRecipe
        );

        const combined = [
            ...staticResults,
            ...databaseResults
        ];

        // Prevent duplicates while keeping static ID 2
        // and database ID 2 as separate recipes.
        return combined.filter(
            (recipe, index, self) =>
                self.findIndex(
                    item =>
                        String(item.routeId || item.id) ===
                        String(recipe.routeId || recipe.id)
                ) === index
        );
    }, [favorites, allRecipes]);

    return (
        <div className="favorites-page">

            <section className="favorites-hero">
                <div className="favorites-hero-content">

                    <span className="favorites-eyebrow">
                        YOUR PERSONAL COLLECTION
                    </span>

                    <h1>
                        Made with love,
                        <span> saved for later.</span>
                    </h1>

                    <p>
                        All the delicious recipes you love, gathered
                        together in one place. Your next favourite meal
                        is just a click away.
                    </p>

                    <div className="favorites-hero-stats">
                        <div>
                            <strong>{favoriteRecipes.length}</strong>
                            <span>Saved Recipes</span>
                        </div>

                        <div className="favorites-stat-divider"></div>

                        <div>
                            <strong>♥</strong>
                            <span>Made with Love</span>
                        </div>
                    </div>
                </div>

                <div className="favorites-hero-image">
                    <img
                        src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=90"
                        alt="A delicious collection of food"
                    />

                    <div className="favorites-image-note">
                        <span>♥</span>
                        Your kitchen favourites
                    </div>
                </div>
            </section>

            <section className="favorites-content">

                <div className="favorites-heading">
                    <div>
                        <span className="favorites-section-label">
                            YOUR COLLECTION
                        </span>

                        <h2>My Favorite Recipes</h2>

                        <p>
                            The dishes you love, all in one place.
                        </p>
                    </div>

                    <Link
                        to="/recipes"
                        className="favorites-browse-btn"
                    >
                        Explore More Recipes
                        <span>→</span>
                    </Link>
                </div>

                {favoritesLoading ? (

                    <div className="empty-favorites">
                        <div className="empty-favorites-icon">♡</div>

                        <h2>Loading your favorites...</h2>

                        <p>
                            Please wait while your saved recipes load.
                        </p>
                    </div>

                ) : favoriteRecipes.length === 0 ? (

                    <div className="empty-favorites">
                        <div className="empty-favorites-icon">♡</div>

                        <span className="favorites-section-label">
                            YOUR COLLECTION IS WAITING
                        </span>

                        <h2>No favorites saved yet!</h2>

                        <p>
                            Start exploring delicious recipes and save
                            the dishes you love. They will appear here.
                        </p>

                        <Link
                            to="/recipes"
                            className="explore-btn"
                        >
                            Explore Recipes
                            <span>→</span>
                        </Link>
                    </div>

                ) : (

                    <>
                        <div className="favorites-result-count">
                            Showing <strong>{favoriteRecipes.length}</strong>
                            {' '}saved {
                                favoriteRecipes.length === 1
                                    ? 'recipe'
                                    : 'recipes'
                            }
                        </div>

                        <div className="recipe-grid favorites-recipe-grid">
                            {favoriteRecipes.map(recipe => (
                                <RecipeCard
                                    key={recipe.routeId || recipe.id}
                                    recipe={recipe}
                                />
                            ))}
                        </div>
                    </>

                )}

            </section>
        </div>
    );
}

export default Favorites;
