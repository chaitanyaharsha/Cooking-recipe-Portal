
import './AdminSettings.css';
import { useEffect, useState } from 'react';

import {
    getAdminSettings,
    updateAdminSettings
} from '../services/portalApi';

const defaultSettings = {
    recipeSubmissions: true,
    reviewsEnabled: true,
    reviewReports: true,
    automaticApproval: false
};

const settingItems = [
    {
        id: 'recipeSubmissions',
        icon: '🍲',
        number: '01',
        title: 'Recipe Submissions',
        description: 'Allow registered users to submit new recipes.'
    },
    {
        id: 'reviewsEnabled',
        icon: '⭐',
        number: '02',
        title: 'Enable Reviews',
        description: 'Allow users to write reviews and ratings on recipes.'
    },
    {
        id: 'reviewReports',
        icon: '🚩',
        number: '03',
        title: 'Review Reporting',
        description: 'Allow users to report inappropriate reviews.'
    },
    {
        id: 'automaticApproval',
        icon: '🛡️',
        number: '04',
        title: 'Automatic Recipe Approval',
        description: 'Automatically approve submitted recipes without moderator review.'
    }
];

// Convert backend settings into frontend setting names.
function normalizeSettings(data) {
    if (!data || typeof data !== 'object') {
        return { ...defaultSettings };
    }

    const source = data.settings || data;

    return {
        recipeSubmissions:
            source.recipe_submissions ??
            source.recipeSubmissions ??
            defaultSettings.recipeSubmissions,

        reviewsEnabled:
            source.reviews_enabled ??
            source.reviewsEnabled ??
            defaultSettings.reviewsEnabled,

        reviewReports:
            source.review_reports ??
            source.reviewReports ??
            defaultSettings.reviewReports,

        automaticApproval:
            source.automatic_approval ??
            source.automaticApproval ??
            defaultSettings.automaticApproval
    };
}

// Send the exact field names expected by the FastAPI backend.
function createBackendPayload(settings) {
    return {
        recipe_submissions: settings.recipeSubmissions,
        reviews_enabled: settings.reviewsEnabled,
        review_reports: settings.reviewReports,
        automatic_approval: settings.automaticApproval
    };
}

function AdminSettings() {
    const [settings, setSettings] = useState({
        ...defaultSettings
    });

    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Synchronize settings with other frontend components.
    function synchronizeSettings(updatedSettings) {
        localStorage.setItem(
            'recipe-admin-settings',
            JSON.stringify(updatedSettings)
        );

        window.dispatchEvent(
            new Event('admin-settings-updated')
        );
    }

    // Load settings from backend.
    useEffect(() => {
        let active = true;

        async function loadSettings() {
            setLoading(true);
            setError('');

            try {
                const response = await getAdminSettings();

                if (!active) return;

                const backendSettings = normalizeSettings(response);

                setSettings(backendSettings);
                synchronizeSettings(backendSettings);

            } catch (err) {
                if (!active) return;

                console.error('Unable to load admin settings:', err);

                setError(
                    err.message ||
                    'Unable to load settings from the backend.'
                );
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadSettings();

        return () => {
            active = false;
        };
    }, []);

    // Save settings to backend.
    async function saveSettings(updatedSettings, successMessage) {
        setSaving(true);
        setMessage('');
        setError('');

        try {
            const payload = createBackendPayload(updatedSettings);

            const response = await updateAdminSettings(payload);

            // Use the settings returned by the backend.
            const savedSettings = normalizeSettings(response);

            setSettings(savedSettings);
            synchronizeSettings(savedSettings);

            setMessage(successMessage);

        } catch (err) {
            console.error('Unable to save admin settings:', err);

            setError(
                err.message ||
                'Unable to save settings. Please try again.'
            );

        } finally {
            setSaving(false);
        }
    }

    // Toggle individual setting.
    function handleToggle(settingName) {
        if (saving || loading) return;

        const updatedSettings = {
            ...settings,
            [settingName]: !settings[settingName]
        };

        saveSettings(
            updatedSettings,
            'Settings updated successfully!'
        );
    }

    // Restore backend settings to defaults.
    function handleReset() {
        if (saving || loading) return;

        const confirmReset = window.confirm(
            'Are you sure you want to restore all settings to their default values?'
        );

        if (!confirmReset) return;

        saveSettings(
            { ...defaultSettings },
            'Settings restored to default values!'
        );
    }

    const enabledCount = Object.values(settings).filter(Boolean).length;

    return (
        <div className="admin-settings-page">

            {/* HERO BANNER */}
            <section className="settings-hero">

                {/* LEFT CONTENT */}
                <div className="settings-hero-content">

                    <span className="settings-hero-label">
                        ⚙ ADMIN CONTROL PANEL
                    </span>

                    <h1>Admin Settings</h1>

                    <p>
                        Customize your recipe portal preferences and
                        manage community moderation.
                    </p>

                    <div className="settings-hero-line"></div>

                </div>

                {/* RIGHT SIDE FOOD IMAGE */}
                <div className="settings-hero-image">

                    <img
                        src="https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1200&q=85"
                        alt="Delicious Indian biryani"
                    />

                </div>

            </section>

            {/* MAIN SETTINGS CONTAINER */}
            <section className="settings-content">

                {/* HEADING */}
                <div className="settings-heading">

                    <div>
                        <span className="settings-section-label">
                            PREFERENCES
                        </span>

                        <h2>Moderation Settings</h2>

                        <p>
                            Manage how your recipe community interacts with the portal.
                        </p>
                    </div>

                    <span className="settings-count">
                        04 SETTINGS
                    </span>

                </div>

                {/* OVERVIEW CARDS */}
                <div className="settings-overview">

                    <div className="settings-overview-item">

                        <div className="overview-icon">
                            👥
                        </div>

                        <div>
                            <strong>
                                {enabledCount} / 4
                            </strong>

                            <span>Active Settings</span>
                        </div>

                    </div>

                    <div className="settings-overview-item">

                        <div className="overview-icon">
                            🛡️
                        </div>

                        <div>
                            <strong>Admin</strong>
                            <span>Control Panel</span>
                        </div>

                    </div>

                </div>

                {/* LOADING MESSAGE */}
                {loading && (
                    <p className="settings-success" role="status">
                        Loading settings from backend...
                    </p>
                )}

                {/* SETTINGS LIST */}
                <div className="settings-list">

                    {settingItems.map(item => (

                        <div className="setting-item" key={item.id}>

                            <div className="setting-item-left">

                                <div className="setting-icon">
                                    {item.icon}
                                </div>

                                <div className="setting-text">

                                    <span className="setting-number">
                                        SETTING {item.number}
                                    </span>

                                    <h3>{item.title}</h3>

                                    <p>{item.description}</p>

                                </div>

                            </div>

                            <div className="setting-item-right">

                                <span
                                    className={`setting-status ${
                                        settings[item.id]
                                            ? 'is-enabled'
                                            : 'is-disabled'
                                    }`}
                                >
                                    <span className="status-dot">✓</span>

                                    {settings[item.id]
                                        ? 'Enabled'
                                        : 'Disabled'}
                                </span>

                                <label className="setting-switch">

                                    <input
                                        type="checkbox"
                                        checked={settings[item.id]}
                                        disabled={loading || saving}
                                        onChange={() => handleToggle(item.id)}
                                        aria-label={`Toggle ${item.title}`}
                                    />

                                    <span className="setting-slider"></span>

                                </label>

                            </div>

                        </div>

                    ))}

                </div>

                {/* BOTTOM ACTION */}
                <div className="settings-bottom">

                    <div className="settings-bottom-left">

                        <div className="settings-bottom-icon">
                            ↻
                        </div>

                        <div className="settings-bottom-text">

                            <h3>Manage Your Preferences</h3>

                            <p>
                                Changes are automatically saved to the backend.
                            </p>

                        </div>

                    </div>

                    <button
                        type="button"
                        className="reset-settings-btn"
                        onClick={handleReset}
                        disabled={loading || saving}
                    >
                        ↻ &nbsp;
                        {saving
                            ? 'Saving...'
                            : 'Reset Default Settings'}
                    </button>

                </div>

                {/* SUCCESS MESSAGE */}
                {message && (
                    <p className="settings-success" role="status">
                        ✓ &nbsp; {message}
                    </p>
                )}

                {/* ERROR MESSAGE */}
                {error && (
                    <p className="settings-success" role="alert">
                        {error}
                    </p>
                )}

                {/* INFORMATION NOTE */}
                <div className="settings-note">

                    <span className="note-icon">ℹ</span>

                    <p>
                        Settings are loaded and saved through the backend.
                        Changes are synchronized with the recipe submission
                        and review components.
                    </p>

                </div>

            </section>

        </div>
    );
}

export default AdminSettings;
