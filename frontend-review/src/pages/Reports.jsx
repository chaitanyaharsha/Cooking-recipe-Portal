
import './Reports.css';
import { useState } from 'react';

function Reports() {

    const [reportData] = useState({
        totalUsers: 25,
        activeUsers: 20,
        inactiveUsers: 5,
        totalRecipes: 18,
        totalReviews: 32,
        averageRating: 4.3,
        approved: 10,
        pending: 5,
        rejected: 3,
        featuredRecipes: 4
    });

    const [categoryData] = useState([
        { name: 'Indian', count: 8 },
        { name: 'Desserts', count: 4 },
        { name: 'Chinese', count: 3 },
        { name: 'Italian', count: 2 },
        { name: 'Healthy', count: 1 }
    ]);

    const [activities] = useState([
        {
            id: 1,
            activity: 'New recipe submitted',
            recipe: 'Vegetable Biryani',
            user: 'Rahul',
            date: '2026-11-11',
            status: 'Pending'
        },
        {
            id: 2,
            activity: 'Recipe approved',
            recipe: 'Chocolate Cake',
            user: 'Priya',
            date: '2026-11-10',
            status: 'Approved'
        },
        {
            id: 3,
            activity: 'New review added',
            recipe: 'Masala Dosa',
            user: 'Arun',
            date: '2026-11-10',
            status: 'Completed'
        },
        {
            id: 4,
            activity: 'Recipe rejected',
            recipe: 'Fruit Salad',
            user: 'Sneha',
            date: '2026-11-09',
            status: 'Rejected'
        }
    ]);

    const [dateFilter, setDateFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const totalStatuses =
        reportData.approved +
        reportData.pending +
        reportData.rejected;

    const userCountValid =
        reportData.activeUsers + reportData.inactiveUsers ===
        reportData.totalUsers;

    function calculatePercentage(count, total) {
        if (total === 0) return 0;
        return Math.round((count / total) * 100);
    }

    const filteredActivities = activities.filter((item) => {

        const activityDate = item.date;

        if (dateFilter === 'all') {
            return true;
        }

        if (dateFilter === 'custom') {

            if (!startDate && !endDate) return true;

            if (startDate && activityDate < startDate) {
                return false;
            }

            if (endDate && activityDate > endDate) {
                return false;
            }

            return true;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const days = Number(dateFilter);
        const start = new Date(today);

        start.setDate(today.getDate() - (days - 1));

        const startDateString = [
            start.getFullYear(),
            String(start.getMonth() + 1).padStart(2, '0'),
            String(start.getDate()).padStart(2, '0')
        ].join('-');

        const todayString = [
            today.getFullYear(),
            String(today.getMonth() + 1).padStart(2, '0'),
            String(today.getDate()).padStart(2, '0')
        ].join('-');

        return activityDate >= startDateString &&
            activityDate <= todayString;
    });

    function formatDate(date) {
        return new Date(date + 'T00:00:00').toLocaleDateString(
            'en-IN',
            {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }
        );
    }

    const summaryCards = [
        {
            title: 'Total Users',
            value: reportData.totalUsers,
            subtitle: 'Registered users',
            type: 'users'
        },
        {
            title: 'Active Users',
            value: reportData.activeUsers,
            subtitle: 'Currently active',
            type: 'active'
        },
        {
            title: 'Inactive Users',
            value: reportData.inactiveUsers,
            subtitle: 'Inactive accounts',
            type: 'inactive'
        },
        {
            title: 'Total Recipes',
            value: reportData.totalRecipes,
            subtitle: 'Recipes submitted',
            type: 'recipes'
        },
        {
            title: 'Total Reviews',
            value: reportData.totalReviews,
            subtitle: 'Community reviews',
            type: 'reviews'
        },
        {
            title: 'Average Rating',
            value: `${reportData.averageRating}/5`,
            subtitle: 'Overall recipe rating',
            type: 'rating'
        },
        {
            title: 'Featured Recipes',
            value: reportData.featuredRecipes,
            subtitle: 'Highlighted recipes',
            type: 'featured'
        }
    ];

    return (
        <div className="reports-page">

            {/* Hero Banner */}

            <section className="reports-hero">

                <div className="reports-hero-content">

                    <span className="reports-hero-label">
                        ADMIN ANALYTICS
                    </span>

                    <h1>
                        Reports & Analytics
                    </h1>

                    <p>
                        Track performance, monitor portal activity
                        and understand your recipe community.
                    </p>

                    <div className="reports-hero-line"></div>

                </div>

                <div className="reports-hero-image"></div>

            </section>

            {/* Page Introduction */}

            <div className="reports-section-heading">
                <div>
                    <span className="reports-eyebrow">
                        OVERVIEW
                    </span>

                    <h2>Portal Performance</h2>

                    <p>
                        A complete overview of your platform statistics.
                    </p>
                </div>
            </div>

            {!userCountValid && (
                <p className="admin-empty">
                    User statistics do not match the total user count.
                </p>
            )}

            {/* Summary Cards */}

            <section className="report-summary">

                {summaryCards.map((card, index) => (

                    <div
                        className={`report-card report-card-${card.type}`}
                        key={card.type}
                    >

                        <div className="report-card-top">

                            <span className="report-card-number">
                                {String(index + 1).padStart(2, '0')}
                            </span>

                            <span className="report-card-dot"></span>

                        </div>

                        <div className="report-card-content">

                            <h3>{card.title}</h3>

                            <h2>{card.value}</h2>

                            <p>{card.subtitle}</p>

                        </div>

                        <div className="report-card-bottom"></div>

                    </div>

                ))}

            </section>

            {/* Moderation Statistics */}

            <section className="report-section">

                <div className="report-section-heading">

                    <div>
                        <span className="reports-eyebrow">
                            RECIPE MANAGEMENT
                        </span>

                        <h2>Recipe Moderation Statistics</h2>

                        <p>
                            Track the approval status of submitted recipes.
                        </p>
                    </div>

                    <div className="report-total-badge">
                        <strong>{totalStatuses}</strong>
                        <span>Total Submissions</span>
                    </div>

                </div>

                <div className="status-report">

                    {[
                        {
                            title: 'Approved Recipes',
                            count: reportData.approved,
                            className: 'approved-fill',
                            percentage: calculatePercentage(
                                reportData.approved,
                                totalStatuses
                            )
                        },
                        {
                            title: 'Pending Recipes',
                            count: reportData.pending,
                            className: 'pending-fill',
                            percentage: calculatePercentage(
                                reportData.pending,
                                totalStatuses
                            )
                        },
                        {
                            title: 'Rejected Recipes',
                            count: reportData.rejected,
                            className: 'rejected-fill',
                            percentage: calculatePercentage(
                                reportData.rejected,
                                totalStatuses
                            )
                        }
                    ].map((item) => (

                        <div
                            className="status-report-item"
                            key={item.title}
                        >

                            <div className="status-report-heading">

                                <div>
                                    <span>{item.title}</span>
                                    <strong>{item.count}</strong>
                                </div>

                                <span className="status-percentage">
                                    {item.percentage}%
                                </span>

                            </div>

                            <div className="report-progress">

                                <div
                                    className={`report-progress-fill ${item.className}`}
                                    style={{
                                        width: `${item.percentage}%`
                                    }}
                                />

                            </div>

                        </div>

                    ))}

                </div>

            </section>

            {/* Category Statistics */}

            <section className="report-section">

                <div className="report-section-heading">

                    <div>
                        <span className="reports-eyebrow">
                            CONTENT DISTRIBUTION
                        </span>

                        <h2>Recipes by Category</h2>

                        <p>
                            Explore how recipes are distributed across categories.
                        </p>
                    </div>

                    <div className="report-total-badge">
                        <strong>{reportData.totalRecipes}</strong>
                        <span>Total Recipes</span>
                    </div>

                </div>

                <div className="category-report">

                    {categoryData.map((category, index) => (

                        <div
                            className="category-report-item"
                            key={category.name}
                        >

                            <div className="category-report-heading">

                                <div className="category-name-group">

                                    <span className="category-index">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>

                                    <span>{category.name}</span>

                                </div>

                                <strong>
                                    {category.count} Recipes
                                    <span>
                                        ({calculatePercentage(
                                            category.count,
                                            reportData.totalRecipes
                                        )}%)
                                    </span>
                                </strong>

                            </div>

                            <div className="report-progress">

                                <div
                                    className="report-progress-fill category-fill"
                                    style={{
                                        width: `${calculatePercentage(
                                            category.count,
                                            reportData.totalRecipes
                                        )}%`
                                    }}
                                />

                            </div>

                        </div>

                    ))}

                </div>

            </section>

            {/* Recent Activity */}

            <section className="report-section activity-section">

                <div className="report-section-heading activity-header">

                    <div>
                        <span className="reports-eyebrow">
                            LATEST UPDATES
                        </span>

                        <h2>Recent Portal Activity</h2>

                        <p>
                            Monitor the latest actions across your portal.
                        </p>
                    </div>

                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                    >
                        <option value="all">All Time</option>
                        <option value="7">Last 7 Days</option>
                        <option value="30">Last 30 Days</option>
                        <option value="90">Last 3 Months</option>
                        <option value="custom">Custom Date Range</option>
                    </select>

                </div>

                {dateFilter === 'custom' && (

                    <div className="custom-date-filter">

                        <label>
                            Start Date

                            <input
                                type="date"
                                value={startDate}
                                max={endDate || undefined}
                                onChange={(e) => setStartDate(e.target.value)}
                            />

                        </label>

                        <label>
                            End Date

                            <input
                                type="date"
                                value={endDate}
                                min={startDate || undefined}
                                onChange={(e) => setEndDate(e.target.value)}
                            />

                        </label>

                    </div>

                )}

                <div className="activity-table-wrapper">

                    <table className="activity-table">

                        <thead>
                            <tr>
                                <th>Activity</th>
                                <th>Recipe</th>
                                <th>User</th>
                                <th>Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>

                        <tbody>

                            {filteredActivities.map((item) => (

                                <tr key={item.id}>

                                    <td className="activity-name">
                                        {item.activity}
                                    </td>

                                    <td>{item.recipe}</td>

                                    <td>{item.user}</td>

                                    <td>{formatDate(item.date)}</td>

                                    <td>
                                        <span
                                            className={`admin-status ${item.status.toLowerCase()}`}
                                        >
                                            {item.status}
                                        </span>
                                    </td>

                                </tr>

                            ))}

                        </tbody>

                    </table>

                    {filteredActivities.length === 0 && (

                        <p className="admin-empty">
                            No activities found for this period.
                        </p>

                    )}

                </div>

                <div className="activity-footer">
                    Showing {filteredActivities.length} activities
                </div>

            </section>

        </div>
    );
}

export default Reports;
