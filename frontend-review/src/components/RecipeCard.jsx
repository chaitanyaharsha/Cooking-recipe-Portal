
import './RecipeCard.css';
import { Link } from 'react-router-dom';
import { useFavorites } from '../context/FavoritesContext';

function RecipeCard({ recipe }) {
    const { toggleFavorite, isFavorite } = useFavorites();

    const isDatabaseRecipe =
        recipe.isDatabaseRecipe ||
        String(recipe.routeId || '').startsWith('db-') ||
        String(recipe.routeId || '').startsWith('database-');

    // Preserve the existing static recipe identity
    // and use the prefixed identity for database recipes
    const favoriteIdentity = isDatabaseRecipe
        ? (recipe.routeId || `db-${recipe.id}`)
        : recipe.id;

    const favorite = isFavorite(favoriteIdentity);

    // Support absolute URLs, Base64 images and backend upload paths
    const apiBaseUrl = (
        import.meta.env.VITE_API_BASE_URL ||
        'http://127.0.0.1:8000'
    ).replace(/\/$/, '');

    const rawImage = recipe.image || recipe.image_url || '';

    let imageSource = '';

    if (typeof rawImage === 'string') {
        if (
            rawImage.startsWith('data:image/') ||
            rawImage.startsWith('http://') ||
            rawImage.startsWith('https://')
        ) {
            imageSource = rawImage;
        } else if (rawImage.startsWith('/')) {
            imageSource = `${apiBaseUrl}${rawImage}`;
        }
    }

    // Display the recipe emoji when an actual image is unavailable
    const imageEmoji =
        !imageSource &&
        typeof rawImage === 'string' &&
        rawImage.trim() !== '' &&
        !rawImage.startsWith('/')
            ? rawImage
            : '🍲';

    return (
        <div className="recipe-card">

            <div className="recipe-image-container">

                {imageSource ? (
                    <img
                        src={imageSource}
                        alt={recipe.name || recipe.title || 'Recipe'}
                        className="recipe-image"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                ) : (
                    <div className="recipe-image">
                        {imageEmoji}
                    </div>
                )}

                <button
                    type="button"
                    className="favorite-btn"
                    onClick={async () => {
                        try {
                            await toggleFavorite(favoriteIdentity);
                        } catch (error) {
                            console.error(
                                'Unable to update favorite:',
                                error
                            );

                            window.alert(
                                error.message ||
                                'Unable to update favorite. Please try again.'
                            );
                        }
                    }}
                    aria-label={
                        favorite
                            ? 'Remove from favorites'
                            : 'Add to favorites'
                    }
                >
                    {favorite ? '❤️' : '🤍'}
                </button>

            </div>

            <div className="recipe-card-content">

                <h3>{recipe.name || recipe.title}</h3>

                <p>
                    Category: {
                        recipe.category?.name ||
                        recipe.category ||
                        'Other'
                    }
                </p>

                <p>
                    Cooking Time: {
                        recipe.cookingTime ||
                        recipe.cook_time_minutes ||
                        recipe.time ||
                        'Not specified'
                    }
                </p>

                <Link
                    to={`/recipes/${recipe.routeId || recipe.id}`}
                    className="view-recipe-btn"
                >
                    View Recipe
                </Link>

            </div>

        </div>
    );
}

export default RecipeCard;
