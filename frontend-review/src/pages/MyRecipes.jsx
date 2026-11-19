
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api';
import { recipes as exploreRecipes } from '../data/recipes';
import './MyRecipes.css';

const dietaryOptions = [
    'Vegetarian',
    'Vegan',
    'Gluten-Free',
    'Dairy-Free',
    'Non-Vegetarian'
];

const allergenOptions = [
    'Milk',
    'Peanuts',
    'Tree Nuts',
    'Soy',
    'Wheat',
    'Eggs',
    'Fish',
    'Shellfish'
];

function isValidImage(image) {
    return (
        typeof image === 'string' &&
        (
            image.startsWith('data:image/') ||
            image.startsWith('http://') ||
            image.startsWith('https://')
        )
    );
}

function getRecipeImage(recipe) {
    if (!recipe) return '';

    const recipeName = (recipe.name || '').trim().toLowerCase();

    const exploreRecipe = exploreRecipes.find(
        (item) =>
            (item.name || '').trim().toLowerCase() === recipeName
    );

    if (exploreRecipe && isValidImage(exploreRecipe.image)) {
        return exploreRecipe.image;
    }

    if (isValidImage(recipe.image)) {
        return recipe.image;
    }

    const imageOptions = [
        {
            keywords: ['biryani'],
            image: 'https://images.unsplash.com/photo-1563379091339-03246963d51a?auto=format&fit=crop&w=700&q=85'
        },
        {
            keywords: ['dosa'],
            image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=700&q=85'
        },
        {
            keywords: ['cake', 'brownie'],
            image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=700&q=85'
        },
        {
            keywords: ['paneer'],
            image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=700&q=85'
        },
        {
            keywords: ['mango', 'ice cream'],
            image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=700&q=85'
        },
        {
            keywords: ['chicken'],
            image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=700&q=85'
        }
    ];

    const matchedImage = imageOptions.find((option) =>
        option.keywords.some((keyword) => recipeName.includes(keyword))
    );

    return matchedImage?.image || '';
}

function MyRecipes() {
    const { user } = useAuth();

    const [myRecipes, setMyRecipes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [filter, setFilter] = useState('All');
    const [editingRecipe, setEditingRecipe] = useState(null);
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Reference to the edit form
    const editFormRef = useRef(null);

    // Scroll to the edit form whenever a recipe is selected
    useEffect(() => {
        if (editingRecipe && editFormRef.current) {
            editFormRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }, [editingRecipe]);

    // Load recipes from backend
    async function loadRecipes() {
        try {
            setIsLoading(true);

            const [recipeResponse, categoryResponse] = await Promise.all([
                apiRequest('/recipes/my-recipes'),
                apiRequest('/categories')
            ]);

            const recipeData = Array.isArray(recipeResponse)
                ? recipeResponse
                : recipeResponse?.items || [];

            const categoryData = Array.isArray(categoryResponse)
                ? categoryResponse
                : categoryResponse?.items || [];

            setCategories(categoryData);

            const formattedRecipes = recipeData.map((recipe) => ({
                id: recipe.id,
                name: recipe.title,
                category:
                    categoryData.find(
                        (category) => category.id === recipe.category_id
                    )?.name || 'Unknown',
                category_id: recipe.category_id,
                status: {
                    published: 'Approved',
                    pending: 'Pending',
                    draft: 'Draft',
                    rejected: 'Rejected'
                }[recipe.status] || recipe.status,
                description: recipe.description || '',
                cookingTime:
                    recipe.cook_time_minutes ||
                    recipe.prep_time_minutes ||
                    '',
                image: recipe.image_url || '',
                dietaryTags: [],
                allergens: [],
                ingredients: (recipe.ingredients || []).map((item) => ({
                    name: item.ingredient_name,
                    quantity: item.quantity || '',
                    unit: item.unit || '',
                    preparationNote: ''
                })),
                instructions: (recipe.steps || [])
                    .sort((a, b) => a.step_number - b.step_number)
                    .map((step) => step.instruction),
                reason:
                    recipe.rejection_reason ||
                    recipe.moderator_comments ||
                    ''
            }));

            setMyRecipes(formattedRecipes);
        } catch (error) {
            setMessage(error.message || 'Unable to load your recipes.');
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        loadRecipes();
    }, []);

    const filteredRecipes = myRecipes.filter((recipe) => {
        if (filter === 'All') return true;
        return recipe.status === filter;
    });

    const statusCounts = {
        All: myRecipes.length,
        Draft: myRecipes.filter((recipe) => recipe.status === 'Draft').length,
        Pending: myRecipes.filter((recipe) => recipe.status === 'Pending').length,
        Approved: myRecipes.filter((recipe) => recipe.status === 'Approved').length,
        Rejected: myRecipes.filter((recipe) => recipe.status === 'Rejected').length
    };

    // Delete recipe from backend
    async function deleteRecipe(id) {
        const confirmDelete = window.confirm(
            'Are you sure you want to delete this recipe?'
        );

        if (!confirmDelete) return;

        try {
            await apiRequest(`/recipes/${id}`, {
                method: 'DELETE'
            });

            setMyRecipes((previousRecipes) =>
                previousRecipes.filter(
                    (recipe) => String(recipe.id) !== String(id)
                )
            );

            setMessage('Recipe deleted successfully!');
        } catch (error) {
            setMessage(error.message || 'Unable to delete recipe.');
        }
    }

    // Open edit form for the selected recipe
    function handleEdit(recipe) {
        setEditingRecipe({
            ...recipe,
            cookingTime: recipe.cookingTime || recipe.time || '',
            ingredients: (recipe.ingredients || []).map((item) =>
                typeof item === 'string'
                    ? {
                        name: item,
                        quantity: '',
                        unit: '',
                        preparationNote: ''
                    }
                    : { ...item }
            ),
            instructions: (recipe.instructions || []).map((step) =>
                typeof step === 'string'
                    ? step
                    : step.instruction || step.text || ''
            ),
            image: recipe.image || '',
            imageFile: null,
            dietaryTags: Array.isArray(recipe.dietaryTags)
                ? [...recipe.dietaryTags]
                : [],
            allergens: Array.isArray(recipe.allergens)
                ? [...recipe.allergens]
                : []
        });

        setMessage('');
    }

    function handleChange(e) {
        const { name, value } = e.target;

        setEditingRecipe((previous) => ({
            ...previous,
            [name]: value
        }));
    }

    function handleDietaryChange(tag) {
        setEditingRecipe((previous) => {
            const currentTags = previous.dietaryTags || [];

            return {
                ...previous,
                dietaryTags: currentTags.includes(tag)
                    ? currentTags.filter((item) => item !== tag)
                    : [...currentTags, tag]
            };
        });
    }

    function handleAllergenChange(allergen) {
        setEditingRecipe((previous) => {
            const currentAllergens = previous.allergens || [];

            return {
                ...previous,
                allergens: currentAllergens.includes(allergen)
                    ? currentAllergens.filter((item) => item !== allergen)
                    : [...currentAllergens, allergen]
            };
        });
    }

    // Upload and preview recipe image
    function handleImageChange(e) {
        const file = e.target.files[0];

        if (!file) return;

        const allowedTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp'
        ];

        if (!allowedTypes.includes(file.type)) {
            setMessage('Please select a JPG, JPEG, PNG, or WEBP image.');
            e.target.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setMessage('Image size must be less than 5 MB.');
            e.target.value = '';
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            setEditingRecipe((previous) => ({
                ...previous,
                image: reader.result,
                imageFile: file
            }));

            setMessage('Image selected successfully!');
        };

        reader.onerror = () => {
            setMessage('Unable to read the selected image.');
        };

        reader.readAsDataURL(file);
        e.target.value = '';
    }

    function removeRecipeImage() {
        setEditingRecipe((previous) => ({
            ...previous,
            image: '',
            imageFile: null
        }));

        setMessage('Image removed. Save your changes to confirm.');
    }

    // Ingredient editor functions
    function handleIngredientChange(index, field, value) {
        setEditingRecipe((previous) => {
            const updatedIngredients = [...previous.ingredients];

            updatedIngredients[index] = {
                ...updatedIngredients[index],
                [field]: value
            };

            return {
                ...previous,
                ingredients: updatedIngredients
            };
        });
    }

    function addIngredient() {
        setEditingRecipe((previous) => ({
            ...previous,
            ingredients: [
                ...previous.ingredients,
                {
                    name: '',
                    quantity: '',
                    unit: '',
                    preparationNote: ''
                }
            ]
        }));
    }

    function deleteIngredient(index) {
        setEditingRecipe((previous) => ({
            ...previous,
            ingredients: previous.ingredients.filter(
                (_, i) => i !== index
            )
        }));
    }

    function moveIngredient(index, direction) {
        setEditingRecipe((previous) => {
            const updated = [...previous.ingredients];
            const newIndex = index + direction;

            if (newIndex < 0 || newIndex >= updated.length) {
                return previous;
            }

            [updated[index], updated[newIndex]] =
                [updated[newIndex], updated[index]];

            return {
                ...previous,
                ingredients: updated
            };
        });
    }

    // Instruction editor functions
    function handleInstructionChange(index, value) {
        setEditingRecipe((previous) => {
            const updatedInstructions = [...previous.instructions];
            updatedInstructions[index] = value;

            return {
                ...previous,
                instructions: updatedInstructions
            };
        });
    }

    function addInstruction() {
        setEditingRecipe((previous) => ({
            ...previous,
            instructions: [...previous.instructions, '']
        }));
    }

    function deleteInstruction(index) {
        setEditingRecipe((previous) => ({
            ...previous,
            instructions: previous.instructions.filter(
                (_, i) => i !== index
            )
        }));
    }

    function moveInstruction(index, direction) {
        setEditingRecipe((previous) => {
            const updated = [...previous.instructions];
            const newIndex = index + direction;

            if (newIndex < 0 || newIndex >= updated.length) {
                return previous;
            }

            [updated[index], updated[newIndex]] =
                [updated[newIndex], updated[index]];

            return {
                ...previous,
                instructions: updated
            };
        });
    }

    // Save edited recipe to backend
    async function saveRecipe(e) {
        e.preventDefault();

        if (
            !editingRecipe.name.trim() ||
            !editingRecipe.category.trim() ||
            !editingRecipe.description.trim()
        ) {
            setMessage('Please fill in all required recipe fields.');
            return;
        }

        if (
            !editingRecipe.cookingTime ||
            !Number.isFinite(Number(editingRecipe.cookingTime)) ||
            Number(editingRecipe.cookingTime) <= 0
        ) {
            setMessage('Please enter a valid cooking time.');
            return;
        }

        const validIngredients = editingRecipe.ingredients.filter(
            (item) => item.name.trim()
        );

        const validInstructions = editingRecipe.instructions.filter(
            (step) => step.trim()
        );

        if (validIngredients.length === 0) {
            setMessage('Please add at least one ingredient.');
            return;
        }

        if (validInstructions.length === 0) {
            setMessage('Please add at least one instruction.');
            return;
        }

        const selectedCategory = categories.find(
            (category) =>
                category.name.toLowerCase() ===
                editingRecipe.category.trim().toLowerCase()
        );

        if (!selectedCategory) {
            setMessage('Please enter a valid category.');
            return;
        }

        try {
            setIsSaving(true);

            let imageUrl = editingRecipe.image || '';

            if (editingRecipe.imageFile) {
                const formData = new FormData();
                formData.append('file', editingRecipe.imageFile);

                const uploadResult = await apiRequest('/uploads/image', {
                    method: 'POST',
                    body: formData
                });

                imageUrl = uploadResult.image_url;
            }

            const cookingTime = Number(editingRecipe.cookingTime);

            const recipeData = {
                title: editingRecipe.name.trim(),
                description: editingRecipe.description.trim(),
                category_id: selectedCategory.id,
                image_url: imageUrl || null,
                cook_time_minutes: cookingTime,
                servings: 1,
                difficulty: 'easy',
                ingredients: validIngredients.map((item) => ({
                    ingredient_name: item.name.trim(),
                    quantity: item.quantity || null,
                    unit: item.unit || null
                })),
                steps: validInstructions.map((instruction, index) => ({
                    step_number: index + 1,
                    instruction: instruction.trim()
                }))
            };

            await apiRequest(`/recipes/${editingRecipe.id}`, {
                method: 'PUT',
                body: JSON.stringify(recipeData)
            });

            setEditingRecipe(null);
            setMessage('Recipe updated successfully!');

            await loadRecipes();
        } catch (error) {
            setMessage(error.message || 'Unable to update recipe.');
        } finally {
            setIsSaving(false);
        }
    }

    function getStatusClass(status) {
        return String(status || 'Pending').toLowerCase();
    }

    return (
        <div className="my-recipes-page">

            {/* Hero */}
            <section className="my-recipes-hero">
                <div className="my-recipes-hero-content">
                    <span className="my-recipes-eyebrow">
                        YOUR PERSONAL RECIPE SPACE
                    </span>

                    <h1>
                        Welcome to
                        <span> My Kitchen.</span>
                    </h1>

                    <p>
                        Keep your creations organised, update your favourite
                        dishes, and follow the journey of every recipe you share.
                    </p>

                    <Link to="/create-recipe" className="my-recipes-create-link">
                        + Create New Recipe
                    </Link>
                </div>

                <div className="my-recipes-hero-image">
                    <img
                        src="https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1100&q=90"
                        alt="A warm and beautiful home kitchen"
                    />
                    <div className="my-recipes-hero-caption">
                        Made with love
                    </div>
                </div>
            </section>

            <main className="my-recipes-main">

                {/* Page heading */}
                <div className="my-recipes-heading">
                    <div>
                        <span className="my-recipes-section-label">
                            YOUR COLLECTION
                        </span>
                        <h2>My Recipes</h2>
                        <p>Everything you've created, all in one place.</p>
                    </div>

                    <div className="my-recipes-total">
                        <strong>{myRecipes.length}</strong>
                        <span>Total Recipes</span>
                    </div>
                </div>

                {/* Status summary */}
                <div className="my-recipes-stats">
                    <button
                        type="button"
                        className={`my-recipes-stat-card ${filter === 'All' ? 'active' : ''}`}
                        onClick={() => setFilter('All')}
                    >
                        <span className="my-recipes-stat-icon">ALL</span>
                        <span className="my-recipes-stat-number">{statusCounts.All}</span>
                        <span className="my-recipes-stat-label">All Recipes</span>
                    </button>

                    <button
                        type="button"
                        className={`my-recipes-stat-card ${filter === 'Draft' ? 'active' : ''}`}
                        onClick={() => setFilter('Draft')}
                    >
                        <span className="my-recipes-stat-icon">DR</span>
                        <span className="my-recipes-stat-number">{statusCounts.Draft}</span>
                        <span className="my-recipes-stat-label">Drafts</span>
                    </button>

                    <button
                        type="button"
                        className={`my-recipes-stat-card ${filter === 'Pending' ? 'active' : ''}`}
                        onClick={() => setFilter('Pending')}
                    >
                        <span className="my-recipes-stat-icon">PN</span>
                        <span className="my-recipes-stat-number">{statusCounts.Pending}</span>
                        <span className="my-recipes-stat-label">Pending</span>
                    </button>

                    <button
                        type="button"
                        className={`my-recipes-stat-card ${filter === 'Approved' ? 'active' : ''}`}
                        onClick={() => setFilter('Approved')}
                    >
                        <span className="my-recipes-stat-icon">OK</span>
                        <span className="my-recipes-stat-number">{statusCounts.Approved}</span>
                        <span className="my-recipes-stat-label">Approved</span>
                    </button>

                    <button
                        type="button"
                        className={`my-recipes-stat-card ${filter === 'Rejected' ? 'active' : ''}`}
                        onClick={() => setFilter('Rejected')}
                    >
                        <span className="my-recipes-stat-icon">RJ</span>
                        <span className="my-recipes-stat-number">{statusCounts.Rejected}</span>
                        <span className="my-recipes-stat-label">Rejected</span>
                    </button>
                </div>

                {message && (
                    <div className="my-recipes-message" role="status">
                        {message}
                        <button
                            type="button"
                            onClick={() => setMessage('')}
                            aria-label="Close message"
                        >
                            Close
                        </button>
                    </div>
                )}

                {isLoading && (
                    <div className="no-my-recipes">
                        <h2>Loading your recipes...</h2>
                    </div>
                )}

                {/* Edit recipe form */}
                {editingRecipe && (
                    <form
                        ref={editFormRef}
                        className="my-recipe-edit-form"
                        onSubmit={saveRecipe}
                    >
                        <div className="my-recipe-edit-heading">
                            <div>
                                <span className="my-recipes-section-label">
                                    RECIPE EDITOR
                                </span>
                                <h2>Edit Your Recipe</h2>
                                <p>Make your changes and save your recipe.</p>
                            </div>

                            <button
                                type="button"
                                className="my-recipe-close-edit"
                                onClick={() => {
                                    setEditingRecipe(null);
                                    setMessage('');
                                }}
                                aria-label="Close editor"
                            >
                                Close
                            </button>
                        </div>

                        <div className="my-recipe-edit-grid">
                            <div className="my-recipe-edit-field">
                                <label>Recipe Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={editingRecipe.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="my-recipe-edit-field">
                                <label>Category *</label>
                                <select
                                    name="category"
                                    value={editingRecipe.category}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select category</option>
                                    {categories.map((category) => (
                                        <option
                                            key={category.id}
                                            value={category.name}
                                        >
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="my-recipe-edit-field">
                                <label>Cooking Time (minutes) *</label>
                                <input
                                    type="number"
                                    name="cookingTime"
                                    min="1"
                                    value={editingRecipe.cookingTime || ''}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="my-recipe-edit-field my-recipe-edit-full">
                                <label>Description *</label>
                                <textarea
                                    name="description"
                                    value={editingRecipe.description}
                                    onChange={handleChange}
                                    rows="4"
                                    required
                                />
                            </div>
                        </div>

                        <div className="my-recipe-edit-subsection">
                            <h3>Dietary Tags</h3>
                            <p>Select all dietary categories that apply.</p>

                            <div className="my-recipe-edit-options">
                                {dietaryOptions.map((tag) => (
                                    <label key={tag}>
                                        <input
                                            type="checkbox"
                                            checked={(editingRecipe.dietaryTags || []).includes(tag)}
                                            onChange={() => handleDietaryChange(tag)}
                                        />
                                        {tag}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="my-recipe-edit-subsection">
                            <h3>Allergen Details</h3>
                            <p>Select ingredients that may cause allergies.</p>

                            <div className="my-recipe-edit-options">
                                {allergenOptions.map((allergen) => (
                                    <label key={allergen}>
                                        <input
                                            type="checkbox"
                                            checked={(editingRecipe.allergens || []).includes(allergen)}
                                            onChange={() => handleAllergenChange(allergen)}
                                        />
                                        {allergen}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="my-recipe-edit-subsection">
                            <h3>Recipe Image</h3>

                            {isValidImage(editingRecipe.image) ? (
                                <div className="my-recipe-edit-image">
                                    <img
                                        src={editingRecipe.image}
                                        alt="Recipe preview"
                                    />
                                    <button
                                        type="button"
                                        onClick={removeRecipeImage}
                                    >
                                        Remove Image
                                    </button>
                                </div>
                            ) : (
                                <p>
                                    {getRecipeImage(editingRecipe)
                                        ? 'Using the image from Explore Recipes.'
                                        : 'No recipe image selected.'}
                                </p>
                            )}

                            <label className="my-recipe-file-label">
                                Choose New Image
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleImageChange}
                                />
                            </label>
                            <small>JPG, JPEG, PNG or WEBP. Maximum size: 5 MB.</small>
                        </div>

                        {/* Ingredients */}
                        <div className="my-recipe-edit-subsection">
                            <h3>Ingredients</h3>

                            {editingRecipe.ingredients.map((ingredient, index) => (
                                <div className="my-recipe-editor-row" key={index}>
                                    <div className="my-recipe-editor-row-title">
                                        <strong>Ingredient {index + 1}</strong>
                                        <button
                                            type="button"
                                            className="my-recipe-remove-row"
                                            onClick={() => deleteIngredient(index)}
                                        >
                                            Remove
                                        </button>
                                    </div>

                                    <div className="my-recipe-ingredient-grid">
                                        <input
                                            type="text"
                                            value={ingredient.name}
                                            onChange={(e) =>
                                                handleIngredientChange(index, 'name', e.target.value)
                                            }
                                            placeholder="Ingredient name"
                                        />

                                        <input
                                            type="number"
                                            min="0"
                                            step="any"
                                            value={ingredient.quantity}
                                            onChange={(e) =>
                                                handleIngredientChange(index, 'quantity', e.target.value)
                                            }
                                            placeholder="Quantity"
                                        />

                                        <input
                                            type="text"
                                            value={ingredient.unit}
                                            onChange={(e) =>
                                                handleIngredientChange(index, 'unit', e.target.value)
                                            }
                                            placeholder="Unit"
                                        />

                                        <input
                                            type="text"
                                            value={ingredient.preparationNote || ''}
                                            onChange={(e) =>
                                                handleIngredientChange(index, 'preparationNote', e.target.value)
                                            }
                                            placeholder="Preparation note"
                                        />
                                    </div>

                                    <div className="my-recipe-row-actions">
                                        <button
                                            type="button"
                                            onClick={() => moveIngredient(index, -1)}
                                            disabled={index === 0}
                                        >
                                            Move Up
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => moveIngredient(index, 1)}
                                            disabled={index === editingRecipe.ingredients.length - 1}
                                        >
                                            Move Down
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <button
                                type="button"
                                className="my-recipe-add-row"
                                onClick={addIngredient}
                            >
                                Add Ingredient
                            </button>
                        </div>

                        {/* Instructions */}
                        <div className="my-recipe-edit-subsection">
                            <h3>Cooking Instructions</h3>

                            {editingRecipe.instructions.map((step, index) => (
                                <div className="my-recipe-editor-row" key={index}>
                                    <div className="my-recipe-editor-row-title">
                                        <strong>Step {index + 1}</strong>
                                        <button
                                            type="button"
                                            className="my-recipe-remove-row"
                                            onClick={() => deleteInstruction(index)}
                                        >
                                            Remove
                                        </button>
                                    </div>

                                    <textarea
                                        value={step}
                                        onChange={(e) =>
                                            handleInstructionChange(index, e.target.value)
                                        }
                                        rows="3"
                                        placeholder="Describe this cooking step..."
                                    />

                                    <div className="my-recipe-row-actions">
                                        <button
                                            type="button"
                                            onClick={() => moveInstruction(index, -1)}
                                            disabled={index === 0}
                                        >
                                            Move Up
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => moveInstruction(index, 1)}
                                            disabled={index === editingRecipe.instructions.length - 1}
                                        >
                                            Move Down
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <button
                                type="button"
                                className="my-recipe-add-row"
                                onClick={addInstruction}
                            >
                                Add Instruction
                            </button>
                        </div>

                        <div className="my-recipe-edit-actions">
                            <button
                                type="submit"
                                className="my-recipe-save-btn"
                                disabled={isSaving}
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>

                            <button
                                type="button"
                                className="my-recipe-cancel-btn"
                                onClick={() => {
                                    setEditingRecipe(null);
                                    setMessage('');
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}

                {/* Recipe list */}
                {!isLoading && (
                    <>
                        <div className="my-recipes-list-heading">
                            <div>
                                <h2>
                                    {filter === 'All' ? 'All Your Creations' : `${filter} Recipes`}
                                </h2>
                                <p>
                                    {filteredRecipes.length} {filteredRecipes.length === 1 ? 'recipe' : 'recipes'} found
                                </p>
                            </div>

                            <select
                                className="my-recipes-filter-select"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                aria-label="Filter recipes by status"
                            >
                                <option value="All">All Recipes</option>
                                <option value="Draft">Draft</option>
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                            </select>
                        </div>

                        {filteredRecipes.length === 0 ? (
                            <div className="no-my-recipes">
                                <div
                                    className="no-my-recipes-icon"
                                    aria-hidden="true"
                                ></div>

                                <h2>No Recipes Found</h2>
                                <p>
                                    There are no recipes in this category yet.
                                    Start creating something delicious!
                                </p>
                                <Link to="/create-recipe" className="my-recipes-create-link">
                                    Create Your First Recipe
                                </Link>
                            </div>
                        ) : (
                            <div className="my-recipes-grid">
                                {filteredRecipes.map((recipe) => (
                                    <article className="my-recipe-card" key={recipe.id}>
                                        <div className="my-recipe-card-image">
                                            {getRecipeImage(recipe) ? (
                                                <img
                                                    src={getRecipeImage(recipe)}
                                                    alt={recipe.name}
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <div className="my-recipe-image-placeholder">
                                                    <span>No image available</span>
                                                </div>
                                            )}

                                            <span className={`my-recipe-status ${getStatusClass(recipe.status)}`}>
                                                {recipe.status || 'Pending'}
                                            </span>
                                        </div>

                                        <div className="my-recipe-card-content">
                                            <span className="my-recipe-category">
                                                {recipe.category || 'Recipe'}
                                            </span>

                                            <h3>{recipe.name}</h3>

                                            <p className="my-recipe-description">
                                                {recipe.description || 'A delicious recipe waiting to be discovered.'}
                                            </p>

                                            <div className="my-recipe-card-meta">
                                                <span>
                                                    Time: {recipe.cookingTime || recipe.time || '—'} min
                                                </span>
                                                <span>
                                                    Ingredients: {(recipe.ingredients || []).length}
                                                </span>
                                            </div>

                                            {recipe.reason && (
                                                <div className="my-recipe-reason">
                                                    <strong>Moderator feedback:</strong>
                                                    <p>{recipe.reason}</p>
                                                </div>
                                            )}

                                            <div className="my-recipe-card-actions">
                                                <button
                                                    type="button"
                                                    className="my-recipe-edit-btn"
                                                    onClick={() => handleEdit(recipe)}
                                                >
                                                    Edit Recipe
                                                </button>

                                                <button
                                                    type="button"
                                                    className="my-recipe-delete-btn"
                                                    onClick={() => deleteRecipe(recipe.id)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </>
                )}

            </main>
        </div>
    );
}

export default MyRecipes;
