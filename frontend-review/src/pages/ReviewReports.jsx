
import './ReviewReports.css';
import { useEffect, useMemo, useState } from 'react';
import { recipes as recipeImageLibrary } from '../data/recipes';
import {
    getReviewReports,
    updateReportStatus,
    setReviewVisibility
} from '../services/portalApi';


function getRecipe(report) {
    const recipeId = report.static_recipe_id ?? report.recipe_id;

    return recipeImageLibrary.find((recipe) => {
        const ids = [recipe.id, recipe._id, recipe.recipeId]
            .filter((id) => id !== undefined && id !== null);

        return ids.some((id) => String(id) === String(recipeId)) ||
            (
                report.recipe_name &&
                recipe.name?.trim().toLowerCase() ===
                report.recipe_name.trim().toLowerCase()
            );
    });
}


function formatReportStatus(status) {
    const normalized = (status || 'pending').toLowerCase();

    if (normalized === 'resolved' || normalized === 'reviewed') {
        return 'Reviewed';
    }

    if (normalized === 'dismissed') {
        return 'Dismissed';
    }

    return 'Pending';
}


function formatReportDate(date) {
    if (!date) return 'Date unavailable';

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return 'Date unavailable';
    }

    return parsedDate.toLocaleDateString();
}


function ReviewReports() {
    const [reports, setReports] = useState([]);
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [updatingId, setUpdatingId] = useState(null);

    // Load reports from backend
    useEffect(() => {
        loadReports();
    }, []);

    async function loadReports() {
        try {
            setLoading(true);
            setError('');

            const response = await getReviewReports();

            const backendReports = Array.isArray(response)
                ? response
                : [];

            const formattedReports = backendReports.map((report) => ({
                ...report,
                id: report.id,
                recipeId: report.static_recipe_id ?? report.recipe_id,
                recipeName: report.recipe_name || '',
                reviewId: report.review_id,
                reviewName: report.review_name || 'Unknown',
                reviewComment: report.review_comment || '',
                reviewRating: report.review_rating ?? 0,
                reportedBy: report.reported_by || 'Unknown',
                reason: report.reason || 'Not specified',
                details: report.details || '',
                status: formatReportStatus(report.status),
                reviewHidden: report.review_status === 'hidden',
                date: formatReportDate(report.date)
            }));

            setReports(formattedReports);

        } catch (err) {
            console.error('Unable to load review reports:', err);
            setError(
                err.message || 'Unable to load reports. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    }


    // Update report status through backend
    async function updateReportStatusHandler(reportId, status) {
        try {
            setUpdatingId(reportId);

            const backendStatus = status.toLowerCase();

            await updateReportStatus(reportId, backendStatus);

            setReports((previous) =>
                previous.map((report) =>
                    String(report.id) === String(reportId)
                        ? { ...report, status }
                        : report
                )
            );

            alert(`Report marked as ${status} successfully!`);

        } catch (err) {
            console.error('Unable to update report status:', err);
            alert(
                err.message || 'Unable to update report status.'
            );
        } finally {
            setUpdatingId(null);
        }
    }


    // Hide or restore review through backend
    async function updateReviewVisibility(report, shouldHide) {
        try {
            setUpdatingId(report.id);

            await setReviewVisibility(report.reviewId, shouldHide);

            setReports((previous) =>
                previous.map((item) =>
                    String(item.id) === String(report.id)
                        ? {
                            ...item,
                            reviewHidden: shouldHide
                        }
                        : item
                )
            );

            alert(
                shouldHide
                    ? 'Review hidden successfully!'
                    : 'Review restored successfully!'
            );

        } catch (err) {
            console.error('Unable to update review visibility:', err);
            alert(
                err.message || 'Unable to update review visibility.'
            );
        } finally {
            setUpdatingId(null);
        }
    }


    const pendingCount = reports.filter(
        (report) => report.status === 'Pending'
    ).length;

    const reviewedCount = reports.filter(
        (report) => report.status === 'Reviewed'
    ).length;

    const dismissedCount = reports.filter(
        (report) => report.status === 'Dismissed'
    ).length;


    const filteredReports = useMemo(() => {
        const search = searchTerm.trim().toLowerCase();

        return reports.filter((report) => {
            const matchesStatus =
                filterStatus === 'All' ||
                report.status === filterStatus;

            const recipe = getRecipe(report);

            const searchableText = [
                report.reviewName,
                report.reviewComment,
                report.reason,
                report.reportedBy,
                report.recipeId,
                report.recipeName,
                recipe?.name
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return matchesStatus && searchableText.includes(search);
        });
    }, [reports, filterStatus, searchTerm]);


    const heroRecipe = recipeImageLibrary.find(
        (recipe) => recipe.image
    );

    const filterOptions = ['All', 'Pending', 'Reviewed', 'Dismissed'];


    return (
        <main className="review-reports-page">

            {/* HERO SECTION */}
            <section className="reports-hero">

                <div className="hero-decoration hero-circle-one" />
                <div className="hero-decoration hero-circle-two" />

                <div className="reports-hero-content">

                    <span className="hero-label">
                        ADMIN ANALYTICS
                    </span>

                    <h1>
                        Reports &amp;
                        <br />
                        Analytics
                    </h1>

                    <p>
                        Track reported reviews, monitor community activity
                        and maintain quality content across your recipe portal.
                    </p>

                    <span className="hero-line" />

                </div>

                <div className="reports-hero-image">
                    {heroRecipe?.image && (
                        <img
                            src={heroRecipe.image}
                            alt={heroRecipe.name || 'Featured food'}
                        />
                    )}
                </div>

            </section>


            {/* OVERVIEW */}
            <section className="reports-overview">

                <div className="overview-heading">
                    <span className="section-label">OVERVIEW</span>
                    <h2>Portal Performance</h2>
                    <p>
                        A complete overview of your reported reviews
                        and moderation statistics.
                    </p>
                </div>

                <div className="report-statistics">

                    <div className="report-stat-card total-stat">
                        <div className="stat-icon">▤</div>
                        <div className="stat-information">
                            <span>Total Reports</span>
                            <h3>{reports.length}</h3>
                            <p>All reported reviews</p>
                        </div>
                    </div>

                    <div className="report-stat-card pending-stat">
                        <div className="stat-icon">◷</div>
                        <div className="stat-information">
                            <span>Pending</span>
                            <h3>{pendingCount}</h3>
                            <p>Awaiting review</p>
                        </div>
                    </div>

                    <div className="report-stat-card reviewed-stat">
                        <div className="stat-icon">✓</div>
                        <div className="stat-information">
                            <span>Reviewed</span>
                            <h3>{reviewedCount}</h3>
                            <p>Successfully addressed</p>
                        </div>
                    </div>

                    <div className="report-stat-card dismissed-stat">
                        <div className="stat-icon">×</div>
                        <div className="stat-information">
                            <span>Dismissed</span>
                            <h3>{dismissedCount}</h3>
                            <p>No action required</p>
                        </div>
                    </div>

                </div>

            </section>


            {/* MODERATION CENTER */}
            <section className="reports-moderation">

                <div className="moderation-heading">

                    <div>
                        <span className="section-label">
                            MODERATION CENTER
                        </span>

                        <h2>Reported Reviews</h2>

                        <p>
                            Review and manage reported reviews submitted
                            by your community.
                        </p>
                    </div>

                    <span className="reports-count">
                        {filteredReports.length} Reports
                    </span>

                </div>


                {/* FILTER AND SEARCH */}
                <div className="report-toolbar">

                    <div className="report-filter-tabs">
                        {filterOptions.map((option) => (
                            <button
                                key={option}
                                className={
                                    filterStatus === option
                                        ? 'filter-tab active'
                                        : 'filter-tab'
                                }
                                onClick={() => setFilterStatus(option)}
                            >
                                {option}
                            </button>
                        ))}
                    </div>

                    <div className="report-search">
                        <span>⌕</span>
                        <input
                            type="search"
                            placeholder="Search reports..."
                            value={searchTerm}
                            onChange={(event) =>
                                setSearchTerm(event.target.value)
                            }
                        />
                    </div>

                </div>


                {/* REPORTED REVIEWS */}
                <div className="reports-list">

                    {loading ? (

                        <div className="no-reports">
                            <h3>Loading reports...</h3>
                            <p>Please wait while reports are fetched.</p>
                        </div>

                    ) : error ? (

                        <div className="no-reports">
                            <h3>Unable to load reports</h3>
                            <p>{error}</p>
                            <button onClick={loadReports}>
                                Try Again
                            </button>
                        </div>

                    ) : filteredReports.length === 0 ? (

                        <div className="no-reports">
                            <div className="empty-icon">▤</div>
                            <h3>No reports found</h3>
                            <p>
                                {searchTerm
                                    ? 'Try changing your search or filter.'
                                    : 'There are no reports in this category.'}
                            </p>
                        </div>

                    ) : (

                        filteredReports.map((report) => {
                            const recipe = getRecipe(report);

                            const recipeName =
                                report.recipeName ||
                                recipe?.name ||
                                `Recipe #${report.recipeId}`;

                            return (
                                <article
                                    className="reported-review-card"
                                    key={report.id}
                                >

                                    {/* RECIPE IMAGE */}
                                    <div className="report-recipe-image">
                                        {recipe?.image ? (
                                            <img
                                                src={recipe.image}
                                                alt={recipeName}
                                            />
                                        ) : (
                                            <div className="image-placeholder">
                                                No Image
                                            </div>
                                        )}
                                    </div>


                                    {/* REVIEW DETAILS */}
                                    <div className="report-details">

                                        <span className="report-eyebrow">
                                            REPORTED RECIPE REVIEW
                                        </span>

                                        <h3>{recipeName}</h3>

                                        <p className="review-author">
                                            Reviewed by:{' '}
                                            <strong>
                                                {report.reviewName || 'Unknown'}
                                            </strong>
                                        </p>

                                        <blockquote>
                                            “{report.reviewComment ||
                                                'No review comment provided.'}”
                                        </blockquote>

                                        <div className="report-meta">
                                            <span>
                                                ★ Rating: {report.reviewRating ?? '—'} / 5
                                            </span>

                                            <span>
                                                Reported by: {report.reportedBy || 'Unknown'}
                                            </span>

                                            <span>
                                                ▣ {report.date || 'Date unavailable'}
                                            </span>
                                        </div>

                                    </div>


                                    {/* STATUS */}
                                    <div className="report-status-area">
                                        <span className={`report-status ${report.status.toLowerCase()}`}>
                                            {report.status}
                                        </span>
                                    </div>


                                    {/* EXTRA INFORMATION */}
                                    <div className="report-extra">

                                        <div>
                                            <span>REPORT REASON</span>
                                            <strong>
                                                {report.reason || 'Not specified'}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>ADDITIONAL DETAILS</span>
                                            <strong>
                                                {report.details ||
                                                    'No additional details provided.'}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>REVIEW VISIBILITY</span>
                                            <strong className={
                                                report.reviewHidden
                                                    ? 'hidden-text'
                                                    : 'visible-text'
                                            }>
                                                {report.reviewHidden ? 'Hidden' : 'Visible'}
                                            </strong>
                                        </div>

                                    </div>


                                    {/* ACTIONS */}
                                    <div className="report-actions">

                                        {report.status === 'Pending' && (
                                            <>
                                                <button
                                                    className="mark-reviewed-btn"
                                                    disabled={updatingId === report.id}
                                                    onClick={() =>
                                                        updateReportStatusHandler(
                                                            report.id,
                                                            'Reviewed'
                                                        )
                                                    }
                                                >
                                                    ✓ Review
                                                </button>

                                                <button
                                                    className="dismiss-report-btn"
                                                    disabled={updatingId === report.id}
                                                    onClick={() =>
                                                        updateReportStatusHandler(
                                                            report.id,
                                                            'Dismissed'
                                                        )
                                                    }
                                                >
                                                    × Dismiss
                                                </button>
                                            </>
                                        )}

                                        {!report.reviewHidden ? (
                                            <button
                                                className="hide-review-btn"
                                                disabled={updatingId === report.id}
                                                onClick={() =>
                                                    updateReviewVisibility(
                                                        report,
                                                        true
                                                    )
                                                }
                                            >
                                                ⊘ Hide Review
                                            </button>
                                        ) : (
                                            <button
                                                className="restore-review-btn"
                                                disabled={updatingId === report.id}
                                                onClick={() =>
                                                    updateReviewVisibility(
                                                        report,
                                                        false
                                                    )
                                                }
                                            >
                                                ↶ Restore Review
                                            </button>
                                        )}

                                    </div>

                                </article>
                            );
                        })

                    )}

                </div>

            </section>

        </main>
    );
}

export default ReviewReports;
