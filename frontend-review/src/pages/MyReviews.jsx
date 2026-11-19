
import './MyReviews.css';
import { useState, useEffect } from 'react';
import { recipes } from '../data/recipes';

import {
    getMyReviews,
    updateReview as updateBackendReview,
    deleteReview as deleteBackendReview,
    updateRating,
    createRating,
    updateStaticRating,
    createStaticRating
} from '../services/portalApi';

const STORAGE_KEY = 'my-reviews-data';

const defaultReviews = [
    {
        id: 1,
        recipeName: 'Vegetable Biryani',
        rating: 5,
        comment: 'Very tasty and easy to prepare!'
    },
    {
        id: 2,
        recipeName: 'Chocolate Cake',
        rating: 4,
        comment: 'The cake was delicious. I really enjoyed it.'
    },
    {
        id: 3,
        recipeName: 'Masala Dosa',
        rating: 3,
        comment: 'Good recipe, but the instructions could be clearer.'
    }
];

function loadReviews() {
    try {
        const savedReviews = localStorage.getItem(STORAGE_KEY);

        if (savedReviews === null) return defaultReviews;

        const parsedReviews = JSON.parse(savedReviews);

        return Array.isArray(parsedReviews)
            ? parsedReviews.filter(
                review =>
                    review &&
                    typeof review === 'object' &&
                    review.id !== undefined
            )
            : defaultReviews;
    } catch (error) {
        console.error('Unable to load reviews:', error);
        return defaultReviews;
    }
}

// Find a static recipe using its ID or slug.
function findStaticRecipe(recipeId) {
    if (recipeId === undefined || recipeId === null) return null;

    return recipes.find(recipe =>
        [recipe.id, recipe.recipe_id, recipe.slug].some(
            value =>
                value !== undefined &&
                value !== null &&
                String(value) === String(recipeId)
        )
    );
}

// Convert backend response into the existing frontend format.
function normalizeBackendReview(review) {
    const isDatabaseRecipe =
        review.recipe_id !== null &&
        review.recipe_id !== undefined;

    const recipeId = isDatabaseRecipe
        ? review.recipe_id
        : review.static_recipe_id;

    const matchedRecipe = isDatabaseRecipe
        ? null
        : findStaticRecipe(review.static_recipe_id);

    return {
        id: `backend-${review.id}`,
        backendId: review.id,
        isBackendReview: true,
        isDatabaseRecipe,
        recipeId,
        staticRecipeId: review.static_recipe_id,
        recipeName:
            review.recipeName ||
            matchedRecipe?.name ||
            matchedRecipe?.title ||
            'Untitled Recipe',
        recipeImage: matchedRecipe?.image || '',
        rating: Number(review.rating) || 0,
        comment: review.comment || '',
        status: review.status,
        createdAt: review.created_at,
        reviewDate: review.created_at
    };
}

// Find the matching recipe image.
function getReviewImage(review) {
    const matchedRecipe =
        findStaticRecipe(review.staticRecipeId) ||
        recipes.find(
            recipe =>
                recipe.name?.trim().toLowerCase() ===
                String(review.recipeName || '').trim().toLowerCase()
        );

    return (
        review.recipeImage ||
        review.image ||
        review.imageUrl ||
        review.recipeImageUrl ||
        review.recipe?.image ||
        review.recipe?.imageUrl ||
        matchedRecipe?.image ||
        ''
    );
}

// Get review date.
function getReviewDate(review) {
    const date = review.reviewDate || review.createdAt || review.date;

    if (!date) return 'Date not available';

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return String(date);
    }

    return parsedDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

// Update original local demo recipe reviews.
function updateRecipeReview(review, action) {
    if (
        review.recipeId === undefined ||
        review.recipeId === null
    ) return;

    const recipeStorageKey = `recipe-reviews-${review.recipeId}`;

    try {
        const savedReviews = JSON.parse(
            localStorage.getItem(recipeStorageKey) || '[]'
        );

        if (!Array.isArray(savedReviews)) return;

        let updatedReviews;

        if (action === 'update') {
            updatedReviews = savedReviews.map(item =>
                String(item.id) === String(review.id)
                    ? {
                        ...item,
                        rating: review.rating,
                        comment: review.comment
                    }
                    : item
            );
        } else {
            updatedReviews = savedReviews.filter(
                item => String(item.id) !== String(review.id)
            );
        }

        localStorage.setItem(
            recipeStorageKey,
            JSON.stringify(updatedReviews)
        );
    } catch (error) {
        console.error('Unable to update recipe review:', error);
    }
}

function MyReviews() {
    const [reviews, setReviews] = useState(loadReviews);
    const [filter, setFilter] = useState('All');
    const [editingReview, setEditingReview] = useState(null);
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);

    // Load backend reviews and preserve local demo reviews.
    useEffect(() => {
        let active = true;

        async function loadBackendReviews() {
            try {
                const response = await getMyReviews();

                if (!active || !Array.isArray(response)) return;

                const backendReviews = response
                    .filter(review => review.status !== 'deleted')
                    .map(normalizeBackendReview);

                const localReviews = loadReviews().filter(
                    review => !review.isBackendReview
                );

                setReviews([
                    ...backendReviews,
                    ...localReviews
                ]);
            } catch (error) {
                console.error('Unable to load backend reviews:', error);
            }
        }

        loadBackendReviews();

        return () => {
            active = false;
        };
    }, []);

    // Save reviews locally while retaining demo content.
    useEffect(() => {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(reviews)
            );
        } catch (error) {
            console.error('Unable to save reviews:', error);
        }
    }, [reviews]);

    // Refresh backend and local reviews when another component updates them.
    useEffect(() => {
        let active = true;

        async function refreshReviews() {
            try {
                const response = await getMyReviews();

                if (!active || !Array.isArray(response)) return;

                const backendReviews = response
                    .filter(review => review.status !== 'deleted')
                    .map(normalizeBackendReview);

                const localReviews = loadReviews().filter(
                    review => !review.isBackendReview
                );

                setReviews([
                    ...backendReviews,
                    ...localReviews
                ]);
            } catch (error) {
                console.error('Unable to refresh reviews:', error);
            }
        }

        window.addEventListener('my-reviews-updated', refreshReviews);
        window.addEventListener('storage', refreshReviews);

        return () => {
            active = false;

            window.removeEventListener(
                'my-reviews-updated',
                refreshReviews
            );

            window.removeEventListener(
                'storage',
                refreshReviews
            );
        };
    }, []);

    // Filter reviews.
    const filteredReviews = reviews.filter(review => {
        if (filter === 'All') return true;

        return Number(review.rating) === Number(filter);
    });

    // Edit review.
    function editReview(review) {
        setEditingReview({ ...review });
        setMessage('');
    }

    // Handle form changes.
    function handleChange(e) {
        const { name, value } = e.target;

        setEditingReview(previousReview => ({
            ...previousReview,
            [name]: name === 'rating' ? Number(value) : value
        }));
    }

    // Save updated review.
    async function saveReview(e) {
        e.preventDefault();

        if (!editingReview.comment?.trim()) {
            setMessage('Please enter your review.');
            return;
        }

        if (editingReview.comment.trim().length < 2) {
            setMessage('Review must contain at least 2 characters.');
            return;
        }

        const updatedReview = {
            ...editingReview,
            comment: editingReview.comment.trim()
        };

        setSaving(true);
        setMessage('');

        try {
            if (updatedReview.isBackendReview) {
                await updateBackendReview(
                    updatedReview.backendId,
                    updatedReview.comment
                );

                const score = Number(updatedReview.rating);

                if (
                    updatedReview.recipeId !== undefined &&
                    updatedReview.recipeId !== null &&
                    score >= 1 &&
                    score <= 5
                ) {
                    try {
                        if (updatedReview.isDatabaseRecipe) {
                            await updateRating(
                                updatedReview.recipeId,
                                score
                            );
                        } else {
                            await updateStaticRating(
                                updatedReview.recipeId,
                                score
                            );
                        }
                    } catch (ratingError) {
                        // Create a rating if one does not exist yet.
                        if (updatedReview.isDatabaseRecipe) {
                            await createRating(
                                updatedReview.recipeId,
                                score
                            );
                        } else {
                            await createStaticRating(
                                updatedReview.recipeId,
                                score
                            );
                        }
                    }
                }
            } else {
                updateRecipeReview(updatedReview, 'update');
            }

            setReviews(previousReviews =>
                previousReviews.map(review =>
                    String(review.id) === String(updatedReview.id)
                        ? updatedReview
                        : review
                )
            );

            setEditingReview(null);
            setMessage('Review updated successfully!');
        } catch (error) {
            console.error('Unable to update review:', error);

            setMessage(
                error?.message ||
                'Unable to update review. Please try again.'
            );
        } finally {
            setSaving(false);
        }
    }

    // Delete backend or local review.
    async function deleteReview(id) {
        const confirmDelete = window.confirm(
            'Are you sure you want to delete this review?'
        );

        if (!confirmDelete) return;

        const reviewToDelete = reviews.find(
            review => String(review.id) === String(id)
        );

        if (!reviewToDelete) return;

        try {
            if (reviewToDelete.isBackendReview) {
                await deleteBackendReview(
                    reviewToDelete.backendId
                );
            } else {
                updateRecipeReview(reviewToDelete, 'delete');
            }

            setReviews(previousReviews =>
                previousReviews.filter(
                    review => String(review.id) !== String(id)
                )
            );

            if (String(editingReview?.id) === String(id)) {
                setEditingReview(null);
            }

            setMessage('Review deleted successfully!');
        } catch (error) {
            console.error('Unable to delete review:', error);

            setMessage(
                error?.message ||
                'Unable to delete review. Please try again.'
            );
        }
    }

    const filterOptions = [
        { label: 'All Reviews', value: 'All' },
        { label: '5 Stars', value: '5' },
        { label: '4 Stars', value: '4' },
        { label: '3 Stars', value: '3' },
        { label: '2 Stars', value: '2' },
        { label: '1 Star', value: '1' }
    ];

    return (
        <div className="my-reviews-page">

            {/* Hero Section */}
            <section className="my-reviews-hero">

                <div className="reviews-hero-content">

                    <span className="reviews-hero-label">
                        YOUR FOOD EXPERIENCES
                    </span>

                    <h1>My Reviews</h1>

                    <p>
                        Every recipe has a story. See and manage
                        all the recipes you have reviewed.
                    </p>

                </div>

                <div className="reviews-hero-decoration">

                    <span className="hero-star">★★★★★</span>

                    <span className="hero-decoration-icon">♡</span>

                    <span className="hero-decoration-text">
                        Your feedback matters!
                    </span>

                </div>

            </section>

            {/* Success / Error Message */}
            {message && (
                <p className="my-reviews-message" role="status">
                    {message}
                </p>
            )}

            {/* Review Filters */}
            <section className="reviews-filter-section">

                <div className="reviews-filter-heading">

                    <h2>My Recipe Reviews</h2>

                    <span className="review-count">
                        {reviews.length}{' '}
                        {reviews.length === 1 ? 'Review' : 'Reviews'}
                    </span>

                </div>

                <div className="reviews-filter-tabs">

                    {filterOptions.map(option => (
                        <button
                            type="button"
                            key={option.value}
                            className={`review-filter-btn ${
                                filter === option.value ? 'active' : ''
                            }`}
                            onClick={() => setFilter(option.value)}
                        >
                            {option.label}
                        </button>
                    ))}

                </div>

            </section>

            {/* Edit Review Form */}
            {editingReview && (

                <form
                    className="edit-review-form"
                    onSubmit={saveReview}
                >

                    <div className="edit-review-heading">

                        <div>
                            <span>UPDATE YOUR EXPERIENCE</span>
                            <h2>Edit Your Review</h2>
                        </div>

                        <button
                            type="button"
                            className="close-edit-btn"
                            onClick={() => setEditingReview(null)}
                            aria-label="Close edit form"
                        >
                            ×
                        </button>

                    </div>

                    <label>Recipe Name</label>

                    <input
                        type="text"
                        value={editingReview.recipeName || ''}
                        disabled
                    />

                    <label>Rating</label>

                    <select
                        name="rating"
                        value={editingReview.rating || 5}
                        onChange={handleChange}
                    >
                        <option value="5">5 Stars</option>
                        <option value="4">4 Stars</option>
                        <option value="3">3 Stars</option>
                        <option value="2">2 Stars</option>
                        <option value="1">1 Star</option>
                    </select>

                    <label>Your Review</label>

                    <textarea
                        name="comment"
                        value={editingReview.comment || ''}
                        onChange={handleChange}
                        rows="4"
                        placeholder="Write your review..."
                    />

                    <div className="review-form-actions">

                        <button type="submit" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>

                        <button
                            type="button"
                            onClick={() => setEditingReview(null)}
                            disabled={saving}
                        >
                            Cancel
                        </button>

                    </div>

                </form>
            )}

            {/* Reviews List */}
            <section className="my-reviews-list">

                {filteredReviews.length === 0 ? (

                    <div className="no-reviews">

                        <div className="empty-review-icon">♡</div>

                        <h2>
                            {reviews.length === 0
                                ? 'No Reviews Yet!'
                                : 'No Reviews Found'}
                        </h2>

                        <p>
                            {reviews.length === 0
                                ? 'Start reviewing your favourite recipes and share your thoughts.'
                                : 'No reviews are available for this rating.'}
                        </p>

                        {reviews.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setFilter('All')}
                            >
                                Show All Reviews
                            </button>
                        )}

                    </div>

                ) : (

                    filteredReviews.map(review => {

                        const safeRating = Math.min(
                            5,
                            Math.max(0, Number(review.rating) || 0)
                        );

                        const image = getReviewImage(review);

                        return (

                            <article
                                className="my-review-card"
                                key={review.id}
                            >

                                {/* Recipe Image */}
                                <div className="review-recipe-image">

                                    {image ? (
                                        <img
                                            src={image}
                                            alt={review.recipeName || 'Recipe'}
                                            onError={e => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <div className="review-image-placeholder">
                                            🍽️
                                        </div>
                                    )}

                                </div>

                                {/* Review Details */}
                                <div className="review-card-content">

                                    <div className="review-card-top">

                                        <span className="review-category">
                                            RECIPE REVIEW
                                        </span>

                                        <span className="review-number">
                                            REVIEW
                                        </span>

                                    </div>

                                    <h2>
                                        {review.recipeName || 'Untitled Recipe'}
                                    </h2>

                                    <div className="review-rating-row">

                                        <span className="review-stars">
                                            {'★'.repeat(safeRating)}
                                            {'☆'.repeat(5 - safeRating)}
                                        </span>

                                        <span className="rating-number">
                                            {safeRating.toFixed(1)} / 5
                                        </span>

                                    </div>

                                    <p className="review-comment">
                                        {review.comment || 'No comment added.'}
                                    </p>

                                    <div className="review-date">
                                        <span>▦</span>
                                        Reviewed on: {getReviewDate(review)}
                                    </div>

                                    {/* Actions */}
                                    <div className="my-review-actions">

                                        <button
                                            type="button"
                                            className="edit-review-btn"
                                            onClick={() => editReview(review)}
                                        >
                                            ✎ Edit Review
                                        </button>

                                        <button
                                            type="button"
                                            className="delete-review-btn"
                                            onClick={() => deleteReview(review.id)}
                                        >
                                            ▤ Delete
                                        </button>

                                    </div>

                                </div>

                            </article>

                        );

                    })

                )}

            </section>

            {/* Bottom Message */}
            {reviews.length > 0 && (

                <div className="reviews-bottom-message">

                    <span>♡</span>

                    <p>
                        Keep cooking, keep reviewing!
                        Your feedback helps others discover great recipes.
                    </p>

                </div>

            )}

        </div>
    );
}

export default MyReviews;
