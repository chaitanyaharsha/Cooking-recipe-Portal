
/* eslint-disable react-refresh/only-export-components */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState
} from 'react';

import { getMyProfile } from '../services/portalApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {

    // Restore saved user information
    const [user, setUser] = useState(() => {
        try {
            const savedUser = localStorage.getItem('portalUser');
            return savedUser ? JSON.parse(savedUser) : null;
        } catch {
            localStorage.removeItem('portalUser');
            return null;
        }
    });

    // Restore authentication token
    const [token, setToken] = useState(
        () => localStorage.getItem('portalToken')
    );

    const [authLoading, setAuthLoading] = useState(
        () => Boolean(localStorage.getItem('portalToken'))
    );

    // Save authenticated user and token
    const saveSession = useCallback((profile, accessToken) => {

        if (!profile || !accessToken) {
            throw new Error('Invalid authentication information.');
        }

        const userData = {
            id: profile.id,
            name: profile.display_name,
            username: profile.display_name,
            display_name: profile.display_name,
            email: profile.email,
            role: profile.role,
            status: profile.status,
            avatar_url: profile.avatar_url || null,
            bio: profile.bio || null
        };

        localStorage.setItem(
            'portalUser',
            JSON.stringify(userData)
        );

        localStorage.setItem(
            'portalToken',
            accessToken
        );

        setUser(userData);
        setToken(accessToken);

        return userData;
    }, []);

    // Login after successful backend authentication
    const loginWithToken = useCallback((profile, accessToken) => {
        return saveSession(profile, accessToken);
    }, [saveSession]);

    // Logout and clear authentication information
    const logout = useCallback(() => {

        localStorage.removeItem('portalUser');
        localStorage.removeItem('portalToken');

        setUser(null);
        setToken(null);

        setAuthLoading(false);

    }, []);

    // Refresh current user's profile from FastAPI
    const refreshProfile = useCallback(async () => {

        const currentToken = localStorage.getItem('portalToken');

        if (!currentToken) {
            logout();
            return null;
        }

        try {
            const profile = await getMyProfile();

            return saveSession(profile, currentToken);

        } catch (error) {
            logout();
            throw error;
        }

    }, [saveSession, logout]);

    // Restore and validate existing login session
    useEffect(() => {

        let active = true;

        async function restoreSession() {

            const savedToken = localStorage.getItem('portalToken');

            if (!savedToken) {
                if (active) {
                    setUser(null);
                    setToken(null);
                    setAuthLoading(false);
                }
                return;
            }

            try {

                const profile = await getMyProfile();

                if (active) {
                    saveSession(profile, savedToken);
                }

            } catch (error) {

                if (active) {
                    localStorage.removeItem('portalUser');
                    localStorage.removeItem('portalToken');

                    setUser(null);
                    setToken(null);
                }

            } finally {

                if (active) {
                    setAuthLoading(false);
                }

            }
        }

        restoreSession();

        return () => {
            active = false;
        };

    }, [saveSession]);

    const contextValue = {
        user,
        token,
        authLoading,
        isAuthenticated: Boolean(user && token),
        loginWithToken,
        logout,
        refreshProfile
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

// Custom hook to access authentication
export function useAuth() {

    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            'useAuth must be used inside AuthProvider'
        );
    }

    return context;
}
