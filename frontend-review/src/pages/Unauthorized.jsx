
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Unauthorized() {
    const { user } = useAuth();

    const displayName =
        user?.name ||
        user?.full_name ||
        user?.email?.split('@')[0] ||
        'User';

    return (
        <main className="container min-vh-100 d-flex justify-content-center align-items-center">
            <div className="card shadow border-0 rounded-4 text-center p-4 p-md-5"
                style={{ maxWidth: '550px', width: '100%' }}>

                <div className="mb-3">
                    <span className="display-1">🚫</span>
                </div>

                <h1 className="fw-bold text-danger mb-3">
                    403 - Access Denied
                </h1>

                <h4 className="fw-semibold mb-3">
                    Sorry, {displayName}!
                </h4>

                <p className="text-muted mb-4">
                    You don't have permission to access this page.
                    Please contact the administrator if you believe
                    this is a mistake.
                </p>

                <div className="d-flex flex-column flex-sm-row justify-content-center gap-3">
                    <Link
                        to="/dashboard"
                        className="btn btn-primary px-4"
                    >
                        Go to Dashboard
                    </Link>

                    <Link
                        to="/"
                        className="btn btn-outline-secondary px-4"
                    >
                        Back to Home
                    </Link>
                </div>

            </div>
        </main>
    );
}

export default Unauthorized;
