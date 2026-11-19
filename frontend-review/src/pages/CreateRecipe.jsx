
import { useState, useEffect } from 'react';
import IngredientEditor from '../components/IngredientEditor';
import InstructionEditor from '../components/InstructionEditor';
import { recipes as staticRecipes } from '../data/recipes';
import {
    getCategories,
    getTags,
    assignRecipeTag,
    createRecipe as createBackendRecipe,
    uploadRecipeImage
} from '../services/portalApi';
import './CreateRecipe.css';

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

const normalizeName = name =>
    String(name || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

function CreateRecipe() {
    const [submissionsEnabled, setSubmissionsEnabled] = useState(() => {
        try {
            const settings = JSON.parse(
                localStorage.getItem('recipe-admin-settings') || '{}'
            );

            return settings?.recipeSubmissions ?? true;
        } catch {
            return true;
        }
    });

    const [formData, setFormData] = useState({
        name: '',
        category: '',
        cookingTime: '',
        description: '',
        image: null
    });

    const [categories, setCategories] = useState([]);
    const [categoriesLoading, setCategoriesLoading] = useState(true);

    const [tagRecords, setTagRecords] = useState([]);
    const [tagsLoading, setTagsLoading] = useState(true);
    const [tagsError, setTagsError] = useState('');

    const [dietaryTags, setDietaryTags] = useState([]);
    const [allergens, setAllergens] = useState([]);

    const [imagePreview, setImagePreview] = useState('');

    const [ingredients, setIngredients] = useState([
        { name: '', quantity: '', unit: 'cup' }
    ]);

    const [instructions, setInstructions] = useState(['']);
    const [errors, setErrors] = useState({});
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // LOAD DATABASE CATEGORIES AND PRESERVE STATIC CATEGORIES
    useEffect(() => {
        let active = true;

        async function loadCategories() {
            const staticCategories = [
                ...new Set(
                    (staticRecipes || [])
                        .map(recipe =>
                            String(recipe.category || '').trim()
                        )
                        .filter(Boolean)
                )
            ].map((name, index) => ({
                id: `static-${index + 1}`,
                name,
                isStatic: true
            }));

            try {
                const response = await getCategories();

                const backendCategories = Array.isArray(response)
                    ? response
                    : response?.items || [];

                const backendNames = new Set(
                    backendCategories.map(category =>
                        String(category.name || '')
                            .trim()
                            .toLowerCase()
                    )
                );

                const additionalStaticCategories =
                    staticCategories.filter(
                        category =>
                            !backendNames.has(
                                category.name.toLowerCase()
                            )
                    );

                if (active) {
                    setCategories([
                        ...backendCategories.map(category => ({
                            ...category,
                            isStatic: false
                        })),
                        ...additionalStaticCategories
                    ]);
                }
            } catch (error) {
                console.error('Error loading categories:', error);

                if (active) {
                    setCategories(staticCategories);
                }
            } finally {
                if (active) {
                    setCategoriesLoading(false);
                }
            }
        }

        loadCategories();

        return () => {
            active = false;
        };
    }, []);

    // LOAD ALL DIETARY AND ALLERGEN TAGS FROM MYSQL
    useEffect(() => {
        let active = true;

        async function loadTags() {
            try {
                setTagsLoading(true);
                setTagsError('');

                const response = await getTags();

                const databaseTags = Array.isArray(response)
                    ? response
                    : response?.items || [];

                if (!active) return;

                setTagRecords(databaseTags);
            } catch (error) {
                console.error('Error loading database tags:', error);

                if (active) {
                    setTagsError(
                        'Unable to load tags from the backend. Please refresh and try again.'
                    );
                }
            } finally {
                if (active) {
                    setTagsLoading(false);
                }
            }
        }

        loadTags();

        return () => {
            active = false;
        };
    }, []);

    // CHECK ADMIN SUBMISSION SETTINGS
    useEffect(() => {
        function checkSubmissionSetting() {
            try {
                const settings = JSON.parse(
                    localStorage.getItem('recipe-admin-settings') || '{}'
                );

                setSubmissionsEnabled(
                    settings?.recipeSubmissions ?? true
                );
            } catch {
                setSubmissionsEnabled(true);
            }
        }

        window.addEventListener(
            'admin-settings-updated',
            checkSubmissionSetting
        );

        window.addEventListener(
            'storage',
            checkSubmissionSetting
        );

        return () => {
            window.removeEventListener(
                'admin-settings-updated',
                checkSubmissionSetting
            );

            window.removeEventListener(
                'storage',
                checkSubmissionSetting
            );
        };
    }, []);

    // CLEANUP IMAGE PREVIEW URL
    useEffect(() => {
        return () => {
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    // FIND DATABASE TAG USING ITS NAME
    function findDatabaseTag(name) {
        return tagRecords.find(
            tag => normalizeName(tag.name) === normalizeName(name)
        );
    }

    // HANDLE INPUT CHANGES
    function handleChange(e) {
        const { name, value } = e.target;

        setFormData(previous => ({
            ...previous,
            [name]: value
        }));

        setErrors(previous => ({
            ...previous,
            [name]: ''
        }));

        setSuccess('');
    }

    // HANDLE DIETARY TAGS
    function handleDietaryChange(tag) {
        setDietaryTags(previous =>
            previous.includes(tag)
                ? previous.filter(item => item !== tag)
                : [...previous, tag]
        );

        setSuccess('');
    }

    // HANDLE ALLERGENS
    function handleAllergenChange(allergen) {
        setAllergens(previous =>
            previous.includes(allergen)
                ? previous.filter(item => item !== allergen)
                : [...previous, allergen]
        );

        setSuccess('');
    }

    // HANDLE IMAGE UPLOAD
    function handleImageChange(e) {
        const file = e.target.files[0];

        if (!file) return;

        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/webp'
        ];

        if (!allowedTypes.includes(file.type)) {
            setErrors(previous => ({
                ...previous,
                image: 'Only JPG, JPEG, PNG and WEBP images are allowed.'
            }));

            e.target.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setErrors(previous => ({
                ...previous,
                image: 'Image size must not exceed 5 MB.'
            }));

            e.target.value = '';
            return;
        }

        setFormData(previous => ({
            ...previous,
            image: file
        }));

        setImagePreview(URL.createObjectURL(file));

        setErrors(previous => ({
            ...previous,
            image: ''
        }));

        setSuccess('');
    }

    // REMOVE UPLOADED IMAGE
    function handleRemoveImage() {
        setFormData(previous => ({
            ...previous,
            image: null
        }));

        setImagePreview('');

        const imageInput = document.getElementById('recipe-image');

        if (imageInput) {
            imageInput.value = '';
        }

        setErrors(previous => ({
            ...previous,
            image: ''
        }));
    }

    // RESET FORM
    function resetForm() {
        setFormData({
            name: '',
            category: '',
            cookingTime: '',
            description: '',
            image: null
        });

        setDietaryTags([]);
        setAllergens([]);
        setImagePreview('');

        const imageInput = document.getElementById('recipe-image');

        if (imageInput) {
            imageInput.value = '';
        }

        setIngredients([
            { name: '', quantity: '', unit: 'cup' }
        ]);

        setInstructions(['']);
        setErrors({});
    }

    // SAVE RECIPE TO MYSQL AS DRAFT
    async function handleSubmit(e) {
        e.preventDefault();

        if (isLoading) return;

        if (!submissionsEnabled) {
            setSuccess('');

            setErrors({
                submission:
                    'Recipe submissions are currently disabled by the administrator.'
            });

            return;
        }

        const newErrors = {};

        if (formData.name.trim().length < 3) {
            newErrors.name =
                'Recipe name must contain at least 3 characters.';
        }

        if (!formData.category) {
            newErrors.category = 'Please select a category.';
        }

        if (
            !formData.cookingTime ||
            !Number.isFinite(Number(formData.cookingTime)) ||
            Number(formData.cookingTime) <= 0
        ) {
            newErrors.cookingTime = 'Enter a valid cooking time.';
        }

        if (!formData.description.trim()) {
            newErrors.description = 'Description is required.';
        }

        const validIngredients = ingredients.filter(
            item =>
                item.name.trim() &&
                Number(item.quantity) > 0 &&
                item.unit
        );

        if (
            validIngredients.length === 0 ||
            validIngredients.length !== ingredients.length
        ) {
            newErrors.ingredients =
                'Please complete all ingredient fields.';
        }

        const validInstructions = instructions.filter(
            step => step.trim() !== ''
        );

        if (
            validInstructions.length === 0 ||
            validInstructions.length !== instructions.length
        ) {
            newErrors.instructions =
                'Please complete all cooking steps.';
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            return;
        }

        const selectedCategory = categories.find(
            category =>
                String(category.id) === String(formData.category)
        );

        if (!selectedCategory) {
            setErrors({
                category: 'Please select a valid category.'
            });

            return;
        }

        // A static category does not have a MySQL category ID.
        if (selectedCategory.isStatic) {
            setErrors({
                category:
                    'This category is currently static. Please select a category loaded from the backend to save your recipe in MySQL.'
            });

            return;
        }

        if (tagsLoading) {
            setErrors({
                submission: 'Please wait while database tags are loading.'
            });

            return;
        }

        if (tagsError) {
            setErrors({
                submission: tagsError
            });

            return;
        }

        // MATCH ALL SELECTED CHECKBOXES TO DATABASE TAG RECORDS
        const selectedTagNames = [
            ...dietaryTags,
            ...allergens
        ];

        const selectedDatabaseTags = selectedTagNames.map(name =>
            findDatabaseTag(name)
        );

        const missingTags = selectedTagNames.filter(
            name => !findDatabaseTag(name)
        );

        if (missingTags.length > 0) {
            setErrors({
                submission:
                    `These tags are missing from MySQL: ${missingTags.join(', ')}. Ask the administrator to add them through POST /tags, then refresh this page.`
            });

            return;
        }

        setIsLoading(true);
        setSuccess('');
        setErrors({});

        let createdRecipe = null;

        try {
            // UPLOAD IMAGE
            let imageUrl = null;

            if (formData.image) {
                const uploadResponse = await uploadRecipeImage(
                    formData.image
                );

                if (!uploadResponse?.image_url) {
                    throw new Error(
                        'Image upload failed. No image URL was returned.'
                    );
                }

                imageUrl = uploadResponse.image_url.startsWith('http')
                    ? uploadResponse.image_url
                    : `http://127.0.0.1:8000${uploadResponse.image_url}`;
            }

            // PREPARE BACKEND RECIPE DATA
            const recipeData = {
                title: formData.name.trim(),
                description: formData.description.trim(),
                category_id: Number(selectedCategory.id),
                image_url: imageUrl,
                prep_time_minutes: null,
                cook_time_minutes: Number(formData.cookingTime),
                servings: 1,
                difficulty: 'easy',

                ingredients: validIngredients.map(item => ({
                    ingredient_name: item.name.trim(),
                    quantity: String(item.quantity),
                    unit: item.unit
                })),

                steps: validInstructions.map((step, index) => ({
                    step_number: index + 1,
                    instruction: step.trim()
                }))
            };

            // CREATE RECIPE
            // Backend create_recipe saves status="draft".
            createdRecipe = await createBackendRecipe(recipeData);

            if (!createdRecipe?.id) {
                throw new Error(
                    'The backend did not return the created recipe ID.'
                );
            }

            // ASSIGN SELECTED DIETARY TAGS AND ALLERGENS
            for (const tag of selectedDatabaseTags) {
                await assignRecipeTag(
                    createdRecipe.id,
                    tag.id
                );
            }

            // DO NOT CALL submitRecipe HERE.
            // The recipe must remain in draft until the user submits it.

            setSuccess(
                `Recipe "${createdRecipe.title || formData.name}" saved as draft successfully!`
            );

            resetForm();

            window.dispatchEvent(
                new Event('backend-recipes-updated')
            );

        } catch (error) {
            console.error('Error saving recipe:', error);

            if (!createdRecipe?.id) {
                setErrors({
                    submission:
                        error.message || 'Unable to save recipe.'
                });
            } else {
                setErrors({
                    submission:
                        `Recipe ID ${createdRecipe.id} was created, but a tag or later operation failed. Check My Recipes before trying again. Error: ${error.message}`
                });
            }
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="create-recipe-page">

            {/* CENTRED PAGE HEADING */}
            <section className="create-recipe-hero">

                <span className="create-hero-eyebrow">
                    SHARE YOUR RECIPE
                </span>

                <h1>
                    Create Your Own <span>Recipe</span>
                </h1>

                <p>
                    Share your culinary masterpiece with our community
                </p>

                <div className="create-hero-tagline">
                    Cook it. Share it. Inspire someone.
                </div>

            </section>

            <main className="create-recipe-main">

                {submissionsEnabled ? (

                    <form
                        className="create-recipe-form"
                        onSubmit={handleSubmit}
                    >

                        {errors.submission && (
                            <p className="create-form-error" role="alert">
                                {errors.submission}
                            </p>
                        )}

                        {/* PHOTO LEFT + DETAILS RIGHT */}
                        <div className="create-top-grid">

                            {/* PHOTO UPLOAD */}
                            <section className="create-photo-section">

                                <h3>Add a Photo</h3>

                                <p>
                                    Upload a delicious photo of your dish.
                                </p>

                                <label
                                    htmlFor="recipe-image"
                                    className="create-upload-area"
                                >

                                    {imagePreview ? (

                                        <img
                                            src={imagePreview}
                                            alt="Recipe preview"
                                            className="create-upload-preview"
                                        />

                                    ) : (

                                        <>
                                            <span className="create-camera-icon">
                                                <svg
                                                    viewBox="0 0 24 24"
                                                    aria-hidden="true"
                                                >
                                                    <path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />

                                                    <circle
                                                        cx="12"
                                                        cy="13"
                                                        r="4"
                                                    />
                                                </svg>
                                            </span>

                                            <strong>
                                                Click to upload
                                            </strong>

                                            <span>
                                                JPG, PNG, WEBP · Max 5 MB
                                            </span>

                                            <span className="create-choose-image">
                                                Choose Image
                                            </span>
                                        </>

                                    )}

                                </label>

                                <input
                                    id="recipe-image"
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                                    onChange={handleImageChange}
                                />

                                {imagePreview && (
                                    <button
                                        type="button"
                                        className="create-remove-image"
                                        onClick={handleRemoveImage}
                                    >
                                        Remove image
                                    </button>
                                )}

                                {errors.image && (
                                    <span className="create-field-error">
                                        {errors.image}
                                    </span>
                                )}

                            </section>

                            {/* RECIPE DETAILS */}
                            <section className="create-details-section">

                                {/* RECIPE NAME */}
                                <div className="create-field create-field-full">

                                    <label htmlFor="recipe-name">
                                        Recipe Name <span>*</span>
                                    </label>

                                    <input
                                        id="recipe-name"
                                        type="text"
                                        name="name"
                                        placeholder="e.g. Creamy Tomato Pasta"
                                        value={formData.name}
                                        onChange={handleChange}
                                    />

                                    {errors.name && (
                                        <span className="create-field-error">
                                            {errors.name}
                                        </span>
                                    )}

                                </div>

                                {/* CATEGORY + COOKING TIME */}
                                <div className="create-form-grid">

                                    <div className="create-field">

                                        <label htmlFor="recipe-category">
                                            Category <span>*</span>
                                        </label>

                                        <select
                                            id="recipe-category"
                                            name="category"
                                            value={formData.category}
                                            onChange={handleChange}
                                        >
                                            <option value="">
                                                {categoriesLoading
                                                    ? 'Loading categories...'
                                                    : 'Select category'}
                                            </option>

                                            {categories.map(category => (
                                                <option
                                                    key={category.id}
                                                    value={category.id}
                                                >
                                                    {category.name}
                                                </option>
                                            ))}
                                        </select>

                                        {errors.category && (
                                            <span className="create-field-error">
                                                {errors.category}
                                            </span>
                                        )}

                                    </div>

                                    <div className="create-field">

                                        <label htmlFor="cooking-time">
                                            Cooking Time (minutes) <span>*</span>
                                        </label>

                                        <input
                                            id="cooking-time"
                                            type="number"
                                            name="cookingTime"
                                            min="1"
                                            placeholder="e.g. 30"
                                            value={formData.cookingTime}
                                            onChange={handleChange}
                                        />

                                        {errors.cookingTime && (
                                            <span className="create-field-error">
                                                {errors.cookingTime}
                                            </span>
                                        )}

                                    </div>

                                </div>

                                {/* DESCRIPTION */}
                                <div className="create-field create-field-full">

                                    <label htmlFor="recipe-description">
                                        Description <span>*</span>
                                    </label>

                                    <textarea
                                        id="recipe-description"
                                        name="description"
                                        rows="4"
                                        placeholder="Tell us what makes this dish special..."
                                        value={formData.description}
                                        onChange={handleChange}
                                    />

                                    {errors.description && (
                                        <span className="create-field-error">
                                            {errors.description}
                                        </span>
                                    )}

                                </div>

                                {/* DIETARY TAGS + ALLERGENS */}
                                <div className="create-details-options">

                                    <div className="create-option-group">

                                        <h4>Dietary Tags</h4>

                                        {dietaryOptions.map(tag => {
                                            const databaseTag =
                                                findDatabaseTag(tag);

                                            return (
                                                <label
                                                    key={tag}
                                                    className="create-checkbox-row"
                                                    title={
                                                        databaseTag
                                                            ? `Database tag ID: ${databaseTag.id}`
                                                            : 'This tag has not been added to MySQL yet'
                                                    }
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={dietaryTags.includes(tag)}
                                                        onChange={() =>
                                                            handleDietaryChange(tag)
                                                        }
                                                        disabled={tagsLoading}
                                                    />

                                                    <span>{tag}</span>
                                                </label>
                                            );
                                        })}

                                    </div>

                                    <div className="create-option-group">

                                        <h4>Allergens</h4>

                                        {allergenOptions.map(allergen => {
                                            const databaseTag =
                                                findDatabaseTag(allergen);

                                            return (
                                                <label
                                                    key={allergen}
                                                    className="create-checkbox-row"
                                                    title={
                                                        databaseTag
                                                            ? `Database tag ID: ${databaseTag.id}`
                                                            : 'This tag has not been added to MySQL yet'
                                                    }
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={allergens.includes(allergen)}
                                                        onChange={() =>
                                                            handleAllergenChange(allergen)
                                                        }
                                                        disabled={tagsLoading}
                                                    />

                                                    <span>{allergen}</span>
                                                </label>
                                            );
                                        })}

                                    </div>

                                </div>

                                {tagsLoading && (
                                    <p className="create-field-error">
                                        Loading dietary tags from database...
                                    </p>
                                )}

                                {tagsError && (
                                    <p className="create-field-error">
                                        {tagsError}
                                    </p>
                                )}

                            </section>

                        </div>

                        {/* INGREDIENTS + INSTRUCTIONS SIDE BY SIDE */}
                        <div className="create-editors-grid">

                            {/* INGREDIENTS */}
                            <section className="create-editor-section">

                                <div className="create-editor-heading">

                                    <div className="create-editor-icon">
                                        ♨
                                    </div>

                                    <div>
                                        <h3>Ingredients</h3>
                                        <p>List all ingredients</p>
                                    </div>

                                </div>

                                <IngredientEditor
                                    ingredients={ingredients}
                                    setIngredients={setIngredients}
                                />

                                {errors.ingredients && (
                                    <span className="create-field-error">
                                        {errors.ingredients}
                                    </span>
                                )}

                            </section>

                            {/* COOKING INSTRUCTIONS */}
                            <section className="create-editor-section">

                                <div className="create-editor-heading">

                                    <div className="create-editor-icon">
                                        ♨
                                    </div>

                                    <div>
                                        <h3>Cooking Instructions</h3>
                                        <p>Explain how to prepare your dish</p>
                                    </div>

                                </div>

                                <InstructionEditor
                                    instructions={instructions}
                                    setInstructions={setInstructions}
                                />

                                {errors.instructions && (
                                    <span className="create-field-error">
                                        {errors.instructions}
                                    </span>
                                )}

                            </section>

                        </div>

                        {/* SUCCESS MESSAGE */}
                        {success && (
                            <div
                                className="create-success-message"
                                role="status"
                            >
                                <span>✓</span>
                                {success}
                            </div>
                        )}

                        {/* SAVE DRAFT BUTTON */}
                        <div className="create-form-submit-area">

                            <p>
                                <span>*</span> Required fields
                            </p>

                            <button
                                type="submit"
                                className="create-submit-btn"
                                disabled={
                                    isLoading ||
                                    categoriesLoading ||
                                    tagsLoading
                                }
                            >
                                {isLoading
                                    ? 'Saving your recipe...'
                                    : 'Save Recipe as Draft  →'}
                            </button>

                            <small>
                                Your recipe will be saved as a draft. You can submit it for review later from My Recipes.
                            </small>

                        </div>

                    </form>

                ) : (

                    <div className="submission-disabled-message">

                        <h3>
                            Recipe Submissions Temporarily Unavailable
                        </h3>

                        <p>
                            The administrator has temporarily disabled
                            recipe submissions. Please try again later.
                        </p>

                    </div>

                )}

            </main>

        </div>
    );
}

export default CreateRecipe;
