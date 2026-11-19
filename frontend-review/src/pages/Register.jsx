
import './Register.css';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { registerUser } from '../services/portalApi';

function Register() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const [errors, setErrors] = useState({});
    const [success, setSuccess] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

        setSuccess('');
    }

    function validateForm() {
        const newErrors = {};
        const name = formData.name.trim();
        const email = formData.email.trim();

        if (!name) {
            newErrors.name = 'Full name is required';
        } else if (name.length < 2) {
            newErrors.name = 'Name must contain at least 2 characters';
        }

        if (!email) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = 'Enter a valid email address';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must contain at least 8 characters';
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        return newErrors;
    }

    async function handleSubmit(e) {
        e.preventDefault();

        const newErrors = validateForm();
        setErrors(newErrors);
        setSuccess('');

        if (Object.keys(newErrors).length > 0) {
            return;
        }

        setIsLoading(true);

        try {
            const response = await registerUser({
                name: formData.name.trim(),
                email: formData.email.trim(),
                password: formData.password
            });

            setSuccess(
                response?.message ||
                'Account created successfully! Please log in.'
            );

            setFormData({
                name: '',
                email: '',
                password: '',
                confirmPassword: ''
            });

            setShowPassword(false);
            setShowConfirmPassword(false);

            setTimeout(() => {
                navigate('/login');
            }, 1500);

        } catch (error) {
            setSuccess(
                error.message || 'Registration failed. Please try again.'
            );
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="register-page">

            <div className="register-decoration decoration-one"></div>
            <div className="register-decoration decoration-two"></div>

            <div className="register-container">

                {/* LEFT HERO SECTION */}
                <section className="register-left">

                    <Link to="/" className="register-brand">
                        <span className="register-brand-icon">♨</span>

                        <span className="register-brand-name">
                            Cooking
                            <strong>Recipe Portal</strong>
                        </span>
                    </Link>

                    <div className="register-left-content">

                        <span className="register-eyebrow">
                            WELCOME TO OUR FOOD COMMUNITY
                        </span>

                        <h1>
                            Create Memories,
                            <span>Share Flavours!</span>
                        </h1>

                        <p className="register-description">
                            Join our food-loving community and discover
                            delicious recipes, share your cooking skills
                            and inspire people around the world.
                        </p>

                        {/* FEATURES */}
                        <div className="register-features">

                            <div className="register-feature">
                                <div className="register-feature-icon">♨</div>
                                <span>
                                    Explore<br />Recipes
                                </span>
                            </div>

                            <div className="register-feature">
                                <div className="register-feature-icon">♡</div>
                                <span>
                                    Save Your<br />Favorites
                                </span>
                            </div>

                            <div className="register-feature">
                                <div className="register-feature-icon">♣</div>
                                <span>
                                    Join Our<br />Community
                                </span>
                            </div>

                        </div>
                    </div>

                    {/* FOOD IMAGE */}
                    <div className="register-food-image">

                        <img
                            src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&auto=format&fit=crop&q=85"
                            alt="Fresh and colorful healthy food"
                            className="register-food-photo"
                        />

                        <div className="register-image-caption">
                            <span>Made with love ❤️</span>
                            <h3>Cook it. Share it. Inspire someone.</h3>
                        </div>

                    </div>

                    <p className="register-left-footer">
                        Every recipe tells a beautiful story.
                    </p>

                </section>

                {/* RIGHT REGISTRATION SECTION */}
                <section className="register-right">

                    <div className="register-top-text">
                        Cook <span>•</span> Share <span>•</span> Inspire
                    </div>

                    <div className="register-card">

                        <div className="register-card-logo">
                            ♨
                        </div>

                        <div className="register-heading">
                            <h2>Create Account!</h2>
                            <p>
                                Join our community and start your
                                culinary journey.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} noValidate>

                            {/* FULL NAME */}
                            <div className="register-field">

                                <label htmlFor="register-name">
                                    Full Name
                                </label>

                                <div className={`register-input-wrapper ${errors.name ? 'input-error' : ''}`}>

                                    <span className="register-input-icon">♟</span>

                                    <input
                                        id="register-name"
                                        type="text"
                                        name="name"
                                        placeholder="Enter your full name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        autoComplete="name"
                                        aria-invalid={Boolean(errors.name)}
                                    />

                                </div>

                                {errors.name && (
                                    <span className="register-error" role="alert">
                                        {errors.name}
                                    </span>
                                )}

                            </div>

                            {/* EMAIL */}
                            <div className="register-field">

                                <label htmlFor="register-email">
                                    Email Address
                                </label>

                                <div className={`register-input-wrapper ${errors.email ? 'input-error' : ''}`}>

                                    <span className="register-input-icon">✉</span>

                                    <input
                                        id="register-email"
                                        type="email"
                                        name="email"
                                        placeholder="Enter your email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        autoComplete="email"
                                        aria-invalid={Boolean(errors.email)}
                                    />

                                </div>

                                {errors.email && (
                                    <span className="register-error" role="alert">
                                        {errors.email}
                                    </span>
                                )}

                            </div>

                            {/* PASSWORD */}
                            <div className="register-field">

                                <label htmlFor="register-password">
                                    Password
                                </label>

                                <div className={`register-input-wrapper ${errors.password ? 'input-error' : ''}`}>

                                    <span className="register-input-icon">🔒</span>

                                    <input
                                        id="register-password"
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        placeholder="Create a password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        autoComplete="new-password"
                                        aria-invalid={Boolean(errors.password)}
                                    />

                                    <button
                                        type="button"
                                        className="register-password-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? 'Hide' : 'Show'}
                                    </button>

                                </div>

                                {errors.password && (
                                    <span className="register-error" role="alert">
                                        {errors.password}
                                    </span>
                                )}

                            </div>

                            {/* CONFIRM PASSWORD */}
                            <div className="register-field">

                                <label htmlFor="confirm-password">
                                    Confirm Password
                                </label>

                                <div className={`register-input-wrapper ${errors.confirmPassword ? 'input-error' : ''}`}>

                                    <span className="register-input-icon">🔒</span>

                                    <input
                                        id="confirm-password"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        name="confirmPassword"
                                        placeholder="Confirm your password"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        autoComplete="new-password"
                                        aria-invalid={Boolean(errors.confirmPassword)}
                                    />

                                    <button
                                        type="button"
                                        className="register-password-toggle"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? 'Hide' : 'Show'}
                                    </button>

                                </div>

                                {errors.confirmPassword && (
                                    <span className="register-error" role="alert">
                                        {errors.confirmPassword}
                                    </span>
                                )}

                            </div>

                            {/* PASSWORD VISIBILITY CHECKBOXES */}
                            <div className="register-password-options">

                                <label>
                                    <input
                                        type="checkbox"
                                        checked={showPassword}
                                        onChange={(e) =>
                                            setShowPassword(e.target.checked)
                                        }
                                    />
                                    Show Password
                                </label>

                                <label>
                                    <input
                                        type="checkbox"
                                        checked={showConfirmPassword}
                                        onChange={(e) =>
                                            setShowConfirmPassword(e.target.checked)
                                        }
                                    />
                                    Show Confirm Password
                                </label>

                            </div>

                            {/* REGISTER BUTTON */}
                            <button
                                type="submit"
                                className="register-submit-btn"
                                disabled={isLoading}
                            >
                                {isLoading
                                    ? 'Creating Account...'
                                    : 'Create Account →'}
                            </button>

                            {/* SUCCESS / ERROR MESSAGE */}
                            {success && (
                                <p className="register-success" role="status">
                                    {success}
                                </p>
                            )}

                        </form>

                        {/* DIVIDER */}
                        <div className="register-divider">
                            <span></span>
                            <p>Welcome to our kitchen</p>
                            <span></span>
                        </div>

                        {/* LOGIN LINK */}
                        <div className="register-login-link">
                            <p>Already have an account?</p>

                            <Link to="/login">
                                Login Now →
                            </Link>
                        </div>

                        {/* FOOTER */}
                        <p className="register-bottom-text">
                            © 2026 Cooking Recipe Portal. Made with love ❤️
                        </p>

                    </div>

                </section>

            </div>

        </div>
    );
}

export default Register;
