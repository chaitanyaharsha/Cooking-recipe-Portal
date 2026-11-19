
/* eslint-disable react-refresh/only-export-components */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState
} from 'react';

import {
    addFavorite,
    getFavorites,
    removeFavorite
} from '../services/portalApi';

import { useAuth } from './AuthContext';

const FavoritesContext = createContext(null);

const STATIC_FAVORITES_KEY = 'portalStaticFavorites';

function loadStaticFavorites() {
    try {
        const saved = JSON.parse(
            localStorage.getItem(STATIC_FAVORITES_KEY) || '[]'
        );

        return Array.isArray(saved)
            ? [...new Set(saved.map(String))]
            : [];
    } catch (error) {
        console.error('Unable to load static favorites:', error);
        return [];
    }
}

function saveStaticFavorites(ids) {
    try {
        localStorage.setItem(
            STATIC_FAVORITES_KEY,
            JSON.stringify(ids)
        );
    } catch (error) {
        console.error('Unable to save static favorites:', error);
    }
}

// Identify static and database recipes consistently
function getRecipeIdentity(recipeOrId) {
    if (recipeOrId === null || recipeOrId === undefined) {
        return '';
    }

    if (typeof recipeOrId === 'object') {
        if (recipeOrId.routeId) {
            return String(recipeOrId.routeId);
        }

        if (
            recipeOrId.isDatabaseRecipe === true ||
            recipeOrId.source === 'database'
        ) {
            const databaseId =
                recipeOrId.databaseId ?? recipeOrId.id;

            return databaseId !== undefined && databaseId !== null
                ? `db-${databaseId}`
                : '';
        }

        if (recipeOrId.id !== undefined) {
            return String(recipeOrId.id);
        }
    }

    return String(recipeOrId);
}

function isDatabaseIdentity(identity) {
    return (
        identity.startsWith('db-') ||
        identity.startsWith('database-')
    );
}

function getDatabaseId(identity) {
    return identity.replace(/^(db-|database-)/, '');
}

export function FavoritesProvider({ children }) {
    const { user, token } = useAuth();

    const [databaseFavorites, setDatabaseFavorites] = useState([]);
    const [staticFavoriteIds, setStaticFavoriteIds] = useState(
        loadStaticFavorites
    );

    const [favoritesLoading, setFavoritesLoading] = useState(false);

    const isAuthenticated = Boolean(token && user);

    // Reload static favorites from localStorage
    const refreshStaticFavorites = useCallback(() => {
        setStaticFavoriteIds(loadStaticFavorites());
    }, []);

    // Load database favorites from FastAPI
    const refreshFavorites = useCallback(async () => {
        if (!isAuthenticated) {
            setDatabaseFavorites([]);
            setFavoritesLoading(false);
            return [];
        }

        setFavoritesLoading(true);

        try {
            const data = await getFavorites();

            const rows = Array.isArray(data) ? data : [];

            setDatabaseFavorites(rows);

            return rows;
        } catch (error) {
            console.error('Could not load database favorites:', error);
            throw error;
        } finally {
            setFavoritesLoading(false);
        }
    }, [isAuthenticated]);

    // Refresh database favorites whenever authentication changes
    useEffect(() => {
        if (isAuthenticated) {
            refreshFavorites().catch(error =>
                console.error('Could not refresh favorites:', error)
            );
        } else {
            setDatabaseFavorites([]);
            setFavoritesLoading(false);
        }
    }, [isAuthenticated, refreshFavorites]);

    // Listen for favorite changes
    useEffect(() => {
        const handleFavoritesUpdate = () => {
            refreshStaticFavorites();

            if (isAuthenticated) {
                refreshFavorites().catch(error =>
                    console.error('Could not refresh favorites:', error)
                );
            }
        };

        window.addEventListener(
            'favorites-updated',
            handleFavoritesUpdate
        );

        window.addEventListener(
            'storage',
            handleFavoritesUpdate
        );

        return () => {
            window.removeEventListener(
                'favorites-updated',
                handleFavoritesUpdate
            );

            window.removeEventListener(
                'storage',
                handleFavoritesUpdate
            );
        };
    }, [
        isAuthenticated,
        refreshFavorites,
        refreshStaticFavorites
    ]);

    // Combine database and static favorite identities
    const favoriteIds = useMemo(() => {
        const databaseIds = databaseFavorites.map(
            recipe => `db-${recipe.id}`
        );

        return [
            ...new Set([
                ...staticFavoriteIds,
                ...databaseIds
            ])
        ];
    }, [databaseFavorites, staticFavoriteIds]);

    // Check whether a recipe is already a favorite
    const isFavorite = useCallback((recipeOrId) => {
        const identity = getRecipeIdentity(recipeOrId);

        if (!identity) {
            return false;
        }

        if (isDatabaseIdentity(identity)) {
            return favoriteIds.includes(identity);
        }

        return staticFavoriteIds.includes(identity);
    }, [favoriteIds, staticFavoriteIds]);

    // Add or remove a favorite
    const toggleFavorite = useCallback(async (recipeOrId) => {
        const identity = getRecipeIdentity(recipeOrId);

        if (!identity) {
            throw new Error('Invalid recipe.');
        }

        // Database recipe: save/remove through FastAPI and MySQL
        if (isDatabaseIdentity(identity)) {
            if (!isAuthenticated) {
                throw new Error(
                    'Please log in to save database recipes.'
                );
            }

            const databaseId = Number(getDatabaseId(identity));

            if (!Number.isInteger(databaseId) || databaseId <= 0) {
                throw new Error('Invalid database recipe ID.');
            }

            const alreadyFavorite = favoriteIds.includes(identity);

            if (alreadyFavorite) {
                await removeFavorite(databaseId);

                setDatabaseFavorites(current =>
                    current.filter(
                        recipe => Number(recipe.id) !== databaseId
                    )
                );
            } else {
                await addFavorite(databaseId);

                await refreshFavorites();
            }
        } else {
            // Static and moderator-approved local recipes
            setStaticFavoriteIds(current => {
                const alreadyFavorite = current.includes(identity);

                const updated = alreadyFavorite
                    ? current.filter(id => id !== identity)
                    : [...current, identity];

                saveStaticFavorites(updated);

                return updated;
            });
        }

        // Notify other components
        window.dispatchEvent(
            new Event('favorites-updated')
        );
    }, [
        isAuthenticated,
        favoriteIds,
        refreshFavorites
    ]);

    // Combine database favorite objects and static favorite identities
    const favorites = useMemo(() => {
        const databaseItems = databaseFavorites.map(recipe => ({
            ...recipe,
            routeId: `db-${recipe.id}`,
            isDatabaseRecipe: true
        }));

        return [
            ...databaseItems,
            ...staticFavoriteIds
        ];
    }, [databaseFavorites, staticFavoriteIds]);

    return (
        <FavoritesContext.Provider
            value={{
                favorites,
                favoriteIds,
                databaseFavorites,
                staticFavoriteIds,
                favoritesLoading,
                isFavorite,
                toggleFavorite,
                refreshFavorites,
                refreshStaticFavorites
            }}
        >
            {children}
        </FavoritesContext.Provider>
    );
}

export function useFavorites() {
    const context = useContext(FavoritesContext);

    if (!context) {
        throw new Error(
            'useFavorites must be used inside FavoritesProvider'
        );
    }

    return context;
}
