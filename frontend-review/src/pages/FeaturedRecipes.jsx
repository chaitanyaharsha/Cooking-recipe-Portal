
import './FeaturedRecipes.css';
import { useState, useEffect } from 'react';

import {
    getAdminFeaturedRecipes,
    getCategories,
    setRecipeFeatured
} from '../services/portalApi';

function FeaturedRecipes() {

    // ==========================================
    // STATIC RECIPES
    // ==========================================

    const defaultStaticRecipes = [
        {
            id: 1,
            name: 'Vegetable Biryani',
            category: 'Indian',
            description: 'A delicious and flavorful vegetable biryani.',
            image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=700',
            featured: true,
            source: 'static'
        },
        {
            id: 2,
            name: 'Masala Dosa',
            category: 'Indian',
            description: 'Crispy dosa served with chutney and sambar.',
            image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=700',
            featured: false,
            source: 'static'
        },
        {
            id: 3,
            name: 'Chocolate Cake',
            category: 'Dessert',
            description: 'A soft and rich chocolate cake.',
            image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=700',
            featured: true,
            source: 'static'
        },
        {
            id: 4,
            name: 'Paneer Butter Masala',
            category: 'Indian',
            description: 'Creamy paneer cooked in a rich tomato gravy.',
            image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=700',
            featured: false,
            source: 'static'
        },
        {
            id: 5,
            name: 'Fruit Salad',
            category: 'Healthy',
            description: 'A refreshing mix of fresh fruits.',
            image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=700',
            featured: false,
            source: 'static'
        }
    ];

    // ==========================================
    // STATES
    // ==========================================

    const [staticRecipes, setStaticRecipes] = useState(() => {
        const savedRecipes = localStorage.getItem('featuredStaticRecipes');

        if (savedRecipes) {
            const parsedRecipes = JSON.parse(savedRecipes);

            if (Array.isArray(parsedRecipes)) {
                return parsedRecipes;
            }
        }

        return defaultStaticRecipes;
    });

    const [backendRecipes, setBackendRecipes] = useState([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('All');

    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const [updatingRecipe, setUpdatingRecipe] = useState(null);

    // ==========================================
    // SAVE STATIC RECIPE STATUS
    // ==========================================

    useEffect(() => {
        localStorage.setItem(
            'featuredStaticRecipes',
            JSON.stringify(staticRecipes)
        );
    }, [staticRecipes]);

    // ==========================================
    // LOAD BACKEND RECIPES
    // ==========================================

    useEffect(() => {
        loadBackendRecipes();
    }, []);

    async function loadBackendRecipes() {
        try {
            setIsLoading(true);

            const [recipeResponse, categoryResponse] = await Promise.all([
                getAdminFeaturedRecipes(),
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
                    id: recipe.id,
                    name: recipe.title,
                    category: category?.name || 'Recipe',
                    description: recipe.description || '',
                    image: recipe.image_url || '',
                    featured: recipe.is_featured === true,
                    source: 'backend'
                };
            });

            setBackendRecipes(formattedRecipes);

        } catch (error) {
            setMessage(
                error.message ||
                'Unable to load backend recipes. Please check your admin login.'
            );
        } finally {
            setIsLoading(false);
        }
    }

    // ==========================================
    // COMBINE STATIC AND BACKEND RECIPES
    // ==========================================

    const recipes = [
        ...staticRecipes,
        ...backendRecipes
    ];

    const featuredCount = recipes.filter(
        (recipe) => recipe.featured
    ).length;

    const filteredRecipes = recipes.filter((recipe) => {

        const matchesSearch = recipe.name
            .toLowerCase()
            .includes(searchTerm.toLowerCase());

        const matchesFilter =
            filter === 'All' ||
            (filter === 'Featured' && recipe.featured) ||
            (filter === 'Not Featured' && !recipe.featured);

        return matchesSearch && matchesFilter;
    });

    // ==========================================
    // TOGGLE FEATURED STATUS
    // ==========================================

    async function toggleFeatured(recipe) {

        const newFeaturedStatus = !recipe.featured;

        // STATIC RECIPE
        // Save changes in localStorage through useEffect

        if (recipe.source === 'static') {

            setStaticRecipes((previousRecipes) =>
                previousRecipes.map((item) =>
                    item.id === recipe.id
                        ? {
                            ...item,
                            featured: newFeaturedStatus
                        }
                        : item
                )
            );

            setMessage(
                newFeaturedStatus
                    ? 'Static recipe added to featured list!'
                    : 'Static recipe removed from featured list.'
            );

            return;
        }

        // BACKEND RECIPE
        // Save changes in MySQL

        try {
            setUpdatingRecipe(recipe.id);
            setMessage('');

            const response = await setRecipeFeatured(
                recipe.id,
                newFeaturedStatus
            );

            if (
                response &&
                response.is_featured !== undefined &&
                response.is_featured !== newFeaturedStatus
            ) {
                throw new Error(
                    'The server did not save the featured status.'
                );
            }

            // Fetch the updated database value

            const recipeResponse = await getAdminFeaturedRecipes();

            const recipeData = Array.isArray(recipeResponse)
                ? recipeResponse
                : recipeResponse?.items || [];

            const updatedRecipe = recipeData.find(
                (item) => Number(item.id) === Number(recipe.id)
            );

            if (!updatedRecipe) {
                throw new Error(
                    'Recipe was not found after updating.'
                );
            }

            setBackendRecipes((previousRecipes) =>
                previousRecipes.map((item) =>
                    Number(item.id) === Number(recipe.id)
                        ? {
                            ...item,
                            featured: updatedRecipe.is_featured === true
                        }
                        : item
                )
            );

            setMessage(
                updatedRecipe.is_featured === true
                    ? 'Database recipe added to Featured successfully!'
                    : 'Database recipe removed from Featured successfully!'
            );

        } catch (error) {

            setMessage(
                error.message ||
                'Unable to update featured status. Please try again.'
            );

            await loadBackendRecipes();

        } finally {
            setUpdatingRecipe(null);
        }
    }

    // ==========================================
    // UI
    // ==========================================

    return (
        <div className="featured-recipes-page">

            {/* Hero Header */}
            <section className="featured-hero">

                <div className="featured-hero-content">

                    <span className="featured-eyebrow">
                        RECIPE COLLECTION
                    </span>

                    <h1>Featured Recipes</h1>

                    <p>
                        Highlight delicious recipes and showcase
                        your community's favourite dishes on the
                        home page.
                    </p>

                    <div className="featured-hero-line"></div>

                </div>

                <div className="featured-hero-image">

                    <img
                        src="https://images.unsplash.com/photo-1547592180-85f173990554?w=1000"
                        alt="Delicious fresh food"
                    />

                </div>

            </section>

            {/* Statistics */}
            <section className="featured-stats">

                <div className="featured-count-card">

                    <div className="featured-count-icon">

                        <img
                            src="https://images.unsplash.com/photo-1547592180-85f173990554?w=120"
                            alt="Food"
                        />

                    </div>

                    <div>

                        <h2>{featuredCount}</h2>

                        <p>Total Featured Recipes</p>

                        <span>
                            Recipes highlighted on home page
                        </span>

                    </div>

                </div>

                <div className="featured-total-card">

                    <h2>{recipes.length}</h2>

                    <p>Total Recipes</p>

                    <span>
                        Static and database recipes
                    </span>

                </div>

            </section>

            {/* Notification */}
            {message && (

                <div className="featured-message">

                    <span>{message}</span>

                    <button
                        type="button"
                        onClick={() => setMessage('')}
                        aria-label="Close notification"
                    >
                        ×
                    </button>

                </div>

            )}

            {/* Search and Filter */}
            <section className="featured-toolbar">

                <div className="featured-search">

                    <span>⌕</span>

                    <input
                        type="text"
                        placeholder="Search delicious recipes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />

                </div>

                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                >

                    <option value="All">All Recipes</option>

                    <option value="Featured">Featured</option>

                    <option value="Not Featured">Not Featured</option>

                </select>

            </section>

            {/* Section Heading */}
            <div className="featured-section-heading">

                <div>

                    <h2>Explore Recipes</h2>

                    <p>
                        Choose the recipes you want to highlight.
                    </p>

                </div>

                <span>
                    {filteredRecipes.length} Recipes Found
                </span>

            </div>

            {/* Recipe Cards */}
            <section className="featured-recipes-list">

                {isLoading ? (

                    <div className="no-featured-recipes">

                        <h2>Loading Recipes...</h2>

                        <p>Fetching recipes from the database.</p>

                    </div>

                ) : filteredRecipes.length === 0 ? (

                    <div className="no-featured-recipes">

                        <h2>No Recipes Found</h2>

                        <p>Try another search or filter.</p>

                    </div>

                ) : (

                    filteredRecipes.map((recipe) => (

                        <article
                            className="featured-recipe-card"
                            key={`${recipe.source}-${recipe.id}`}
                        >

                            <div className="featured-card-image">

                                {recipe.image ? (

                                    <img
                                        src={recipe.image}
                                        alt={recipe.name}
                                        loading="lazy"
                                    />

                                ) : (

                                    <div className="featured-image-placeholder">
                                        No image available
                                    </div>

                                )}

                                <span
                                    className={
                                        recipe.featured
                                            ? 'featured-image-badge active'
                                            : 'featured-image-badge inactive'
                                    }
                                >

                                    {recipe.featured
                                        ? 'Featured'
                                        : 'Not Featured'}

                                </span>

                            </div>

                            <div className="featured-recipe-info">

                                <span className="featured-category">
                                    {recipe.category}
                                </span>

                                <h2>{recipe.name}</h2>

                                <p>{recipe.description}</p>

                                <div className="featured-card-footer">

                                    <button
                                        type="button"
                                        className={
                                            recipe.featured
                                                ? 'remove-featured-btn'
                                                : 'make-featured-btn'
                                        }
                                        onClick={() => toggleFeatured(recipe)}
                                        disabled={
                                            updatingRecipe === recipe.id
                                        }
                                    >

                                        {updatingRecipe === recipe.id
                                            ? 'Updating...'
                                            : recipe.featured
                                                ? 'Remove from Featured'
                                                : 'Make Featured'}

                                    </button>

                                </div>

                            </div>

                        </article>

                    ))

                )}

            </section>

            {/* Bottom Decoration */}
            <div className="featured-bottom">

                <span>
                    Made with passion for food lovers
                </span>

            </div>

        </div>
    );
}

export default FeaturedRecipes;
