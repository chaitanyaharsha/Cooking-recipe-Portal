
import './Login.css';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { loginUser, getMyProfile } from '../services/portalApi';
import { useAuth } from '../context/AuthContext';

function Login() {
    const navigate = useNavigate();
    const { loginWithToken } = useAuth();

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

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
    }

    function validateForm() {
        const newErrors = {};
        const email = formData.email.trim();
        const password = formData.password;

        if (!email) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (!password.trim()) {
            newErrors.password = 'Password is required';
        } else if (password.length < 8) {
            newErrors.password = 'Password must contain at least 8 characters';
        }

        return newErrors;
    }

    async function handleSubmit(e) {
        e.preventDefault();

        const newErrors = validateForm();
        setErrors(newErrors);
        setMessage('');

        if (Object.keys(newErrors).length > 0) {
            return;
        }

        setIsLoading(true);

        try {
            // Authenticate using FastAPI
            const response = await loginUser({
                email: formData.email.trim(),
                password: formData.password
            });

            if (!response || !response.access_token) {
                throw new Error('Access token was not received from the server.');
            }

            const token = response.access_token;

            // Temporarily save token so getMyProfile can use it
            localStorage.setItem('portalToken', token);

            // Fetch the authenticated user's profile
            const profile = await getMyProfile();

            // Save authenticated session in AuthContext
            loginWithToken(profile, token);

            setMessage('Login successful!');

            // Redirect according to the user's actual backend role
            if (profile.role === 'admin') {
                navigate('/admin-dashboard', { replace: true });
            } else if (profile.role === 'moderator') {
                navigate('/moderator-dashboard', { replace: true });
            } else {
                navigate('/', { replace: true });
            }

        } catch (error) {
            localStorage.removeItem('portalToken');
            localStorage.removeItem('portalUser');

            setMessage(
                error.message || 'Login failed. Please check your credentials.'
            );
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="login-page">

            {/* Decorative background */}
            <div className="login-decoration login-decoration-one"></div>
            <div className="login-decoration login-decoration-two"></div>

            <div className="login-container">

                {/* LEFT SIDE */}
                <section className="login-left">

                    <Link to="/" className="login-brand">
                        <span className="brand-icon">♨</span>
                        <span className="brand-name">
                            Cooking
                            <strong>Recipe Portal</strong>
                        </span>
                    </Link>

                    <div className="login-left-content">
                        <span className="login-eyebrow">
                            WELCOME TO OUR FOOD COMMUNITY
                        </span>

                        <h1>
                            Good Food,
                            <span>Good Mood!</span>
                        </h1>

                        <p className="login-description">
                            Discover, share and enjoy amazing recipes
                            from food lovers around the world.
                        </p>

                        <div className="login-features">

                            <div className="login-feature">
                                <span className="feature-icon">♨</span>
                                <span>Explore<br />Recipes</span>
                            </div>

                            <div className="login-feature">
                                <span className="feature-icon">♡</span>
                                <span>Save Your<br />Favorites</span>
                            </div>

                            <div className="login-feature">
                                <span className="feature-icon">♧</span>
                                <span>Join Our<br />Community</span>
                            </div>

                        </div>
                    </div>

                    <div className="login-food-image">
                        <img
                            src="https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=1000&auto=format&fit=crop&q=85"
                            alt="Delicious pasta dish"
                        />
                        <div className="food-image-caption">
                            <span>Made with love ❤️</span>
                            <h3>Cook it. Share it. Inspire someone.</h3>
                        </div>
                    </div>

                    <div className="login-left-footer">
                        A little spice, a lot of love!
                    </div>

                </section>

                {/* RIGHT SIDE */}
                <section className="login-right">

                    <div className="login-top-text">
                        <span>Cook</span>
                        <span className="top-dot">•</span>
                        <span>Share</span>
                        <span className="top-dot">•</span>
                        <span>Inspire</span>
                        <span className="top-heart">♡</span>
                    </div>

                    <div className="login-card">

                        <div className="login-card-logo">
                            ♨
                        </div>

                        <div className="login-heading">
                            <h2>Welcome Back!</h2>
                            <p>
                                Login to your account and continue
                                your culinary journey.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} noValidate>

                            {/* EMAIL */}
                            <div className="login-field">
                                <label htmlFor="login-email">
                                    Email Address
                                </label>

                                <div className={`login-input-wrapper ${errors.email ? 'input-error' : ''}`}>
                                    <span className="input-icon">✉</span>

                                    <input
                                        id="login-email"
                                        type="email"
                                        name="email"
                                        placeholder="Enter your email address"
                                        value={formData.email}
                                        onChange={handleChange}
                                        autoComplete="email"
                                        aria-invalid={Boolean(errors.email)}
                                        aria-describedby={
                                            errors.email ? 'login-email-error' : undefined
                                        }
                                    />
                                </div>

                                {errors.email && (
                                    <span
                                        id="login-email-error"
                                        className="error"
                                        role="alert"
                                    >
                                        {errors.email}
                                    </span>
                                )}
                            </div>

                            {/* PASSWORD */}
                            <div className="login-field">
                                <label htmlFor="login-password">
                                    Password
                                </label>

                                <div className={`login-input-wrapper ${errors.password ? 'input-error' : ''}`}>
                                    <span className="input-icon">🔒</span>

                                    <input
                                        id="login-password"
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        placeholder="Enter your password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        autoComplete="current-password"
                                        aria-invalid={Boolean(errors.password)}
                                        aria-describedby={
                                            errors.password ? 'login-password-error' : undefined
                                        }
                                    />

                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowPassword(prev => !prev)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? 'Hide' : 'Show'}
                                    </button>
                                </div>

                                {errors.password && (
                                    <span
                                        id="login-password-error"
                                        className="error"
                                        role="alert"
                                    >
                                        {errors.password}
                                    </span>
                                )}
                            </div>

                            {/* SHOW PASSWORD */}
                            <div className="show-password">
                                <input
                                    id="show-login-password"
                                    type="checkbox"
                                    checked={showPassword}
                                    onChange={(e) => setShowPassword(e.target.checked)}
                                />

                                <label htmlFor="show-login-password">
                                    Show Password
                                </label>
                            </div>

                            {/* LOGIN BUTTON */}
                            <button
                                type="submit"
                                className="login-submit-btn"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Please wait...' : 'Login'}
                                {!isLoading && <span> →</span>}
                            </button>

                            {/* MESSAGE */}
                            {message && (
                                <p className="login-message" role="status">
                                    {message}
                                </p>
                            )}

                        </form>

                        <div className="login-divider">
                            <span></span>
                            <p>Welcome to our kitchen</p>
                            <span></span>
                        </div>

                        <div className="register-link">
                            <p>Don't have an account?</p>
                            <Link to="/register">
                                Register Now →
                            </Link>
                        </div>

                    </div>

                    <div className="login-bottom-text">
                        © 2026 Cooking Recipe Portal. Made with ♡
                    </div>

                </section>

            </div>
        </div>
    );
}

export default Login;
