
import './ReviewSection.css';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

import {
    addNotification,
    getRecipeOwnerEmail
} from '../utils/notificationUtils';

import {
    getRecipeReviews,
    createReview,
    getStaticRecipeReviews,
    createStaticReview,
    updateReview,
    deleteReview,
    getRatingSummary,
    getMyRating,
    createRating,
    updateRating,
    getStaticRatingSummary,
    getMyStaticRating,
    createStaticRating,
    updateStaticRating,
    reportReview
} from '../services/portalApi';

// Load saved reviews from localStorage
function loadSavedReviews(storageKey) {
    try {
        const savedReviews = localStorage.getItem(storageKey);

        if (!savedReviews) return [];

        const parsedReviews = JSON.parse(savedReviews);
        return Array.isArray(parsedReviews) ? parsedReviews : [];
    } catch (error) {
        console.error('Unable to load reviews:', error);
        return [];
    }
}

// Load saved reports from localStorage
function loadSavedReports() {
    try {
        const savedReports = localStorage.getItem('recipe-review-reports');

        if (!savedReports) return [];

        const parsedReports = JSON.parse(savedReports);
        return Array.isArray(parsedReports) ? parsedReports : [];
    } catch (error) {
        console.error('Unable to load reports:', error);
        return [];
    }
}

// Synchronize current user's reviews with My Reviews page
function syncMyReviews(recipeId, recipeName, reviews, loggedInEmail, name) {
    try {
        const saved = JSON.parse(
            localStorage.getItem('my-reviews-data') || '[]'
        );

        const existingReviews = Array.isArray(saved) ? saved : [];

        const otherReviews = existingReviews.filter(
            review => String(review.recipeId) !== String(recipeId)
        );

        const userReviews = reviews
            .filter(review => {
                if (loggedInEmail && review.reviewerId) {
                    return review.reviewerId === `email:${loggedInEmail}`;
                }

                return (
                    String(review.name || '').trim().toLowerCase() ===
                    String(name || '').trim().toLowerCase()
                );
            })
            .map(review => ({
                ...review,
                recipeId,
                recipeName
            }));

        localStorage.setItem(
            'my-reviews-data',
            JSON.stringify([...otherReviews, ...userReviews])
        );

        window.dispatchEvent(new Event('my-reviews-updated'));
    } catch (error) {
        console.error('Unable to sync My Reviews:', error);
    }
}

function formatReviewDate(value) {
    if (!value) return new Date().toLocaleDateString();

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? String(value)
        : date.toLocaleDateString();
}

function ReviewSection({
    recipeId,
    recipeName,
    isDatabaseRecipe = false
}) {
    const reviewFormRef = useRef(null);

    // Get authenticated user from the actual AuthContext
    const {
        user: loggedInUser,
        isAuthenticated,
        authLoading
    } = useAuth();

    const loggedInEmail = String(
        loggedInUser?.email || ''
    ).trim().toLowerCase();

    const currentRole = String(
        loggedInUser?.role || ''
    ).toLowerCase();

    const canViewHiddenReviews =
        currentRole === 'moderator' ||
        currentRole === 'admin';

    const storageKey = `recipe-reviews-${recipeId}`;
    const reportsStorageKey = 'recipe-review-reports';

    const [reviews, setReviews] = useState(
        () => loadSavedReviews(storageKey)
    );

    const [reviewsEnabled, setReviewsEnabled] = useState(() => {
        try {
            const savedSettings = JSON.parse(
                localStorage.getItem('recipe-admin-settings')
            );

            return savedSettings?.reviewsEnabled ?? true;
        } catch {
            return true;
        }
    });

    const [reviewReportsEnabled, setReviewReportsEnabled] = useState(() => {
        try {
            const savedSettings = JSON.parse(
                localStorage.getItem('recipe-admin-settings')
            );

            return savedSettings?.reviewReports ?? true;
        } catch {
            return true;
        }
    });

    const [name, setName] = useState(
        loggedInUser?.name ||
        loggedInUser?.display_name ||
        loggedInUser?.username ||
        ''
    );

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');

    const [editingReviewId, setEditingReviewId] = useState(null);
    const [sortOption, setSortOption] = useState('latest');
    const [filterRating, setFilterRating] = useState('all');

    const [reportingReviewId, setReportingReviewId] = useState(null);
    const [reportReason, setReportReason] = useState('Spam');
    const [reportDetails, setReportDetails] = useState('');
    const [reports, setReports] = useState(loadSavedReports);

    const [loadingReviews, setLoadingReviews] = useState(false);
    const [submittingReview, setSubmittingReview] = useState(false);
    const [backendRatingSummary, setBackendRatingSummary] = useState(null);
    const [myBackendRating, setMyBackendRating] = useState(null);
    const [reviewError, setReviewError] = useState('');

    const reviewerId = loggedInEmail
        ? `email:${loggedInEmail}`
        : `name:${String(name || '').trim().toLowerCase()}`;

    // Convert backend review into the existing frontend review format
    function normalizeBackendReview(review) {
        return {
            id: `backend-${review.id}`,
            backendId: review.id,
            isBackendReview: true,
            reviewerId: `user:${review.user_id}`,
            userId: review.user_id,
            name: review.display_name || 'User',
            rating: Number(review.rating || 0),
            comment: review.comment || '',
            date: formatReviewDate(review.created_at),
            status: review.status,
            isHidden: review.status === 'hidden'
        };
    }

    // Load demo reviews immediately and backend data when authenticated.
    // Rating summaries load independently from review lists.
    useEffect(() => {
        let active = true;

        async function loadBackendData() {
            setLoadingReviews(true);
            setReviewError('');

            const savedLocalReviews = loadSavedReviews(storageKey).filter(
                review => !review.isBackendReview
            );

            // Preserve demo reviews while logged out or restoring session
            if (!isAuthenticated || !loggedInUser || authLoading) {
                setReviews(savedLocalReviews);
                setMyBackendRating(null);

                if (authLoading) {
                    setLoadingReviews(false);
                    return;
                }
            }

            // Load rating summary independently
            const summaryRequest = isDatabaseRecipe
                ? getRatingSummary(recipeId)
                : getStaticRatingSummary(recipeId);

            const summaryResult = await Promise.allSettled([
                summaryRequest
            ]);

            if (!active) return;

            if (summaryResult[0].status === 'fulfilled') {
                setBackendRatingSummary(
                    summaryResult[0].value || null
                );
            } else {
                console.error(
                    'Unable to load rating summary:',
                    summaryResult[0].reason
                );

                setBackendRatingSummary(null);
            }

            // Review list endpoints require authentication
            if (!isAuthenticated || !loggedInUser) {
                setLoadingReviews(false);
                return;
            }

            const reviewRequest = isDatabaseRecipe
                ? getRecipeReviews(recipeId)
                : getStaticRecipeReviews(recipeId);

            const reviewResult = await Promise.allSettled([
                reviewRequest
            ]);

            if (!active) return;

            if (reviewResult[0].status === 'fulfilled') {
                const backendReviews = Array.isArray(
                    reviewResult[0].value
                )
                    ? reviewResult[0].value.map(normalizeBackendReview)
                    : [];

                setReviews([
                    ...backendReviews,
                    ...savedLocalReviews
                ]);
            } else {
                console.error(
                    'Unable to load backend reviews:',
                    reviewResult[0].reason
                );

                setReviews(savedLocalReviews);

                setReviewError(
                    'Backend reviews could not be loaded. Existing demo reviews are still available.'
                );
            }

            // Load current user's rating
            const myRatingRequest = isDatabaseRecipe
                ? getMyRating(recipeId)
                : getMyStaticRating(recipeId);

            try {
                const myRating = await myRatingRequest;

                if (active) {
                    setMyBackendRating(myRating || null);
                    setRating(Number(myRating?.score || 0));
                }
            } catch (error) {
                if (active) {
                    setMyBackendRating(null);
                    setRating(0);
                }

                // A user without an existing rating may receive a 404.
            }

            if (active) {
                setLoadingReviews(false);
            }
        }

        loadBackendData().catch(error => {
            if (!active) return;

            console.error('Unable to load review data:', error);

            setReviewError(
                'Some review information could not be loaded. Existing demo reviews are still available.'
            );

            setLoadingReviews(false);
        });

        return () => {
            active = false;
        };
    }, [
        recipeId,
        isDatabaseRecipe,
        storageKey,
        loggedInUser?.id,
        isAuthenticated,
        authLoading
    ]);

    // Keep the name field synchronized with AuthContext
    useEffect(() => {
        if (!editingReviewId) {
            setName(
                loggedInUser?.name ||
                loggedInUser?.display_name ||
                loggedInUser?.username ||
                ''
            );
        }
    }, [
        loggedInUser?.id,
        loggedInUser?.name,
        loggedInUser?.display_name,
        editingReviewId
    ]);

    // Listen for Admin Settings changes
    useEffect(() => {
        function checkReviewSetting() {
            try {
                const savedSettings = JSON.parse(
                    localStorage.getItem('recipe-admin-settings')
                );

                const enabled = savedSettings?.reviewsEnabled ?? true;
                const reportsEnabled = savedSettings?.reviewReports ?? true;

                setReviewsEnabled(enabled);
                setReviewReportsEnabled(reportsEnabled);

                if (!enabled) {
                    setEditingReviewId(null);
                    setRating(0);
                    setComment('');
                }

                if (!reportsEnabled) {
                    setReportingReviewId(null);
                    setReportReason('Spam');
                    setReportDetails('');
                }
            } catch {
                setReviewsEnabled(true);
                setReviewReportsEnabled(true);
            }
        }

        window.addEventListener(
            'admin-settings-updated',
            checkReviewSetting
        );

        window.addEventListener('storage', checkReviewSetting);

        return () => {
            window.removeEventListener(
                'admin-settings-updated',
                checkReviewSetting
            );

            window.removeEventListener('storage', checkReviewSetting);
        };
    }, []);

    // Save local demo reviews and synchronize My Reviews
    useEffect(() => {
        const localReviews = reviews.filter(
            review => !review.isBackendReview
        );

        try {
            localStorage.setItem(
                storageKey,
                JSON.stringify(localReviews)
            );
        } catch (error) {
            console.error('Unable to save reviews:', error);
        }

        syncMyReviews(
            recipeId,
            recipeName,
            reviews,
            loggedInEmail,
            name
        );
    }, [
        reviews,
        storageKey,
        recipeId,
        recipeName,
        loggedInEmail,
        name
    ]);

    // Save reports
    useEffect(() => {
        try {
            localStorage.setItem(
                reportsStorageKey,
                JSON.stringify(reports)
            );
        } catch (error) {
            console.error('Unable to save reports:', error);
        }
    }, [reports]);

    function getReviewerId(reviewerName) {
        if (loggedInEmail) {
            return `email:${loggedInEmail}`;
        }

        return `name:${String(reviewerName || '').trim().toLowerCase()}`;
    }

    const existingReview = reviews.find(review => {
        if (review.isBackendReview && loggedInUser?.id) {
            return Number(review.userId) === Number(loggedInUser.id);
        }

        if (loggedInEmail && review.reviewerId) {
            return review.reviewerId === `email:${loggedInEmail}`;
        }

        return (
            String(review.name || '').trim().toLowerCase() ===
            String(name || '').trim().toLowerCase()
        );
    });

    const filteredReviews = reviews.filter(review => {
        if (review.isHidden && !canViewHiddenReviews) {
            return false;
        }

        if (filterRating === 'all') {
            return true;
        }

        return Number(review.rating) === Number(filterRating);
    });

    const visibleReviews = [...filteredReviews].sort((a, b) => {
        if (sortOption === 'latest') {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        }

        if (sortOption === 'oldest') {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        }

        if (sortOption === 'highest') {
            return Number(b.rating) - Number(a.rating);
        }

        if (sortOption === 'lowest') {
            return Number(a.rating) - Number(b.rating);
        }

        return 0;
    });

    const localReviews = visibleReviews.filter(
        review => !review.isBackendReview
    );

    const backendCount = Number(
        backendRatingSummary?.total_ratings || 0
    );

    const backendAverage = Number(
        backendRatingSummary?.average_rating || 0
    );

    const localRatingTotal = localReviews.reduce(
        (total, review) => total + (Number(review.rating) || 0),
        0
    );

    const totalVisibleRatings =
        localReviews.length + backendCount;

    const averageRating = totalVisibleRatings > 0
        ? (
            (
                localRatingTotal +
                backendAverage * backendCount
            ) / totalVisibleRatings
        ).toFixed(1)
        : '0.0';

    // Submit or update review and rating
    async function handleSubmitReview(event) {
        event.preventDefault();

        if (!reviewsEnabled) {
            alert('Reviews are currently disabled by the administrator.');
            return;
        }

        if (authLoading) {
            alert('Please wait while your login session is restored.');
            return;
        }

        if (!isAuthenticated || !loggedInUser) {
            alert('Please log in to submit a review.');
            return;
        }

        if (!name.trim()) {
            alert('Please enter your name.');
            return;
        }

        if (rating < 1 || rating > 5) {
            alert('Please select a rating.');
            return;
        }

        if (!comment.trim()) {
            alert('Please write your review.');
            return;
        }

        setSubmittingReview(true);
        setReviewError('');

        const currentReviewerId = getReviewerId(name);
        const ratingValue = Number(rating);

        // Save rating using the correct database/static endpoint
        const saveRating = async (shouldUpdate) => {
            if (isDatabaseRecipe) {
                return shouldUpdate
                    ? updateRating(recipeId, ratingValue)
                    : createRating(recipeId, ratingValue);
            }

            return shouldUpdate
                ? updateStaticRating(recipeId, ratingValue)
                : createStaticRating(recipeId, ratingValue);
        };

        // Refresh rating summary after changes
        const refreshRatingSummary = async () => {
            try {
                const summary = isDatabaseRecipe
                    ? await getRatingSummary(recipeId)
                    : await getStaticRatingSummary(recipeId);

                setBackendRatingSummary(summary || null);
            } catch (error) {
                console.error(
                    'Unable to refresh rating summary:',
                    error
                );
            }
        };

        try {
            // EDIT EXISTING REVIEW
            if (editingReviewId !== null) {
                const editingReview = reviews.find(
                    review =>
                        String(review.id) === String(editingReviewId)
                );

                if (!editingReview) {
                    throw new Error(
                        'The review could not be found. Please refresh and try again.'
                    );
                }

                if (editingReview.isBackendReview) {
                    // Update review comment first
                    await updateReview(
                        editingReview.backendId,
                        comment.trim()
                    );

                    // Immediately reflect the successful review update
                    setReviews(previous =>
                        previous.map(review =>
                            String(review.id) === String(editingReviewId)
                                ? {
                                    ...review,
                                    comment: comment.trim(),
                                    rating: ratingValue,
                                    date: new Date().toLocaleDateString()
                                }
                                : review
                        )
                    );

                    // Update the separate rating record
                    try {
                        const ratingResponse = await saveRating(
                            Boolean(myBackendRating)
                        );

                        setMyBackendRating(
                            ratingResponse || { score: ratingValue }
                        );
                    } catch (ratingError) {
                        setReviewError(
                            `Your review was updated, but the rating could not be saved: ${ratingError?.message || 'Please try again.'}`
                        );
                    }
                } else {
                    // Update local demo review
                    setReviews(previous =>
                        previous.map(review =>
                            String(review.id) === String(editingReviewId)
                                ? {
                                    ...review,
                                    name: name.trim(),
                                    rating: ratingValue,
                                    comment: comment.trim(),
                                    reviewerId: currentReviewerId,
                                    date: new Date().toLocaleDateString()
                                }
                                : review
                        )
                    );
                }

                setEditingReviewId(null);
                setRating(0);
                setComment('');

                await refreshRatingSummary();

                alert('Review updated successfully!');
                return;
            }

            // CREATE NEW REVIEW
            if (existingReview) {
                alert(
                    'You have already reviewed this recipe. Please edit your existing review.'
                );
                return;
            }

            const reviewResponse = isDatabaseRecipe
                ? await createReview(recipeId, comment.trim())
                : await createStaticReview(recipeId, comment.trim());

            // The review has been saved. Display it immediately.
            // Rating is a separate API operation.
            const newReview = normalizeBackendReview({
                ...reviewResponse,
                rating: ratingValue,
                display_name: reviewResponse?.display_name || name.trim()
            });

            setReviews(previous => [
                newReview,
                ...previous
            ]);

            let ratingSaved = false;

            try {
                let ratingResponse;

                try {
                    ratingResponse = await saveRating(false);
                } catch (ratingError) {
                    const message = String(
                        ratingError?.message || ''
                    ).toLowerCase();

                    if (
                        message.includes('409') ||
                        message.includes('already') ||
                        message.includes('exists')
                    ) {
                        ratingResponse = await saveRating(true);
                    } else {
                        throw ratingError;
                    }
                }

                setMyBackendRating(
                    ratingResponse || { score: ratingValue }
                );

                ratingSaved = true;
            } catch (ratingError) {
                console.error(
                    'Review saved, but rating failed:',
                    ratingError
                );

                setReviewError(
                    `Your review was saved, but your rating could not be saved: ${ratingError?.message || 'Please try again.'}`
                );
            }

            // Notify recipe owner only for static/demo recipes.
            // Database recipes are notified by the backend review endpoint.
            if (!isDatabaseRecipe) {
                const recipeOwnerEmail = getRecipeOwnerEmail(recipeId);

                if (recipeOwnerEmail) {
                    addNotification({
                        recipientEmail: recipeOwnerEmail,
                        actorEmail: loggedInEmail,
                        type: 'new-review',
                        title: 'New Recipe Review',
                        message: `${name.trim()} added a new review to your recipe "${recipeName}".`,
                        recipeId,
                        recipeName
                    });
                }
            }

            setRating(0);
            setComment('');

            await refreshRatingSummary();

            if (ratingSaved) {
                alert('Review and rating submitted successfully!');
            } else {
                alert(
                    'Your review was saved. Your rating could not be saved; you can try updating it again.'
                );
            }
        } catch (error) {
            console.error('Unable to submit review:', error);

            setReviewError(
                error?.message ||
                'Unable to submit your review. Please try again.'
            );
        } finally {
            setSubmittingReview(false);
        }
    }

    function handleEditReview(review) {
        if (!reviewsEnabled) {
            alert('Reviews are currently disabled.');
            return;
        }

        if (review.isBackendReview && !isAuthenticated) {
            alert('Please log in to edit your review.');
            return;
        }

        setEditingReviewId(review.id);
        setName(review.name);
        setRating(
            Math.min(5, Math.max(0, Number(review.rating) || 0))
        );
        setComment(review.comment);

        setTimeout(() => {
            reviewFormRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }, 100);
    }

    function cancelEdit() {
        setEditingReviewId(null);

        setName(
            loggedInUser?.name ||
            loggedInUser?.display_name ||
            loggedInUser?.username ||
            ''
        );

        setRating(0);
        setComment('');
    }

    // Delete review
    async function handleDeleteReview(reviewId) {
        const confirmDelete = window.confirm(
            'Are you sure you want to delete this review?'
        );

        if (!confirmDelete) return;

        const review = reviews.find(
            item => String(item.id) === String(reviewId)
        );

        try {
            if (review?.isBackendReview) {
                await deleteReview(review.backendId);
            }

            setReviews(previous =>
                previous.filter(
                    item => String(item.id) !== String(reviewId)
                )
            );

            if (String(editingReviewId) === String(reviewId)) {
                cancelEdit();
            }

            alert('Review deleted successfully!');
        } catch (error) {
            console.error('Unable to delete review:', error);

            alert(
                error?.message || 'Unable to delete review.'
            );
        }
    }

    // Submit review report to the backend
    async function handleReportReview(review) {
        if (!reviewReportsEnabled) {
            alert(
                'Review reporting is currently disabled by the administrator.'
            );
            return;
        }

        if (!isAuthenticated || !loggedInUser) {
            alert('Please log in to report a review.');
            return;
        }

        if (!review?.isBackendReview || !review.backendId) {
            alert(
                'This review cannot be reported because it is not stored in the backend.'
            );
            return;
        }

        const alreadyReported = reports.some(report => (
            String(report.reviewId) === String(review.id) &&
            String(report.recipeId) === String(recipeId) &&
            report.reporterId === reviewerId &&
            report.status === 'Pending'
        ));

        if (alreadyReported) {
            alert('You have already reported this review.');
            return;
        }

        try {
            await reportReview(review.backendId, {
                reason: reportReason,
                details: reportDetails.trim() || null
            });

            const newReport = {
                id: Date.now(),
                reviewId: review.id,
                recipeId,
                reporterId: reviewerId,
                reason: reportReason,
                details: reportDetails.trim(),
                date: new Date().toLocaleString(),
                status: 'Pending'
            };

            setReports(previous => [
                ...previous,
                newReport
            ]);

            setReportingReviewId(null);
            setReportReason('Spam');
            setReportDetails('');

            alert(
                'Review reported successfully. A moderator will check it.'
            );
        } catch (error) {
            console.error('Unable to report review:', error);

            alert(
                error?.message ||
                'Unable to submit report. Please try again.'
            );
        }
    }

    function cancelReport() {
        setReportingReviewId(null);
        setReportReason('Spam');
        setReportDetails('');
    }

    return (
        <section className="review-section">
            <h2>⭐ Ratings and Reviews</h2>

            {/* Rating Summary */}
            <div className="rating-summary">
                <h3>{averageRating} / 5 ⭐</h3>
                <p>
                    Based on {totalVisibleRatings} ratings
                </p>
            </div>

            {reviewError && (
                <p className="review-error" role="alert">
                    {reviewError}
                </p>
            )}

            {/* Review Form */}
            {reviewsEnabled ? (
                <div
                    className="review-form"
                    ref={reviewFormRef}
                >
                    <h3>
                        {editingReviewId !== null
                            ? '✏️ Edit Your Review'
                            : 'Write a Review'}
                    </h3>

                    {existingReview && editingReviewId === null && (
                        <p className="existing-review-message">
                            You have already reviewed this recipe.
                            You can edit or delete your existing review below.
                        </p>
                    )}

                    <form onSubmit={handleSubmitReview}>
                        <label htmlFor="reviewer-name">
                            Your Name
                        </label>

                        <input
                            id="reviewer-name"
                            type="text"
                            value={name}
                            onChange={event => setName(event.target.value)}
                            placeholder="Enter your name"
                            required
                        />

                        <label>Your Rating</label>

                        <div className="rating-stars">
                            {[1, 2, 3, 4, 5].map(star => (
                                <button
                                    key={star}
                                    type="button"
                                    className={
                                        star <= rating
                                            ? 'star active'
                                            : 'star'
                                    }
                                    onClick={() => setRating(star)}
                                    aria-label={`Rate ${star} out of 5`}
                                    aria-pressed={star <= rating}
                                >
                                    ★
                                </button>
                            ))}
                        </div>

                        <label htmlFor="review-comment">
                            Your Review
                        </label>

                        <textarea
                            id="review-comment"
                            value={comment}
                            onChange={event => setComment(event.target.value)}
                            placeholder="Write your experience..."
                            rows="4"
                            required
                        />

                        <div className="review-form-buttons">
                            <button
                                type="submit"
                                disabled={submittingReview || authLoading}
                            >
                                {submittingReview
                                    ? 'Saving...'
                                    : editingReviewId !== null
                                        ? 'Update Review'
                                        : 'Submit Review'}
                            </button>

                            {editingReviewId !== null && (
                                <button
                                    type="button"
                                    className="cancel-edit-btn"
                                    onClick={cancelEdit}
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            ) : (
                <div className="submission-disabled-message">
                    <h3>Reviews Currently Unavailable</h3>
                    <p>
                        The administrator has temporarily disabled
                        reviews for this recipe. Please try again later.
                    </p>
                </div>
            )}

            {/* Customer Reviews */}
            <div className="reviews-list">
                <h3>Customer Reviews</h3>

                <div className="review-controls">
                    <div>
                        <label htmlFor="filter-rating">
                            Filter by Rating:
                        </label>

                        <select
                            id="filter-rating"
                            value={filterRating}
                            onChange={event => setFilterRating(event.target.value)}
                        >
                            <option value="all">All Ratings</option>
                            <option value="5">5 Stars</option>
                            <option value="4">4 Stars</option>
                            <option value="3">3 Stars</option>
                            <option value="2">2 Stars</option>
                            <option value="1">1 Star</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="sort-reviews">
                            Sort Reviews:
                        </label>

                        <select
                            id="sort-reviews"
                            value={sortOption}
                            onChange={event => setSortOption(event.target.value)}
                        >
                            <option value="latest">Latest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="highest">Highest Rating</option>
                            <option value="lowest">Lowest Rating</option>
                        </select>
                    </div>
                </div>

                <p className="review-count">
                    Showing {visibleReviews.length} of {
                        canViewHiddenReviews
                            ? reviews.length
                            : reviews.filter(review => !review.isHidden).length
                    } reviews
                </p>

                {loadingReviews && (
                    <p className="no-reviews-message">
                        Loading reviews...
                    </p>
                )}

                {visibleReviews.length === 0 ? (
                    <p className="no-reviews-message">
                        {reviews.length === 0
                            ? 'No reviews yet. Be the first to review!'
                            : 'No visible reviews found for this rating.'}
                    </p>
                ) : (
                    visibleReviews.map(review => {
                        const isMyReview = review.isBackendReview
                            ? Number(review.userId) === Number(loggedInUser?.id)
                            : loggedInEmail
                                ? review.reviewerId === `email:${loggedInEmail}`
                                : String(review.name || '').trim().toLowerCase() ===
                                  String(name || '').trim().toLowerCase();

                        const safeRating = Math.round(
                            Math.min(
                                5,
                                Math.max(0, Number(review.rating) || 0)
                            )
                        );

                        return (
                            <div
                                className="review-card"
                                key={review.id}
                            >
                                <div className="review-card-header">
                                    <h4>{review.name}</h4>
                                    <span>{review.date}</span>
                                </div>

                                {review.isHidden && canViewHiddenReviews && (
                                    <p className="hidden-review-label">
                                        🚫 This review is hidden from normal users.
                                    </p>
                                )}

                                <div className="review-card-stars">
                                    {'★'.repeat(safeRating)}
                                    {'☆'.repeat(5 - safeRating)}
                                </div>

                                <p>{review.comment}</p>

                                {isMyReview && !review.isHidden && (
                                    <div className="review-actions">
                                        {reviewsEnabled && (
                                            <button
                                                type="button"
                                                onClick={() => handleEditReview(review)}
                                            >
                                                ✏️ Edit
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            className="delete-review-btn"
                                            onClick={() => handleDeleteReview(review.id)}
                                        >
                                            🗑️ Delete
                                        </button>
                                    </div>
                                )}

                                {reviewReportsEnabled &&
                                    !isMyReview &&
                                    !review.isHidden && (
                                        <div className="report-review-section">
                                            {reportingReviewId === review.id ? (
                                                <div className="report-form">
                                                    <h4>🚩 Report this review</h4>

                                                    <label>
                                                        Reason for reporting:
                                                    </label>

                                                    <select
                                                        value={reportReason}
                                                        onChange={event =>
                                                            setReportReason(event.target.value)
                                                        }
                                                    >
                                                        <option value="Spam">Spam</option>
                                                        <option value="Offensive Content">
                                                            Offensive Content
                                                        </option>
                                                        <option value="Fake Review">
                                                            Fake Review
                                                        </option>
                                                        <option value="Inappropriate Language">
                                                            Inappropriate Language
                                                        </option>
                                                        <option value="Other">Other</option>
                                                    </select>

                                                    <label>
                                                        Additional details:
                                                    </label>

                                                    <textarea
                                                        value={reportDetails}
                                                        onChange={event =>
                                                            setReportDetails(event.target.value)
                                                        }
                                                        placeholder="Explain why you are reporting this review..."
                                                        rows="3"
                                                    />

                                                    <div className="report-form-buttons">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleReportReview(review)
                                                            }
                                                        >
                                                            Submit Report
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="cancel-report-btn"
                                                            onClick={cancelReport}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="report-review-btn"
                                                    onClick={() =>
                                                        setReportingReviewId(review.id)
                                                    }
                                                >
                                                    🚩 Report Review
                                                </button>
                                            )}
                                        </div>
                                    )}
                            </div>
                        );
                    })
                )}
            </div>
        </section>
    );
}

export default ReviewSection;
