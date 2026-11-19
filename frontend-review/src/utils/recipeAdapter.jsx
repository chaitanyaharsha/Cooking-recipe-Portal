
import { getImageUrl } from '../api';

// Convert FastAPI RecipeResponse into the shape used by the UI.
export function mapBackendRecipe(recipe, categories = []) {
    if (!recipe) return null;

    const category = categories.find(
        item => Number(item.id) === Number(recipe.category_id)
    );

    const prep = Number(recipe.prep_time_minutes || 0);
    const cook = Number(recipe.cook_time_minutes || 0);
    const total = prep + cook;

    return {
        ...recipe,
        id: Number(recipe.id),
        routeId: `db-${recipe.id}`,
        name: recipe.title,
        title: recipe.title,
        category: category?.name || 'Uncategorized',
        categoryId: recipe.category_id,
        image: getImageUrl(recipe.image_url),
        cookingTime: total ? `${total} min` : 'Not specified',
        time: total ? `${total} min` : '',
        preparationTime: prep ? `${prep} min` : '',
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        ingredients: (recipe.ingredients || []).map(item => ({
            ...item,
            name: item.ingredient_name,
        })),
        instructions: (recipe.steps || [])
            .slice()
            .sort((a, b) => a.step_number - b.step_number)
            .map(step => step.instruction),
        author: recipe.author_name || 'Community Member',
        dietaryTags: recipe.tags || [],
        isBackendRecipe: true,
    };
}

// Combine static and backend recipes without ID collisions.
export function mergeRecipeLists(
    staticRecipes = [],
    backendRecipes = []
) {
    const merged = [
        ...backendRecipes,
        ...staticRecipes
    ];

    const seen = new Set();

    return merged.filter(recipe => {
        const id = recipe?.id;

        if (id === undefined || id === null || id === '') {
            return false;
        }

        const source = recipe.isBackendRecipe
            ? 'backend'
            : 'static';

        const key = `${source}-${String(id)}`;

        if (seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });
}
