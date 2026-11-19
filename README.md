# Cooking Recipe Portal

A responsive web-based Cooking Recipe Portal built using React and Vite.

## Features

- User Registration and Login
- Explore Recipes
- Search, Filter and Sort Recipes
- Recipe Details
- Create and Manage Recipes
- Ingredients and Cooking Instructions
- Favorites
- User Dashboard
- User Profile
- Reviews and Ratings
- Notifications
- Admin Dashboard
- Category Management
- Moderator Dashboard
- Reports and Review Management

## Important Notes

### 1. Admin Credentials
- **Email:** `testuser@example.con`
- **Password:** Shared separately
- **Role:** Admin

### 2. Moderator Credentials
- **Email:** `moderator@example.com`
- **Password:** Shared separately
- **Role:** Moderator
- **Responsibility:** The moderator reviews submitted recipes and approves or rejects them before they are published.

### 3. Recipe Information
- The application contains both **static recipes** and **backend-integrated recipes**.
- Static recipes are hardcoded into the frontend.
- Backend recipes are added dynamically through the backend.
- Some backend recipes currently do not have images.
- Images can be uploaded and added to backend recipes through the available backend functionality.

## Technologies Used

- React.js
- JavaScript
- HTML
- CSS
- Vite
- React Router DOM
- Local Storage

## Installation

1. Clone the repository.
2. Open the frontend folder.
3. Install dependencies:

```bash
npm install
```

4. Start the development server:

```bash
npm run dev
```

5. Open the localhost URL displayed in the terminal.

## Project Status

The frontend and backend have been integrated. The application supports recipe management, user authentication, moderation, favorites, reviews, ratings, and administrative features. Some frontend features may still require further API integration and testing.

## FrontEnd Developer

Joshni Thota

# Cooking Recipe Portal – API integration package

This package uses the **updated `recipe_portal-main` frontend UI** and the API contract found in the supplied FastAPI backend (`backend/app/main.py`, `backend/app/api`, and `backend/app/schemas`).

## Files included
- `src/api.js`: common fetch helper, JWT header, error handling, image URL helper.
- `src/services/portalApi.js`: named functions for every backend route family.
- `src/context/AuthContext.jsx`: token-based login, session restore, logout.
- `src/context/FavoritesContext.jsx`: database favorites for numeric recipe IDs; static sample recipe IDs remain local because `/favorites` only supports database recipe IDs.
- `src/pages/Login.jsx` and `src/pages/Register.jsx`: updated UI retained; forms now call FastAPI.
- `src/utils/recipeAdapter.js`: translates between backend recipe schema and updated UI recipe shape.
- All other updated frontend pages, components, assets and CSS are included unchanged from the updated frontend archive.

## Install / copy
1. Stop Vite.
2. Back up your previous frontend folder.
3. Copy this package's `src` folder into the previous frontend folder, replacing its `src` folder.
4. Keep the existing `package.json` and `package-lock.json`.
5. Create/update frontend `.env`:
   `VITE_API_BASE_URL=http://127.0.0.1:8000`
6. Start FastAPI from the backend folder, then run `npm run dev` in frontend.

## Actual backend route map

| UI area | API functions |
|---|---|
| Login / Register | `loginUser`, `registerUser`, `getMyProfile` |
| Profile | `getMyProfile`, `updateMyProfile` |
| Explore | `getRecipes`, `getCategories`, `getTags` |
| Recipe detail | `getRecipe`, `getRecipeTags`, `getRecipeReviews`, `getRatingSummary`, `getMyRating` |
| Create / edit recipe | `createRecipe`, `updateRecipe`, `uploadRecipeImage`, `submitRecipe`, `assignRecipeTag` |
| My recipes / drafts | `getMyRecipes`, `updateRecipe`, `deleteRecipe`, `submitRecipe` |
| Favorites | `getFavorites`, `addFavorite`, `removeFavorite` |
| Reviews | `createReview`, `updateReview`, `deleteReview`, `getMyReviews` |
| Ratings | `createRating`, `updateRating`, `deleteRating` |
| Categories / tags | CRUD functions for categories and tags |
| Featured recipes | `getFeaturedRecipes`, `getAdminFeaturedRecipes`, `setRecipeFeatured` |
| Moderator | `getPendingRecipes`, `approveRecipe`, `rejectRecipe`, `getModerationStats`, `getModerationHistory` |
| Reports | `getReports`, `getReviewReports`, `reportRecipe`, `reportReview`, `resolveReport` |
| Admin | `getAllUsers`, `createModerator`, `updateUserStatus`, `deleteUser`, `getAdminSettings`, `updateAdminSettings`, `getAdminAnalytics`, `getAuditLogs` |

## Important backend contract notes
- Login returns `{access_token, token_type}`. The client then calls `/users/me` to retrieve the profile.
- Register payload is `{display_name, email, password}`.
- Recipe create/update payload must use `title`, `category_id`, `image_url`, `prep_time_minutes`, `cook_time_minutes`, `servings`, `difficulty`, `ingredients: [{ingredient_name, quantity, unit}]`, and `steps: [{step_number, instruction}]`.
- Recipe list returns a paginated object: `{items, total, page, page_size, total_pages}`. Do not treat it as a bare array.
- Image upload uses `FormData` with field name `file`; do not manually set multipart Content-Type.
- `/favorites` only accepts persisted integer recipe IDs, not the static sample recipes bundled in `src/data/recipes.js`.
- Review visibility is admin-only and takes `is_hidden` as a required query parameter.
- The backend has no notifications endpoints or notification model in the supplied source. Notifications UI cannot persist to backend without a backend feature being added.
- Some updated UI pages still contain demo/localStorage data and need their component event handlers/data loaders to be wired to the named functions in `src/services/portalApi.js`. The package intentionally preserves those pages' markup/CSS rather than silently replacing their new design with the old integrated UI. The service layer covers the backend APIs, but this does **not** claim every page has been live-tested or fully wired merely by copying the package.

## Page wiring pattern (use inside the existing page component; retain its JSX)
```jsx
import { useEffect, useState } from "react";
import { getRecipes } from "../services/portalApi";
import { toUiRecipe } from "../utils/recipeAdapter";

const [recipes, setRecipes] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

useEffect(() => {
  let active = true;
  getRecipes({ page: 1, page_size: 50 })
    .then(result => {
      if (active) setRecipes((result.items || []).map(item => toUiRecipe(item)));
    })
    .catch(err => { if (active) setError(err.message); })
    .finally(() => { if (active) setLoading(false); });
  return () => { active = false; };
}, []);
```

Do not paste the example hook into a component without removing/renaming any existing `recipes`, `loading`, or `error` state declarations.
## Backend Developer
Harsha Chaitanya
