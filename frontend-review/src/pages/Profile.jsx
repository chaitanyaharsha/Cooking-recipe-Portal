import './Profile.css';

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { recipes } from '../data/recipes';

import {
    getMyProfile,
    updateMyProfile
} from '../services/portalApi';

const defaultProfile = {
    name: '',
    email: '',
    bio: '',
    location: '',
    image: ''
};


// Food images used in the profile gallery
const favoriteRecipes = [
    {
        id: 1,
        name: 'Vegetable Biryani',
        rating: '4.8',
        image: 'https://images.unsplash.com/photo-1563379091339-03246963d96a?w=600&auto=format&fit=crop&q=85'
    },
    {
        id: 2,
        name: 'Chocolate Cake',
        rating: '4.9',
        image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=85'
    },
    {
        id: 3,
        name: 'Paneer Butter Masala',
        rating: '4.8',
        image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&auto=format&fit=crop&q=85'
    },
    {
        id: 4,
        name: 'Masala Dosa',
        rating: '4.7',
        image: 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=600&auto=format&fit=crop&q=85'
    }
];


const heroImage =
    'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=1800&auto=format&fit=crop&q=90';


// Load favorite count
function loadFavoriteCount() {
    try {
        const savedFavorites = JSON.parse(
            localStorage.getItem('favorites') || '[]'
        );

        return Array.isArray(savedFavorites)
            ? savedFavorites.length
            : 0;

    } catch (error) {
        console.error('Unable to load favorites:', error);
        return 0;
    }
}


function Profile() {

    const [profile, setProfile] = useState(defaultProfile);

    const [formData, setFormData] = useState(defaultProfile);

    const [isEditing, setIsEditing] = useState(false);

    const [message, setMessage] = useState('');

    const [errors, setErrors] = useState({});

    const [imageError, setImageError] = useState(false);

    const [favoriteCount, setFavoriteCount] = useState(loadFavoriteCount);

    const [isLoading, setIsLoading] = useState(true);

    const [isSaving, setIsSaving] = useState(false);


    // Load profile from backend
    useEffect(() => {

        async function loadProfile() {

            setIsLoading(true);

            try {

                const data = await getMyProfile();

                const userProfile = {
                    name: data.display_name || '',
                    email: data.email || '',
                    bio: data.bio || '',
                    location: data.location || '',
                    image: data.avatar_url || ''
                };

                setProfile(userProfile);
                setFormData(userProfile);

            } catch (error) {

                console.error('Unable to load profile:', error);

                setMessage(
                    error.message || 'Unable to load your profile.'
                );

            } finally {

                setIsLoading(false);

            }
        }

        loadProfile();

    }, []);


    // Refresh favorite count when favorites change
    useEffect(() => {

        const updateFavorites = () => {
            setFavoriteCount(loadFavoriteCount());
        };

        window.addEventListener('storage', updateFavorites);

        window.addEventListener('favorites-updated', updateFavorites);

        return () => {
            window.removeEventListener('storage', updateFavorites);
            window.removeEventListener('favorites-updated', updateFavorites);
        };

    }, []);


    // Handle form changes
    function handleChange(e) {

        const { name, value } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        setErrors(prev => ({
            ...prev,
            [name]: ''
        }));

        setMessage('');

        if (name === 'image') {
            setImageError(false);
        }
    }


    // Save profile to backend
    async function handleSubmit(e) {

        e.preventDefault();

        const updatedProfile = {
            name: formData.name.trim(),
            email: formData.email.trim(),
            location: formData.location.trim(),
            bio: formData.bio.trim(),
            image: formData.image.trim()
        };

        const newErrors = {};

        if (!updatedProfile.name) {
            newErrors.name = 'Please enter your name.';
        } else if (updatedProfile.name.length < 2) {
            newErrors.name = 'Name must contain at least 2 characters.';
        }

        if (!updatedProfile.email) {
            newErrors.email = 'Please enter your email.';
        } else if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updatedProfile.email)
        ) {
            newErrors.email = 'Please enter a valid email address.';
        }

        if (updatedProfile.image) {

            try {

                const imageUrl = new URL(updatedProfile.image);

                if (
                    imageUrl.protocol !== 'http:' &&
                    imageUrl.protocol !== 'https:'
                ) {
                    newErrors.image = 'Please enter a valid image URL.';
                }

            } catch {
                newErrors.image = 'Please enter a valid image URL.';
            }
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            return;
        }

        setIsSaving(true);
        setMessage('');

        try {

            const updatedData = await updateMyProfile({

                display_name: updatedProfile.name,

                email: updatedProfile.email,

                bio: updatedProfile.bio || null,

                location: updatedProfile.location || null,

                avatar_url: updatedProfile.image || null

            });

            const savedProfile = {
                name: updatedData.display_name || '',
                email: updatedData.email || '',
                bio: updatedData.bio || '',
                location: updatedData.location || '',
                image: updatedData.avatar_url || ''
            };

            setProfile(savedProfile);

            setFormData(savedProfile);

            setIsEditing(false);

            setImageError(false);

            setMessage('Your profile has been updated successfully!');

        } catch (error) {

            console.error('Unable to update profile:', error);

            setMessage(
                error.message || 'Unable to save your profile. Please try again.'
            );

        } finally {

            setIsSaving(false);

        }
    }


    // Cancel editing
    function handleCancel() {

        setFormData(profile);

        setIsEditing(false);

        setErrors({});

        setMessage('');

        setImageError(false);
    }


    const availableRecipeCount = Array.isArray(recipes)
        ? recipes.length
        : 0;

    const profileInitial = profile.name?.charAt(0).toUpperCase() || 'U';

    const showProfileImage = profile.image && !imageError;


    if (isLoading) {
        return (
            <div className="profile-page">
                <section className="profile-main-card">
                    <p>Loading your profile...</p>
                </section>
            </div>
        );
    }


    return (

        <div className="profile-page">

            {/* Food Hero Banner */}
            <section className="profile-hero">

                <img
                    src={heroImage}
                    alt="Delicious pasta on a dining table"
                    className="profile-hero-image"
                />

                <div className="profile-hero-overlay"></div>

                <div className="profile-hero-content">
                    <span>Good Food</span>
                    <span>Good Mood ♡</span>
                    <div className="hero-underline"></div>
                </div>

            </section>


            {/* Profile Information Card */}
            <section className="profile-main-card">

                <div className="profile-avatar-wrapper">

                    {showProfileImage ? (

                        <img
                            src={profile.image}
                            alt="Profile"
                            className="profile-avatar"
                            onError={() => setImageError(true)}
                        />

                    ) : (

                        <div className="profile-avatar profile-avatar-placeholder">
                            {profileInitial}
                        </div>

                    )}

                </div>


                <div className="profile-main-info">

                    <h1>{profile.name || 'User'}</h1>

                    <div className="profile-contact-info">
                        <span>✉ {profile.email}</span>
                        <span>📍 {profile.location || 'Location not added'}</span>
                    </div>

                    <p>{profile.bio || 'Welcome to my cooking profile!'}</p>

                </div>


                <button
                    className="profile-edit-button"
                    onClick={() => {
                        setFormData(profile);
                        setIsEditing(true);
                        setMessage('');
                    }}
                >
                    ✏ Edit Profile
                </button>

            </section>


            {/* Success / Error Message */}
            {message && (
                <div
                    className={
                        message.includes('successfully')
                            ? 'profile-message profile-success'
                            : 'profile-message profile-error'
                    }
                >
                    {message}
                </div>
            )}


            {/* Statistics */}
            <section className="profile-stats">

                <div className="profile-stat-card">
                    <div className="profile-stat-icon">🍲</div>
                    <h2>{availableRecipeCount}</h2>
                    <p>Available Recipes</p>
                </div>

                <div className="profile-stat-card">
                    <div className="profile-stat-icon">❤️</div>
                    <h2>{favoriteCount}</h2>
                    <p>My Favorites</p>
                </div>

                <div className="profile-stat-card">
                    <div className="profile-stat-icon">📍</div>
                    <h2 className="profile-stat-location">
                        {profile.location || 'Add Location'}
                    </h2>
                    <p>My Location</p>
                </div>

                <div className="profile-stat-card">
                    <div className="profile-stat-icon">👩‍🍳</div>
                    <h2>Food Lover</h2>
                    <p>My Cooking Journey</p>
                </div>

            </section>


            {/* Main Content */}
            <section className="profile-content-grid">

                {/* About Me */}
                <div className="profile-about-card">

                    <div className="profile-section-heading">
                        <span>👤</span>
                        <h2>About Me</h2>
                    </div>

                    <p className="profile-about-bio">
                        {profile.bio || 'Tell the community something about yourself.'}
                    </p>

                    <div className="profile-about-divider"></div>

                    <div className="profile-about-detail">
                        <span className="about-detail-icon">📍</span>
                        <div>
                            <strong>Location</strong>
                            <p>{profile.location || 'Not provided'}</p>
                        </div>
                    </div>

                    <div className="profile-about-detail">
                        <span className="about-detail-icon">✉️</span>
                        <div>
                            <strong>Email</strong>
                            <p>{profile.email || 'Not provided'}</p>
                        </div>
                    </div>

                    <div className="profile-about-divider"></div>

                    <div className="profile-interests">
                        <h3>👩‍🍳 Cooking Interests</h3>

                        <div className="interest-tags">
                            <span>Indian Cuisine</span>
                            <span>Healthy Food</span>
                            <span>Desserts</span>
                            <span>Quick Meals</span>
                        </div>
                    </div>

                </div>


                {/* Favorite Recipe Gallery */}
                <div className="profile-favorites-card">

                    <div className="profile-favorites-heading">

                        <div className="profile-section-heading">
                            <span>⭐</span>
                            <h2>My Favorite Recipes</h2>
                        </div>

                        <Link to="/favorites" className="profile-view-all">
                            View All →
                        </Link>

                    </div>


                    <div className="profile-recipe-gallery">

                        {favoriteRecipes.map(recipe => (

                            <Link
                                to="/recipes"
                                className="profile-recipe-card"
                                key={recipe.id}
                            >

                                <img
                                    src={recipe.image}
                                    alt={recipe.name}
                                    loading="lazy"
                                />

                                <div className="profile-recipe-info">

                                    <h3>{recipe.name}</h3>

                                    <div className="profile-recipe-rating">
                                        <span>⭐</span>
                                        {recipe.rating}
                                        <span className="recipe-heart">♡</span>
                                    </div>

                                </div>

                            </Link>

                        ))}

                    </div>

                </div>

            </section>


            {/* Footer Quote */}
            <div className="profile-quote">
                <span>♨</span>
                <p>“Cooking is love made visible.”</p>
                <span>♡</span>
            </div>


            {/* Edit Profile Modal */}
            {isEditing && (

                <div className="profile-modal-overlay">

                    <div className="profile-edit-modal">

                        <div className="profile-modal-heading">

                            <div>
                                <span>✏️</span>
                                <h2>Edit Your Profile</h2>
                                <p>Update your personal information</p>
                            </div>

                            <button
                                type="button"
                                className="profile-modal-close"
                                onClick={handleCancel}
                                aria-label="Close edit form"
                            >
                                ×
                            </button>

                        </div>


                        <form
                            className="profile-form"
                            onSubmit={handleSubmit}
                        >

                            <label htmlFor="name">Full Name</label>

                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Enter your name"
                            />

                            {errors.name && (
                                <span className="profile-field-error">
                                    {errors.name}
                                </span>
                            )}


                            <label htmlFor="email">Email Address</label>

                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Enter your email"
                            />

                            {errors.email && (
                                <span className="profile-field-error">
                                    {errors.email}
                                </span>
                            )}


                            <label htmlFor="location">Location</label>

                            <input
                                type="text"
                                id="location"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                placeholder="Enter your location"
                            />


                            <label htmlFor="bio">About Me</label>

                            <textarea
                                id="bio"
                                name="bio"
                                value={formData.bio}
                                onChange={handleChange}
                                placeholder="Tell us about yourself"
                                rows="3"
                            />


                            <label htmlFor="image">Profile Image URL</label>

                            <input
                                type="url"
                                id="image"
                                name="image"
                                value={formData.image}
                                onChange={handleChange}
                                placeholder="Paste your image URL"
                            />

                            {errors.image && (
                                <span className="profile-field-error">
                                    {errors.image}
                                </span>
                            )}


                            <div className="profile-form-actions">

                                <button
                                    type="submit"
                                    className="profile-save-button"
                                    disabled={isSaving}
                                >
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>

                                <button
                                    type="button"
                                    className="profile-cancel-button"
                                    onClick={handleCancel}
                                    disabled={isSaving}
                                >
                                    Cancel
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

        </div>

    );
}


export default Profile;