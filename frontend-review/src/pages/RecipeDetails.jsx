
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { recipes } from '../data/recipes';
import ReviewSection from '../components/ReviewSection';
import { apiRequest } from '../api';
import './RecipeDetails.css';

function RecipeDetails() {
    const { id } = useParams();

    // Find static or locally submitted recipes.
    const localRecipe = useMemo(() => {
        if (id?.startsWith('db-') || id?.startsWith('database-')) {
            return null;
        }

        if (id?.startsWith('submitted-')) {
            try {
                const savedRecipes = JSON.parse(
                    localStorage.getItem('moderatorRecipes') || '[]'
                );

                if (!Array.isArray(savedRecipes)) return null;

                const submittedId = id.replace('submitted-', '');

                return savedRecipes.find(
                    item =>
                        String(item.id) === submittedId &&
                        item.status === 'Approved'
                ) || null;
            } catch (error) {
                console.error('Unable to load submitted recipe:', error);
                return null;
            }
        }

        return recipes.find(
            item => String(item.id) === String(id)
        ) || null;
    }, [id]);

    const [recipe, setRecipe] = useState(localRecipe);
    const [recipeLoading, setRecipeLoading] = useState(false);
    const [isDatabaseRecipe, setIsDatabaseRecipe] = useState(false);

    // Load database recipes while preserving static recipes.
    useEffect(() => {
        let active = true;

        setRecipe(localRecipe);
        setIsDatabaseRecipe(false);

        if (localRecipe || !id || id.startsWith('submitted-')) {
            setRecipeLoading(false);
            return () => {
                active = false;
            };
        }

        async function loadDatabaseRecipe() {
            setRecipeLoading(true);

            try {
                const databaseId = id.startsWith('database-')
                    ? id.slice('database-'.length)
                    : id.startsWith('db-')
                        ? id.slice('db-'.length)
                        : id;

                // Fetch recipe from FastAPI.
                const data = await apiRequest(`/recipes/${databaseId}`);

                if (!active) return;

                const apiBaseUrl =
                    import.meta.env.VITE_API_BASE_URL ||
                    'http://127.0.0.1:8000';

                let image = data.image_url || '🍲';

                if (
                    typeof image === 'string' &&
                    image.startsWith('/uploads/')
                ) {
                    image = `${apiBaseUrl}${image}`;
                }

                // Convert backend response into the existing UI format.
                const normalizedRecipe = {
                    ...data,

                    id: data.id,
                    name: data.title || 'Untitled Recipe',
                    image,

                    preparationTime: data.prep_time_minutes ?? '',
                    prepTime: data.prep_time_minutes ?? '',

                    time: data.cook_time_minutes ?? '',
                    cookingTime: data.cook_time_minutes ?? '',

                    servings: data.servings || 1,

                    ingredients: Array.isArray(data.ingredients)
                        ? data.ingredients.map(item => ({
                            ...item,
                            name:
                                item.ingredient_name ||
                                item.name ||
                                '',
                            quantity: item.quantity ?? '',
                            unit: item.unit || ''
                        }))
                        : [],

                    instructions: Array.isArray(data.steps)
                        ? [...data.steps]
                            .sort(
                                (a, b) =>
                                    (a.step_number || 0) -
                                    (b.step_number || 0)
                            )
                            .map(
                                step =>
                                    step.instruction ||
                                    step.text ||
                                    ''
                            )
                            .filter(Boolean)
                        : [],

                    category:
                        data.category_name ||
                        data.category?.name ||
                        'Recipe',

                    cuisine: data.cuisine || 'Home cooking',

                    difficulty:
                        data.difficulty || 'Not specified',

                    dietaryTags: Array.isArray(data.dietary_tags)
                        ? data.dietary_tags
                        : [],

                    allergens: Array.isArray(data.allergens)
                        ? data.allergens
                        : []
                };

                setRecipe(normalizedRecipe);
                setIsDatabaseRecipe(true);

            } catch (error) {
                console.error(
                    'Unable to load database recipe:',
                    error
                );

                if (active) {
                    setRecipe(null);
                }
            } finally {
                if (active) {
                    setRecipeLoading(false);
                }
            }
        }

        loadDatabaseRecipe();

        return () => {
            active = false;
        };
    }, [id, localRecipe]);

    // Cooking progress storage.
    const progressKey = `cookingProgress_${id}`;

    const [servings, setServings] = useState(
        recipe?.servings || 2
    );

    const cookingTime = parseInt(
        recipe?.time || recipe?.cookingTime,
        10
    ) || 1;

    const totalSeconds = Math.max(1, cookingTime * 60);

    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [checkedIngredients, setCheckedIngredients] = useState({});
    const [completedSteps, setCompletedSteps] = useState({});
    const [progressLoadedFor, setProgressLoadedFor] = useState(null);
    const [imageError, setImageError] = useState(false);
    const [progressError, setProgressError] = useState('');

    const ingredients = Array.isArray(recipe?.ingredients)
        ? recipe.ingredients
        : [];

    const instructions = Array.isArray(recipe?.instructions)
        ? recipe.instructions.map(step =>
            typeof step === 'string'
                ? step
                : step?.instruction || step?.text || ''
        ).filter(Boolean)
        : [];

    const dietaryTags = Array.isArray(recipe?.dietaryTags)
        ? recipe.dietaryTags
        : [];

    const allergens = Array.isArray(recipe?.allergens)
        ? recipe.allergens
        : [];

    function formatDuration(value) {
        if (
            value === undefined ||
            value === null ||
            value === ''
        ) {
            return 'Not specified';
        }

        const time = String(value).trim();

        if (/minutes?|mins?/i.test(time)) {
            return time;
        }

        return `${time} minutes`;
    }

    // Load saved cooking progress.
    useEffect(() => {
        if (!recipe) return;

        setIsRunning(false);
        setImageError(false);
        setProgressError('');

        try {
            const savedProgress = localStorage.getItem(progressKey);

            if (savedProgress) {
                const progressData = JSON.parse(savedProgress);

                if (
                    !progressData ||
                    typeof progressData !== 'object' ||
                    Array.isArray(progressData)
                ) {
                    throw new Error('Invalid saved progress data');
                }

                setCheckedIngredients(
                    progressData.checkedIngredients &&
                    typeof progressData.checkedIngredients === 'object'
                        ? progressData.checkedIngredients
                        : {}
                );

                setCompletedSteps(
                    progressData.completedSteps &&
                    typeof progressData.completedSteps === 'object'
                        ? progressData.completedSteps
                        : {}
                );

                const savedTime = Number(
                    progressData.elapsedSeconds
                );

                setElapsedSeconds(
                    Number.isFinite(savedTime)
                        ? Math.max(
                            0,
                            Math.min(savedTime, totalSeconds)
                        )
                        : 0
                );

                const savedServings = Number(
                    progressData.servings
                );

                setServings(
                    Number.isFinite(savedServings) &&
                    savedServings >= 1
                        ? savedServings
                        : recipe.servings || 2
                );

            } else {
                setCheckedIngredients({});
                setCompletedSteps({});
                setElapsedSeconds(0);
                setServings(recipe.servings || 2);
            }

        } catch (error) {
            console.error(
                'Unable to load saved progress:',
                error
            );

            setCheckedIngredients({});
            setCompletedSteps({});
            setElapsedSeconds(0);
            setServings(recipe.servings || 2);

            setProgressError(
                'Saved cooking progress could not be loaded. You can start again.'
            );
        }

        setProgressLoadedFor(id);

    }, [id, progressKey, recipe, totalSeconds]);

    // Save cooking progress.
    useEffect(() => {
        if (!recipe || progressLoadedFor !== id) return;

        const progressData = {
            checkedIngredients,
            completedSteps,
            elapsedSeconds,
            servings
        };

        try {
            localStorage.setItem(
                progressKey,
                JSON.stringify(progressData)
            );

            setProgressError('');

        } catch (error) {
            console.error(
                'Unable to save cooking progress:',
                error
            );

            setProgressError(
                'Unable to save your cooking progress. Please check browser storage.'
            );
        }

    }, [
        id,
        progressKey,
        recipe,
        progressLoadedFor,
        checkedIngredients,
        completedSteps,
        elapsedSeconds,
        servings
    ]);

    // Cooking timer.
    useEffect(() => {
        if (!isRunning) return;

        const timer = setInterval(() => {
            setElapsedSeconds(previous =>
                Math.min(previous + 1, totalSeconds)
            );
        }, 1000);

        return () => clearInterval(timer);

    }, [isRunning, totalSeconds]);

    useEffect(() => {
        if (elapsedSeconds >= totalSeconds) {
            setIsRunning(false);
        }
    }, [elapsedSeconds, totalSeconds]);

    if (recipeLoading) {
        return (
            <div className="rd-message">
                <span>👩‍🍳</span>
                <h2>Loading recipe...</h2>
                <p>Please wait while the recipe details are loaded.</p>
            </div>
        );
    }

    if (!recipe) {
        return (
            <div className="rd-message">
                <span>🍽️</span>
                <h2>Recipe Not Found</h2>
                <p>This recipe does not exist or is not available.</p>

                <Link to="/recipes" className="rd-primary-link">
                    Explore Recipes
                </Link>
            </div>
        );
    }

    if (progressLoadedFor !== id) {
        return (
            <div className="rd-message">
                <span>👩‍🍳</span>
                <h2>Preparing your kitchen...</h2>
                <p>Please wait while your cooking progress is loaded.</p>
            </div>
        );
    }

    // Adjust ingredient quantities based on servings.
    function calculateQuantity(quantity) {
        if (
            quantity === undefined ||
            quantity === null ||
            quantity === ''
        ) {
            return '';
        }

        const originalServings = Number(recipe.servings) || 1;

        const result =
            Number(quantity) * servings / originalServings;

        if (Number.isNaN(result)) {
            return quantity;
        }

        return Number(result.toFixed(2));
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        return `${String(minutes).padStart(2, '0')}:${String(
            remainingSeconds
        ).padStart(2, '0')}`;
    }

    const progress = Math.round(
        (elapsedSeconds / totalSeconds) * 100
    );

    function resetTimer() {
        setIsRunning(false);
        setElapsedSeconds(0);
    }

    function printRecipe() {
        window.print();
    }

    function downloadRecipePDF() {
        window.print();
    }

    async function copyRecipeLink() {
        try {
            await navigator.clipboard.writeText(
                window.location.href
            );

            alert('Recipe link copied successfully!');

        } catch {
            alert(
                'Unable to copy the link. Copy it from the browser address bar.'
            );
        }
    }

    function shareOnWhatsApp() {
        const message =
            `Check out this delicious recipe: ${recipe.name} ${window.location.href}`;

        window.open(
            `https://wa.me/?text=${encodeURIComponent(message)}`,
            '_blank',
            'noopener,noreferrer'
        );
    }

    function shareOnFacebook() {
        window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
            '_blank',
            'noopener,noreferrer'
        );
    }

    function shareByEmail() {
        const subject = `Try this recipe: ${recipe.name}`;

        const body =
            `Hello! Check out this delicious recipe: ${recipe.name}\n\n${window.location.href}`;

        const gmailUrl =
            `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        window.open(
            gmailUrl,
            '_blank',
            'noopener,noreferrer'
        );
    }

    // Ingredient checklist.
    function toggleIngredient(index) {
        setCheckedIngredients(previous => ({
            ...previous,
            [index]: !previous[index]
        }));
    }

    function resetIngredientChecklist() {
        setCheckedIngredients({});
    }

    const completedIngredients = Object.values(
        checkedIngredients
    ).filter(Boolean).length;

    const totalIngredients = ingredients.length;

    const ingredientProgress = totalIngredients > 0
        ? Math.round(
            (completedIngredients / totalIngredients) * 100
        )
        : 0;

    // Cooking steps checklist.
    function toggleStep(index) {
        setCompletedSteps(previous => ({
            ...previous,
            [index]: !previous[index]
        }));
    }

    function resetStepsChecklist() {
        setCompletedSteps({});
    }

    const completedStepsCount = Object.values(
        completedSteps
    ).filter(Boolean).length;

    const totalSteps = instructions.length;

    const stepsProgress = totalSteps > 0
        ? Math.round(
            (completedStepsCount / totalSteps) * 100
        )
        : 0;

    function clearSavedProgress() {
        try {
            localStorage.removeItem(progressKey);

            setCheckedIngredients({});
            setCompletedSteps({});
            setElapsedSeconds(0);
            setIsRunning(false);
            setServings(recipe.servings || 2);
            setProgressError('');

        } catch (error) {
            console.error(
                'Unable to clear saved progress:',
                error
            );

            setProgressError(
                'Unable to clear saved progress. Please try again.'
            );
        }
    }

    const totalTasks = totalIngredients + totalSteps;

    const completedTasks =
        completedIngredients + completedStepsCount;

    const overallProgress = totalTasks > 0
        ? Math.round(
            (completedTasks / totalTasks) * 100
        )
        : 0;

    const isRecipeCompleted =
        totalTasks > 0 && overallProgress === 100;

    const hasRecipeImage =
        typeof recipe.image === 'string' &&
        (
            recipe.image.startsWith('data:image/') ||
            recipe.image.startsWith('http://') ||
            recipe.image.startsWith('https://')
        );

    return (
        <main className="rd-page">
            <div className="rd-container">

                <div className="rd-breadcrumb no-print">
                    <Link to="/">Home</Link>
                    <span>/</span>
                    <Link to="/recipes">Explore Recipes</Link>
                    <span>/</span>
                    <span>{recipe.name}</span>
                </div>

                {/* Recipe hero */}
                <section className="rd-hero">
                    <div className="rd-hero-image">
                        {hasRecipeImage && !imageError ? (
                            <img
                                src={recipe.image}
                                alt={recipe.name || 'Recipe'}
                                onError={() => setImageError(true)}
                            />
                        ) : (
                            <div className="rd-image-placeholder">
                                {hasRecipeImage
                                    ? '🍲'
                                    : recipe.image || '🍲'}
                            </div>
                        )}

                        <span className="rd-image-label">
                            MADE WITH LOVE
                        </span>
                    </div>

                    <div className="rd-hero-content">
                        <span className="rd-eyebrow">
                            <span></span> YOUR NEXT KITCHEN FAVOURITE
                        </span>

                        <h1>{recipe.name || 'Untitled Recipe'}</h1>

                        <p className="rd-description">
                            {recipe.description ||
                                'A delicious recipe waiting to be prepared and enjoyed.'}
                        </p>

                        <div className="rd-meta-grid">
                            <div className="rd-meta-item">
                                <span className="rd-meta-icon">⏱</span>

                                <div>
                                    <small>Preparation</small>
                                    <strong>
                                        {formatDuration(
                                            recipe.preparationTime ||
                                            recipe.prepTime
                                        )}
                                    </strong>
                                </div>
                            </div>

                            <div className="rd-meta-item">
                                <span className="rd-meta-icon">🍳</span>

                                <div>
                                    <small>Cooking time</small>
                                    <strong>
                                        {formatDuration(
                                            recipe.time ||
                                            recipe.cookingTime
                                        )}
                                    </strong>
                                </div>
                            </div>

                            <div className="rd-meta-item">
                                <span className="rd-meta-icon">📊</span>

                                <div>
                                    <small>Difficulty</small>
                                    <strong>
                                        {recipe.difficulty || 'Not specified'}
                                    </strong>
                                </div>
                            </div>
                        </div>

                        <div className="rd-tags">
                            <span>{recipe.category || 'Recipe'}</span>
                            <span>{recipe.cuisine || 'Home cooking'}</span>
                        </div>

                        <div className="rd-hero-actions no-print">
                            <button onClick={printRecipe}>
                                <span>🖨</span> Print Recipe
                            </button>

                            <button
                                className="rd-outline-button"
                                onClick={copyRecipeLink}
                            >
                                <span>🔗</span> Copy Recipe Link
                            </button>
                        </div>
                    </div>
                </section>

                {/* Quick overview */}
                <section className="rd-overview">
                    <div>
                        <span>🥕</span>
                        <p>
                            <strong>{totalIngredients}</strong>
                            <small>Ingredients</small>
                        </p>
                    </div>

                    <div>
                        <span>👩‍🍳</span>
                        <p>
                            <strong>{totalSteps}</strong>
                            <small>Cooking steps</small>
                        </p>
                    </div>

                    <div>
                        <span>🍽️</span>
                        <p>
                            <strong>{servings}</strong>
                            <small>Servings</small>
                        </p>
                    </div>

                    <div>
                        <span>⏰</span>
                        <p>
                            <strong>
                                {formatDuration(
                                    recipe.time || recipe.cookingTime
                                )}
                            </strong>
                            <small>Cooking time</small>
                        </p>
                    </div>
                </section>

                {/* Main recipe layout */}
                <div className="rd-content-grid">
                    <div className="rd-main-column">

                        {/* Ingredients */}
                        <section className="rd-card rd-ingredients-section">
                            <div className="rd-section-heading">
                                <div>
                                    <span className="rd-section-kicker">
                                        GET EVERYTHING READY
                                    </span>

                                    <h2>🥕 Ingredients</h2>

                                    <p>
                                        Check off each ingredient as you prepare it.
                                    </p>
                                </div>

                                <span className="rd-count-badge">
                                    {completedIngredients}/{totalIngredients}
                                </span>
                            </div>

                            <div className="rd-servings-control">
                                <span>Adjust servings</span>

                                <div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setServings(previous =>
                                                Math.max(1, previous - 1)
                                            )
                                        }
                                        disabled={servings <= 1}
                                        aria-label="Decrease servings"
                                    >
                                        −
                                    </button>

                                    <strong>{servings}</strong>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setServings(previous => previous + 1)
                                        }
                                        aria-label="Increase servings"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <div className="rd-progress-label">
                                <span>Ingredient preparation</span>
                                <strong>{ingredientProgress}%</strong>
                            </div>

                            <div className="rd-progress-track">
                                <div
                                    className="rd-progress-fill"
                                    style={{
                                        width: `${ingredientProgress}%`
                                    }}
                                />
                            </div>

                            {totalIngredients > 0 ? (
                                <ul className="rd-ingredient-list">
                                    {ingredients.map((ingredient, index) => {
                                        const ingredientName =
                                            typeof ingredient === 'string'
                                                ? ingredient
                                                : ingredient?.name ||
                                                  'Unnamed ingredient';

                                        const quantity =
                                            typeof ingredient === 'string'
                                                ? ''
                                                : calculateQuantity(
                                                    ingredient?.quantity
                                                );

                                        const unit =
                                            typeof ingredient === 'string'
                                                ? ''
                                                : ingredient?.unit || '';

                                        return (
                                            <li
                                                key={index}
                                                className={
                                                    checkedIngredients[index]
                                                        ? 'rd-item-done'
                                                        : ''
                                                }
                                            >
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            !!checkedIngredients[index]
                                                        }
                                                        onChange={() =>
                                                            toggleIngredient(index)
                                                        }
                                                    />

                                                    <span className="rd-custom-check"></span>

                                                    <span className="rd-ingredient-name">
                                                        {ingredientName}
                                                    </span>
                                                </label>

                                                <strong>
                                                    {[quantity, unit]
                                                        .filter(Boolean)
                                                        .join(' ')}
                                                </strong>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <p className="rd-empty">
                                    No ingredients have been added yet.
                                </p>
                            )}

                            <div className="rd-card-footer no-print">
                                <span>
                                    {ingredientProgress === 100
                                        ? '🎉 All ingredients are ready!'
                                        : 'Take your time and prepare everything.'}
                                </span>

                                <button onClick={resetIngredientChecklist}>
                                    Reset checklist
                                </button>
                            </div>
                        </section>

                        {/* Instructions */}
                        <section className="rd-card rd-instructions-section">
                            <div className="rd-section-heading">
                                <div>
                                    <span className="rd-section-kicker">
                                        LET'S START COOKING
                                    </span>

                                    <h2>👩‍🍳 Cooking Instructions</h2>

                                    <p>
                                        Follow each step and mark it as completed.
                                    </p>
                                </div>

                                <span className="rd-count-badge">
                                    {completedStepsCount}/{totalSteps}
                                </span>
                            </div>

                            <div className="rd-progress-label">
                                <span>Cooking progress</span>
                                <strong>{stepsProgress}%</strong>
                            </div>

                            <div className="rd-progress-track">
                                <div
                                    className="rd-progress-fill"
                                    style={{
                                        width: `${stepsProgress}%`
                                    }}
                                />
                            </div>

                            {totalSteps > 0 ? (
                                <ol className="rd-step-list">
                                    {instructions.map((step, index) => (
                                        <li
                                            key={index}
                                            className={
                                                completedSteps[index]
                                                    ? 'rd-step-done'
                                                    : ''
                                            }
                                        >
                                            <div className="rd-step-number">
                                                {completedSteps[index]
                                                    ? '✓'
                                                    : index + 1}
                                            </div>

                                            <div className="rd-step-content">
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            !!completedSteps[index]
                                                        }
                                                        onChange={() =>
                                                            toggleStep(index)
                                                        }
                                                    />

                                                    <span>
                                                        {completedSteps[index]
                                                            ? 'Completed'
                                                            : `Step ${index + 1}`}
                                                    </span>
                                                </label>

                                                <p>{step}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            ) : (
                                <p className="rd-empty">
                                    No cooking instructions have been added yet.
                                </p>
                            )}

                            <div className="rd-card-footer no-print">
                                <span>
                                    {stepsProgress === 100
                                        ? '🎉 You completed every cooking step!'
                                        : 'One step at a time. You are doing great!'}
                                </span>

                                <button onClick={resetStepsChecklist}>
                                    Reset steps
                                </button>
                            </div>
                        </section>

                        {/* Dietary details */}
                        <section className="rd-card rd-dietary-section">
                            <span className="rd-section-kicker">
                                KNOW WHAT'S ON YOUR PLATE
                            </span>

                            <h2>🥗 Dietary Information</h2>

                            <div className="rd-dietary-columns">
                                <div>
                                    <h3>Dietary tags</h3>

                                    {dietaryTags.length > 0 ? (
                                        <div className="rd-tag-list">
                                            {dietaryTags.map((tag, index) => (
                                                <span key={`${tag}-${index}`}>
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="rd-empty">
                                            No dietary tags added.
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <h3>⚠️ Allergens</h3>

                                    {allergens.length > 0 ? (
                                        <div className="rd-tag-list rd-allergen-list">
                                            {allergens.map((allergen, index) => (
                                                <span key={`${allergen}-${index}`}>
                                                    ⚠️ {allergen}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="rd-empty">
                                            No allergen details added.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <p className="rd-disclaimer">
                                Please check all ingredients and product labels carefully
                                if you have food allergies.
                            </p>
                        </section>
                    </div>

                    {/* Sidebar */}
                    <aside className="rd-sidebar">

                        {/* Timer */}
                        <section className="rd-card rd-timer-card no-print">
                            <span className="rd-section-kicker">
                                YOUR KITCHEN TIMER
                            </span>

                            <h2>⏱ Cooking Timer</h2>

                            <p className="rd-timer-caption">
                                Estimated time: {formatDuration(
                                    recipe.time || recipe.cookingTime
                                )}
                            </p>

                            <div className="rd-timer-circle">
                                <div>
                                    <strong>
                                        {formatTime(elapsedSeconds)}
                                    </strong>

                                    <span>{progress}% completed</span>
                                </div>
                            </div>

                            <div className="rd-progress-track rd-timer-track">
                                <div
                                    className="rd-progress-fill"
                                    style={{
                                        width: `${progress}%`
                                    }}
                                />
                            </div>

                            {progress === 100 && (
                                <p className="rd-timer-complete">
                                    🎉 Cooking time completed!
                                </p>
                            )}

                            <div className="rd-timer-buttons">
                                <button
                                    className="rd-timer-start"
                                    onClick={() => setIsRunning(true)}
                                    disabled={isRunning || progress === 100}
                                >
                                    {progress === 100
                                        ? 'Completed'
                                        : '▶ Start'}
                                </button>

                                <button
                                    onClick={() => setIsRunning(false)}
                                    disabled={!isRunning}
                                >
                                    Pause
                                </button>

                                <button onClick={resetTimer}>
                                    Reset
                                </button>
                            </div>
                        </section>

                        {/* Overall summary */}
                        <section className="rd-card rd-summary-card">
                            <span className="rd-section-kicker">
                                YOUR COOKING JOURNEY
                            </span>

                            <h2>🏆 Progress Summary</h2>

                            <div className="rd-summary-number">
                                <strong>{overallProgress}%</strong>
                                <span>Overall completed</span>
                            </div>

                            <div className="rd-progress-track">
                                <div
                                    className="rd-progress-fill"
                                    style={{
                                        width: `${overallProgress}%`
                                    }}
                                />
                            </div>

                            <div className="rd-summary-row">
                                <span>🥕 Ingredients</span>
                                <strong>
                                    {completedIngredients}/{totalIngredients}
                                </strong>
                            </div>

                            <div className="rd-summary-row">
                                <span>👩‍🍳 Cooking steps</span>
                                <strong>
                                    {completedStepsCount}/{totalSteps}
                                </strong>
                            </div>

                            {isRecipeCompleted ? (
                                <div className="rd-achievement">
                                    <span>🏆</span>
                                    <h3>Master Chef!</h3>
                                    <p>
                                        You completed this recipe. Congratulations!
                                    </p>
                                    <small>RECIPE COMPLETED</small>
                                </div>
                            ) : (
                                <div className="rd-pending">
                                    <strong>
                                        {totalTasks - completedTasks} tasks remaining
                                    </strong>

                                    <p>
                                        Keep going! Your delicious result is waiting.
                                    </p>
                                </div>
                            )}

                            <button
                                className="rd-clear-progress no-print"
                                onClick={clearSavedProgress}
                            >
                                Clear all saved progress
                            </button>
                        </section>

                        {/* Share */}
                        <section className="rd-card rd-share-card no-print">
                            <span className="rd-section-kicker">
                                SPREAD THE DELICIOUSNESS
                            </span>

                            <h2>📤 Share Recipe</h2>

                            <p>
                                Share this recipe with friends and family.
                            </p>

                            <button onClick={copyRecipeLink}>
                                🔗 Copy Link
                            </button>

                            <button onClick={shareOnWhatsApp}>
                                💬 WhatsApp
                            </button>

                            <button onClick={shareOnFacebook}>
                                📘 Facebook
                            </button>

                            <button onClick={shareByEmail}>
                                ✉️ Email
                            </button>

                            <button onClick={downloadRecipePDF}>
                                📥 Save as PDF
                            </button>
                        </section>
                    </aside>
                </div>

                {progressError && (
                    <p className="rd-error no-print" role="alert">
                        {progressError}
                    </p>
                )}

                <div className="rd-back-link no-print">
                    <Link to="/recipes">
                        ← Back to Explore Recipes
                    </Link>
                </div>

                <section className="rd-reviews no-print">
                    <div className="rd-reviews-heading">
                        <span className="rd-section-kicker">
                            YOUR THOUGHTS MATTER
                        </span>

                        <h2>💬 Recipe Reviews</h2>

                        <p>
                            Share your experience and see what others think.
                        </p>
                    </div>

                    <ReviewSection
                        key={`${isDatabaseRecipe ? 'database' : 'static'}-${recipe.id}`}
                        recipeId={recipe.id}
                        recipeName={recipe.name}
                        isDatabaseRecipe={isDatabaseRecipe}
                    />
                </section>
            </div>
        </main>
    );
}

export default RecipeDetails;
