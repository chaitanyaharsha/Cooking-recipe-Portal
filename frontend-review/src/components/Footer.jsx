
import { Link } from 'react-router-dom';
import './Footer.css';

function Footer() {
    return (
        <footer className="premium-footer">
            <div className="footer-main">

                <div className="footer-brand">
                    <Link to="/" className="footer-logo">
                        <span className="footer-logo-icon">🍲</span>
                        <span>
                            <strong>Recipe Portal</strong>
                            <small>COOK • SHARE • ENJOY</small>
                        </span>
                    </Link>

                    <p>
                        Discover delicious recipes, explore new flavours
                        and bring happiness to your kitchen.
                    </p>

                    <div className="footer-socials">
                        <span>❤️ Made with love</span>
                        <span>🍽️ Made for food lovers</span>
                    </div>
                </div>

                <div className="footer-links">
                    <h3>Explore</h3>
                    <Link to="/">Home</Link>
                    <Link to="/recipes">Explore Recipes</Link>
                    <Link to="/favorites">Favorites</Link>
                    <Link to="/create-recipe">Share a Recipe</Link>
                </div>

                <div className="footer-links">
                    <h3>Your Kitchen</h3>
                    <Link to="/dashboard">Dashboard</Link>
                    <Link to="/profile">My Profile</Link>
                    <Link to="/my-recipes">My Recipes</Link>
                    <Link to="/my-reviews">My Reviews</Link>
                </div>

                <div className="footer-message">
                    <span className="footer-message-icon">🥗</span>
                    <h3>Good food brings people together.</h3>
                    <p>
                        Find your next favourite recipe and make
                        every meal a special moment.
                    </p>
                    <Link to="/recipes" className="footer-explore-btn">
                        Explore Recipes →
                    </Link>
                </div>

            </div>

            <div className="footer-bottom">
                <p>© 2026 Recipe Portal. All rights reserved.</p>
                <p>Cook with passion. Share with love. ❤️</p>
            </div>
        </footer>
    );
}

export default Footer;
