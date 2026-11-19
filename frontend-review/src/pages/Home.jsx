
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import RecipeCard from '../components/RecipeCard';
import { recipes } from '../data/recipes';
import { getFeaturedRecipes, getCategories } from '../services/portalApi';
import './Home.css';

function Home() {
    const navigate = useNavigate();

    const [search, setSearch] = useState('');
    const [backendRecipes, setBackendRecipes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    // Default static recipes from the Featured Recipes admin page
    const defaultStaticRecipes = [
        {
            id: 1,
            name: 'Vegetable Biryani',
            category: 'Indian',
            description: 'A delicious and flavorful vegetable biryani.',
            image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=700',
            featured: true
        },
        {
            id: 2,
            name: 'Masala Dosa',
            category: 'Indian',
            description: 'Crispy dosa served with chutney and sambar.',
            image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=700',
            featured: false
        },
        {
            id: 3,
            name: 'Chocolate Cake',
            category: 'Dessert',
            description: 'A soft and rich chocolate cake.',
            image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=700',
            featured: true
        },
        {
            id: 4,
            name: 'Paneer Butter Masala',
            category: 'Indian',
            description: 'Creamy paneer cooked in a rich tomato gravy.',
            image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=700',
            featured: false
        },
        {
            id: 5,
            name: 'Fruit Salad',
            category: 'Healthy',
            description: 'A refreshing mix of fresh fruits.',
            image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=700',
            featured: false
        }
    ];

    // Read the static featured status saved by the admin page
    const [staticRecipes, setStaticRecipes] = useState(() => {
        const savedRecipes = localStorage.getItem('featuredStaticRecipes');

        return savedRecipes
            ? JSON.parse(savedRecipes)
            : defaultStaticRecipes;
    });

    // Existing categories and icons
    const categories = [
        { name: 'Biryani', icon: '🍛' },
        { name: 'Starters', icon: '🍢' },
        { name: 'Main Course', icon: '🍲' },
        { name: 'South Indian', icon: '🥞' },
        { name: 'Chinese', icon: '🍜' },
        { name: 'Dessert', icon: '🍰' }
    ];

    // Load featured recipes from backend
    useEffect(() => {
        async function loadFeaturedRecipes() {
            try {
                setIsLoading(true);
                setErrorMessage('');

                const [recipeResponse, categoryResponse] = await Promise.all([
                    getFeaturedRecipes(),
                    getCategories()
                ]);

                const recipeData = Array.isArray(recipeResponse)
                    ? recipeResponse
                    : recipeResponse?.items || [];

                const categoryData = Array.isArray(categoryResponse)
                    ? categoryResponse
                    : categoryResponse?.items || [];

                const formattedRecipes = recipeData.map((recipe) => {
                    const category = categoryData.find(
                        (item) =>
                            Number(item.id) === Number(recipe.category_id)
                    );

                    return {
                        ...recipe,
                        id: recipe.id,
                        title: recipe.title,
                        name: recipe.title,
                        category: {
                            name: category?.name || 'Recipe'
                        },
                        image_url: recipe.image_url || null,
                        cook_time_minutes: recipe.cook_time_minutes,
                        source: 'backend'
                    };
                });

                setBackendRecipes(formattedRecipes);

            } catch (error) {
                console.error('Unable to load featured recipes:', error);

                setErrorMessage(
                    error.message ||
                    'Unable to load database featured recipes.'
                );
            } finally {
                setIsLoading(false);
            }
        }

        loadFeaturedRecipes();
    }, []);

    // Show only static recipes marked as featured in the admin page
    const staticFeaturedRecipes = staticRecipes
        .filter((recipe) => recipe.featured === true)
        .map((recipe) => ({
            ...recipe,
            title: recipe.name,
            name: recipe.name,
            category: {
                name: recipe.category || 'Recipe'
            },
            image_url: null,
            source: 'static'
        }));

    // Avoid showing the same recipe twice
    const staticRecipeNames = new Set(
        staticFeaturedRecipes.map(
            (recipe) => recipe.name.trim().toLowerCase()
        )
    );

    const uniqueBackendRecipes = backendRecipes.filter(
        (recipe) =>
            !staticRecipeNames.has(
                (recipe.title || recipe.name || '').trim().toLowerCase()
            )
    );

    // Combine static and backend featured recipes
    const featuredRecipes = [
        ...staticFeaturedRecipes,
        ...uniqueBackendRecipes
    ];

    const handleSearch = (event) => {
        event.preventDefault();

        navigate(
            search.trim()
                ? `/recipes?search=${encodeURIComponent(search.trim())}`
                : '/recipes'
        );
    };

    return (
        <main className="home-page">

            {/* Hero Section */}
            <section className="home-hero">

                <div className="home-hero-overlay"></div>

                {/* Left Side Content */}
                <div className="home-hero-content">

                    <span className="home-eyebrow">
                        ✨ GOOD FOOD, GOOD MOOD
                    </span>

                    <h1>
                        Discover the joy
                        <br />
                        of <span>homemade cooking.</span>
                    </h1>

                    <p>
                        Explore delicious recipes, discover new flavours
                        and bring happiness to your kitchen.
                    </p>

                    <form className="home-search" onSubmit={handleSearch}>

                        <span className="home-search-icon">⌕</span>

                        <input
                            type="text"
                            placeholder="Search your favourite recipes..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            aria-label="Search recipes"
                        />

                        <button type="submit">
                            Explore Now →
                        </button>

                    </form>

                    <div className="home-hero-note">
                        <span>🍽️</span>
                        <span>Made with love. Served with happiness.</span>
                    </div>

                </div>

                {/* Right Side Vegetable Biryani Image */}
                <div className="home-hero-image">

                    <img
                        src={recipes[0]?.image}
                        alt="Delicious Vegetable Biryani"
                        onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.style.display = 'none';
                        }}
                    />

                </div>

                {/* Chef's Special Label */}
                <div className="home-hero-label">
                    <span>CHEF'S SPECIAL</span>
                    <strong>Delicious moments start here.</strong>
                </div>

            </section>

            {/* Welcome Section */}
            <section className="home-welcome">

                <div>
                    <span className="home-section-tag">
                        WELCOME TO OUR KITCHEN
                    </span>

                    <h2>
                        Cooking is an art. <span>Let's create!</span>
                    </h2>

                    <p>
                        From traditional favourites to exciting new dishes,
                        find something wonderful to cook today.
                    </p>
                </div>

                <div className="home-welcome-stats">

                    <div>
                        <strong>{recipes.length + uniqueBackendRecipes.length}+</strong>
                        <span>Recipes</span>
                    </div>

                    <div>
                        <strong>6</strong>
                        <span>Food Categories</span>
                    </div>

                </div>

            </section>

            {/* Categories */}
            <section className="home-categories">

                <div className="home-section-heading">

                    <div>
                        <span className="home-section-tag">
                            EXPLORE BY TASTE
                        </span>

                        <h2>What are you craving?</h2>
                    </div>

                    <Link to="/recipes" className="home-text-link">
                        View all recipes →
                    </Link>

                </div>

                <div className="home-category-list">

                    {categories.map((category) => (
                        <Link
                            to="/recipes"
                            className="home-category-item"
                            key={category.name}
                        >
                            <span>{category.icon}</span>
                            <strong>{category.name}</strong>
                            <small>Explore dishes →</small>
                        </Link>
                    ))}

                </div>

            </section>

            {/* Featured Recipes */}
            <section className="home-featured" id="recipes">

                <div className="home-section-heading">

                    <div>
                        <span className="home-section-tag">
                            HANDPICKED FOR YOU
                        </span>

                        <h2>Our delicious favourites</h2>

                        <p>
                            Recipes that make every meal special.
                        </p>
                    </div>

                    <Link to="/recipes" className="home-view-all">
                        Explore all recipes <span>→</span>
                    </Link>

                </div>

                {featuredRecipes.length > 0 ? (

                    <div className="home-featured-grid">

                        {featuredRecipes.map((recipe) => (
                            <RecipeCard
                                key={`${recipe.source}-${recipe.id}`}
                                recipe={recipe}
                            />
                        ))}

                    </div>

                ) : (

                    <div className="home-empty">
                        <span>🍲</span>
                        <h3>No recipes available yet</h3>
                        <p>
                            Come back soon to discover delicious dishes.
                        </p>
                    </div>

                )}

                {isLoading && (
                    <p>Loading database featured recipes...</p>
                )}

                {errorMessage && (
                    <p className="home-error-message">
                        {errorMessage}
                    </p>
                )}

            </section>

            {/* Cooking Banner */}
            <section className="home-bottom-banner">

                <div>
                    <span>❤️ A LITTLE LOVE IN EVERY RECIPE</span>

                    <h2>Your next favourite meal is waiting.</h2>

                    <p>
                        Discover something delicious and make today memorable.
                    </p>

                    <Link to="/recipes" className="home-banner-button">
                        Find Your Recipe →
                    </Link>
                </div>

                <div className="home-banner-decoration">
                    🍽️
                </div>

            </section>

        </main>
    );
}

export default Home;
