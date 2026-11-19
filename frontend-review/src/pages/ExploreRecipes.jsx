
import { useEffect, useMemo, useState } from 'react';
import { recipes as staticRecipes } from '../data/recipes';
import RecipeCard from '../components/RecipeCard';
import {
    getRecipes,
    getCategories,
    getTags,
    getRecipeTags
} from '../services/portalApi';
import './ExploreRecipes.css';

function getMinutes(value) {
    if (value === undefined || value === null || value === '') {
        return NaN;
    }

    const match = String(value).match(/\d+/);
    return match ? Number(match[0]) : NaN;
}

function normalizeTagNames(response) {
    if (!Array.isArray(response)) return [];

    return response
        .map(tag => {
            if (typeof tag === 'string') return tag;
            return tag?.name || '';
        })
        .filter(Boolean);
}

// Convert backend recipe response into the existing RecipeCard format.
function normalizeDatabaseRecipe(recipe, categoryMap, dietaryTags = []) {
    const ingredients = Array.isArray(recipe.ingredients)
        ? recipe.ingredients.map(item => ({
            name: item.ingredient_name || '',
            quantity: item.quantity || '',
            unit: item.unit || ''
        }))
        : [];

    const instructions = Array.isArray(recipe.steps)
        ? [...recipe.steps]
            .sort((a, b) => a.step_number - b.step_number)
            .map(step => step.instruction)
        : [];

    return {
        id: Number(recipe.id),
        databaseId: Number(recipe.id),
        routeId: `db-${recipe.id}`,
        source: 'database',

        name: recipe.title,
        category:
            categoryMap.get(Number(recipe.category_id)) ||
            'Other',

        cuisine: '',
        description: recipe.description || '',

        image: recipe.image_url || '🍲',

        time: recipe.cook_time_minutes ?? '',
        cookingTime: recipe.cook_time_minutes ?? '',
        preparationTime: recipe.prep_time_minutes ?? '',

        difficulty: recipe.difficulty
            ? recipe.difficulty.charAt(0).toUpperCase() +
              recipe.difficulty.slice(1)
            : 'Not specified',

        servings: recipe.servings || 1,
        ingredients,
        instructions,

        dietaryTags,
        author: `User ${recipe.author_id}`,

        status: recipe.status
    };
}

function ExploreRecipes() {
    const [databaseRecipes, setDatabaseRecipes] = useState([]);
    const [databaseLoading, setDatabaseLoading] = useState(true);
    const [databaseError, setDatabaseError] = useState('');

    const [databaseTags, setDatabaseTags] = useState([]);
    const [tagsLoading, setTagsLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedCuisine, setSelectedCuisine] = useState('All');
    const [selectedDifficulty, setSelectedDifficulty] = useState('All');
    const [selectedDiet, setSelectedDiet] = useState('All');
    const [selectedServings, setSelectedServings] = useState('All');
    const [selectedTime, setSelectedTime] = useState('All');
    const [selectedPreparationTime, setSelectedPreparationTime] = useState('All');
    const [sortOption, setSortOption] = useState('default');

    const [paginationState, setPaginationState] = useState({
        page: 1,
        filterKey: ''
    });

    const recipesPerPage = 6;

    // ==========================================
    // FETCH DATABASE RECIPES, CATEGORIES AND TAGS
    // ==========================================

    useEffect(() => {
        let isMounted = true;

        async function loadDatabaseData() {
            setDatabaseLoading(true);
            setTagsLoading(true);
            setDatabaseError('');

            try {
                const [
                    recipeResponse,
                    categoryResponse,
                    tagResponse
                ] = await Promise.all([
                    getRecipes({
                        page: 1,
                        page_size: 100,
                        sort_by: 'created_at',
                        order: 'desc'
                    }),
                    getCategories(),
                    getTags()
                ]);

                if (!isMounted) return;

                const categories = Array.isArray(categoryResponse)
                    ? categoryResponse
                    : [];

                const categoryMap = new Map(
                    categories.map(category => [
                        Number(category.id),
                        category.name
                    ])
                );

                const tags = normalizeTagNames(tagResponse);

                setDatabaseTags(tags);
                setTagsLoading(false);

                const backendItems = Array.isArray(recipeResponse?.items)
                    ? recipeResponse.items
                    : [];

                const publishedRecipes = backendItems.filter(
                    recipe => recipe.status === 'published'
                );

                // Load the tags assigned to each published recipe.
                const normalizedRecipes = await Promise.all(
                    publishedRecipes.map(async recipe => {
                        let recipeTags = [];

                        try {
                            const tagResponse = await getRecipeTags(recipe.id);
                            recipeTags = normalizeTagNames(tagResponse);
                        } catch (error) {
                            console.error(
                                `Unable to load tags for recipe ${recipe.id}:`,
                                error
                            );
                        }

                        return normalizeDatabaseRecipe(
                            recipe,
                            categoryMap,
                            recipeTags
                        );
                    })
                );

                if (!isMounted) return;

                setDatabaseRecipes(normalizedRecipes);
            } catch (error) {
                if (isMounted) {
                    console.error(
                        'Unable to load database recipes:',
                        error
                    );

                    setDatabaseError(
                        error.message ||
                        'Unable to load recipes from the backend.'
                    );
                }
            } finally {
                if (isMounted) {
                    setDatabaseLoading(false);
                    setTagsLoading(false);
                }
            }
        }

        loadDatabaseData();

        return () => {
            isMounted = false;
        };
    }, []);

    // ==========================================
    // COMBINE STATIC + DATABASE RECIPES
    // ==========================================

    const allRecipes = useMemo(() => {
        const existingStaticRecipes = staticRecipes.map(recipe => ({
            ...recipe,
            source: 'static'
        }));

        return [
            ...existingStaticRecipes,
            ...databaseRecipes
        ];
    }, [databaseRecipes]);

    // ==========================================
    // DYNAMIC FILTER OPTIONS
    // ==========================================

    const categories = [
        'All',
        ...new Set(
            allRecipes
                .map(recipe => recipe.category)
                .filter(Boolean)
        )
    ];

    const cuisines = [
        'All',
        ...new Set(
            allRecipes
                .map(recipe => recipe.cuisine)
                .filter(Boolean)
        )
    ];

    const difficulties = [
        'All',
        ...new Set(
            allRecipes
                .map(recipe => recipe.difficulty)
                .filter(Boolean)
        )
    ];

    // Load dropdown options directly from the database tags API.
    // Also retain dietary tags already present in static recipes.
    const dietaryOptions = [
        'All',
        ...new Set([
            ...databaseTags,
            ...allRecipes.flatMap(recipe =>
                Array.isArray(recipe.dietaryTags)
                    ? recipe.dietaryTags
                    : []
            )
        ])
    ];

    const servingsOptions = [
        'All',
        ...new Set(
            allRecipes
                .map(recipe => Number(recipe.servings))
                .filter(servings => servings > 0)
        )
    ];

    // ==========================================
    // SEARCH AND FILTER
    // ==========================================

    const filteredRecipes = allRecipes.filter(recipe => {
        const search = searchTerm.toLowerCase().trim();

        const ingredientNames = Array.isArray(recipe.ingredients)
            ? recipe.ingredients.map(ingredient =>
                typeof ingredient === 'string'
                    ? ingredient
                    : ingredient.name || ingredient.ingredient_name || ''
            ).join(' ')
            : '';

        const dietaryTags = Array.isArray(recipe.dietaryTags)
            ? recipe.dietaryTags
            : [];

        const searchableText = [
            recipe.name,
            recipe.category,
            recipe.cuisine,
            recipe.description,
            ingredientNames,
            recipe.author,
            dietaryTags.join(' ')
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        const matchesSearch = searchableText.includes(search);

        const matchesCategory =
            selectedCategory === 'All' ||
            recipe.category === selectedCategory;

        const matchesCuisine =
            selectedCuisine === 'All' ||
            recipe.cuisine === selectedCuisine;

        const matchesDifficulty =
            selectedDifficulty === 'All' ||
            recipe.difficulty === selectedDifficulty;

        const matchesDiet =
            selectedDiet === 'All' ||
            dietaryTags.some(
                tag =>
                    tag.toLowerCase() === selectedDiet.toLowerCase()
            );

        const matchesServings =
            selectedServings === 'All' ||
            Number(recipe.servings) === Number(selectedServings);

        const cookingTime = getMinutes(
            recipe.time || recipe.cookingTime
        );

        const matchesTime =
            selectedTime === 'All' ||
            (
                !Number.isNaN(cookingTime) &&
                cookingTime <= Number(selectedTime)
            );

        const preparationTime = getMinutes(
            recipe.preparationTime
        );

        const matchesPreparationTime =
            selectedPreparationTime === 'All' ||
            (
                !Number.isNaN(preparationTime) &&
                preparationTime <= Number(selectedPreparationTime)
            );

        return (
            matchesSearch &&
            matchesCategory &&
            matchesCuisine &&
            matchesDifficulty &&
            matchesDiet &&
            matchesServings &&
            matchesTime &&
            matchesPreparationTime
        );
    });

    // ==========================================
    // SORT RECIPES
    // ==========================================

    const sortedRecipes = [...filteredRecipes].sort((a, b) => {
        const timeA = getMinutes(a.time || a.cookingTime);
        const timeB = getMinutes(b.time || b.cookingTime);

        switch (sortOption) {
            case 'name-asc':
                return a.name.localeCompare(b.name);

            case 'name-desc':
                return b.name.localeCompare(a.name);

            case 'time-asc':
                return (
                    (Number.isNaN(timeA) ? Infinity : timeA) -
                    (Number.isNaN(timeB) ? Infinity : timeB)
                );

            case 'time-desc':
                return (
                    (Number.isNaN(timeB) ? -Infinity : timeB) -
                    (Number.isNaN(timeA) ? -Infinity : timeA)
                );

            default:
                return 0;
        }
    });

    // ==========================================
    // PAGINATION
    // ==========================================

    const filterKey = JSON.stringify([
        searchTerm,
        selectedCategory,
        selectedCuisine,
        selectedDifficulty,
        selectedDiet,
        selectedServings,
        selectedTime,
        selectedPreparationTime,
        sortOption
    ]);

    const totalPages = Math.ceil(
        sortedRecipes.length / recipesPerPage
    );

    const currentPage =
        paginationState.filterKey === filterKey
            ? Math.min(
                paginationState.page,
                Math.max(totalPages, 1)
            )
            : 1;

    const startIndex = (currentPage - 1) * recipesPerPage;

    const currentRecipes = sortedRecipes.slice(
        startIndex,
        startIndex + recipesPerPage
    );

    function changePage(page) {
        setPaginationState({
            page,
            filterKey
        });
    }

    // ==========================================
    // CLEAR FILTERS
    // ==========================================

    function clearFilters() {
        setSearchTerm('');
        setSelectedCategory('All');
        setSelectedCuisine('All');
        setSelectedDifficulty('All');
        setSelectedDiet('All');
        setSelectedServings('All');
        setSelectedTime('All');
        setSelectedPreparationTime('All');
        setSortOption('default');

        setPaginationState({
            page: 1,
            filterKey: ''
        });
    }

    // ==========================================
    // UI
    // ==========================================

    return (
        <main className="explore-page">

            {/* PAGE HERO */}

            <section className="explore-hero">

                <div className="explore-hero-content">

                    <span className="explore-eyebrow">
                        ✨ YOUR NEXT DELICIOUS DISCOVERY
                    </span>

                    <h1>
                        Find recipes<br />
                        <span>to fall in love with.</span>
                    </h1>

                    <p>
                        From comforting classics to exciting new flavours,
                        discover something delicious for every moment.
                    </p>

                    <div className="explore-hero-stats">

                        <div>
                            <strong>{allRecipes.length}+</strong>
                            <span>Delicious Recipes</span>
                        </div>

                        <div>
                            <strong>{categories.length - 1}</strong>
                            <span>Categories</span>
                        </div>

                        <div>
                            <strong>❤️</strong>
                            <span>Made with Love</span>
                        </div>

                    </div>

                </div>

                <div className="explore-hero-decoration">
                    <span>🍛</span>
                    <div>
                        <strong>Cook something wonderful</strong>
                        <small>Every great meal starts with an idea.</small>
                    </div>
                </div>

            </section>

            {/* SEARCH */}

            <section className="explore-search-section">

                <div className="explore-search-heading">

                    <div>
                        <span className="explore-section-tag">
                            LET'S FIND YOUR DISH
                        </span>

                        <h2>What are you craving today?</h2>
                    </div>

                    <span className="explore-search-count">
                        {allRecipes.length} recipes to explore
                    </span>

                </div>

                <div className="explore-search-box">

                    <span className="explore-search-symbol">⌕</span>

                    <input
                        type="search"
                        placeholder="Search by recipe, ingredient or cuisine..."
                        value={searchTerm}
                        onChange={event =>
                            setSearchTerm(event.target.value)
                        }
                        aria-label="Search recipes"
                    />

                    {searchTerm && (
                        <button
                            type="button"
                            className="explore-clear-search"
                            onClick={() => setSearchTerm('')}
                            aria-label="Clear search"
                        >
                            ✕
                        </button>
                    )}

                </div>

            </section>

            {/* FILTERS */}

            <section className="explore-filter-panel">

                <div className="explore-filter-heading">

                    <div>
                        <span className="explore-filter-icon">☷</span>

                        <div>
                            <h3>Find your perfect recipe</h3>
                            <p>
                                Refine your search using the filters below.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="explore-reset-btn"
                        onClick={clearFilters}
                    >
                        ↻ Clear all filters
                    </button>

                </div>

                <div className="explore-filter-grid">

                    <label>
                        <span>Category</span>

                        <select
                            value={selectedCategory}
                            onChange={event =>
                                setSelectedCategory(event.target.value)
                            }
                        >
                            {categories.map(item => (
                                <option key={item} value={item}>
                                    {item === 'All'
                                        ? 'All Categories'
                                        : item}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        <span>Cuisine</span>

                        <select
                            value={selectedCuisine}
                            onChange={event =>
                                setSelectedCuisine(event.target.value)
                            }
                        >
                            {cuisines.map(item => (
                                <option key={item} value={item}>
                                    {item === 'All'
                                        ? 'All Cuisines'
                                        : item}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        <span>Difficulty</span>

                        <select
                            value={selectedDifficulty}
                            onChange={event =>
                                setSelectedDifficulty(event.target.value)
                            }
                        >
                            {difficulties.map(item => (
                                <option key={item} value={item}>
                                    {item === 'All'
                                        ? 'All Levels'
                                        : item}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        <span>Dietary preference</span>

                        <select
                            value={selectedDiet}
                            onChange={event =>
                                setSelectedDiet(event.target.value)
                            }
                        >
                            {dietaryOptions.map(item => (
                                <option key={item} value={item}>
                                    {item === 'All'
                                        ? 'All Dietary Options'
                                        : item}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        <span>Servings</span>

                        <select
                            value={selectedServings}
                            onChange={event =>
                                setSelectedServings(event.target.value)
                            }
                        >
                            {servingsOptions.map(item => (
                                <option key={item} value={item}>
                                    {item === 'All'
                                        ? 'Any Servings'
                                        : `${item} Servings`}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        <span>Cooking time</span>

                        <select
                            value={selectedTime}
                            onChange={event =>
                                setSelectedTime(event.target.value)
                            }
                        >
                            <option value="All">Any Cooking Time</option>
                            <option value="15">Up to 15 minutes</option>
                            <option value="30">Up to 30 minutes</option>
                            <option value="45">Up to 45 minutes</option>
                            <option value="60">Up to 60 minutes</option>
                        </select>
                    </label>

                    <label>
                        <span>Preparation time</span>

                        <select
                            value={selectedPreparationTime}
                            onChange={event =>
                                setSelectedPreparationTime(event.target.value)
                            }
                        >
                            <option value="All">
                                Any Preparation Time
                            </option>
                            <option value="10">Up to 10 minutes</option>
                            <option value="15">Up to 15 minutes</option>
                            <option value="30">Up to 30 minutes</option>
                            <option value="45">Up to 45 minutes</option>
                        </select>
                    </label>

                    <label>
                        <span>Sort recipes</span>

                        <select
                            value={sortOption}
                            onChange={event =>
                                setSortOption(event.target.value)
                            }
                        >
                            <option value="default">Default Order</option>
                            <option value="name-asc">Name: A to Z</option>
                            <option value="name-desc">Name: Z to A</option>
                            <option value="time-asc">
                                Cooking Time: Low to High
                            </option>
                            <option value="time-desc">
                                Cooking Time: High to Low
                            </option>
                        </select>
                    </label>

                </div>

            </section>

            {/* RESULTS */}

            <section className="explore-results-section">

                <div className="explore-results-heading">

                    <div>
                        <span className="explore-section-tag">
                            FRESH FROM OUR KITCHEN
                        </span>

                        <h2>Explore delicious dishes</h2>

                        <p aria-live="polite">
                            Showing {sortedRecipes.length === 0
                                ? 0
                                : startIndex + 1}
                            {' – '}
                            {Math.min(
                                startIndex + recipesPerPage,
                                sortedRecipes.length
                            )}
                            {' '}of {sortedRecipes.length} matching recipes
                        </p>
                    </div>

                    <span className="explore-results-icon">🍽️</span>

                </div>

                {databaseLoading && (
                    <p className="explore-loading-message">
                        Loading community recipes...
                        Your existing recipes remain available.
                    </p>
                )}

                {tagsLoading && (
                    <p className="explore-loading-message">
                        Loading dietary preferences...
                    </p>
                )}

                {databaseError && (
                    <p className="explore-error-message" role="status">
                        Community recipes could not be loaded.
                        Your static recipes are still available.
                    </p>
                )}

                {sortedRecipes.length > 0 ? (

                    <>

                        <div className="explore-recipes-grid">

                            {currentRecipes.map(recipe => (

                                <RecipeCard
                                    key={`${recipe.source}-${recipe.id}`}
                                    recipe={recipe}
                                />

                            ))}

                        </div>

                        {totalPages > 1 && (

                            <div className="explore-pagination">

                                <button
                                    type="button"
                                    onClick={() =>
                                        changePage(currentPage - 1)
                                    }
                                    disabled={currentPage === 1}
                                >
                                    ← Previous
                                </button>

                                <div className="explore-page-numbers">

                                    {Array.from(
                                        { length: totalPages },
                                        (_, index) => index + 1
                                    ).map(page => (

                                        <button
                                            key={page}
                                            type="button"
                                            className={
                                                currentPage === page
                                                    ? 'active'
                                                    : ''
                                            }
                                            onClick={() => changePage(page)}
                                            aria-current={
                                                currentPage === page
                                                    ? 'page'
                                                    : undefined
                                            }
                                        >
                                            {page}
                                        </button>

                                    ))}

                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        changePage(currentPage + 1)
                                    }
                                    disabled={currentPage === totalPages}
                                >
                                    Next →
                                </button>

                            </div>

                        )}

                    </>

                ) : (

                    <div className="explore-empty-state">

                        <span>🥺</span>

                        <h2>No recipes found</h2>

                        <p>
                            We couldn't find a dish matching your search.
                            Try another keyword or clear your filters.
                        </p>

                        <button
                            type="button"
                            onClick={clearFilters}
                        >
                            Show all recipes →
                        </button>

                    </div>

                )}

            </section>

        </main>
    );
}

export default ExploreRecipes;
