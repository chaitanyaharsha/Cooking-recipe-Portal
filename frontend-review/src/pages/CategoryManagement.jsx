
import './CategoryManagement.css';
import { useEffect, useState } from 'react';

import {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getTags,
    createTag,
    updateTag,
    deleteTag
} from '../services/portalApi';

const defaultCategories = [
    { id: 1, name: 'Indian', description: 'Traditional Indian recipes', isStatic: true },
    { id: 2, name: 'Chinese', description: 'Chinese food recipes', isStatic: true },
    { id: 3, name: 'Italian', description: 'Italian food recipes', isStatic: true },
    { id: 4, name: 'Desserts', description: 'Sweet dishes and desserts', isStatic: true }
];

const defaultTags = [
    { id: 1, name: 'Vegetarian', isStatic: true },
    { id: 2, name: 'Spicy', isStatic: true },
    { id: 3, name: 'Healthy', isStatic: true },
    { id: 4, name: 'Vegan', isStatic: true }
];

const categoryImages = {
    indian: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300',
    chinese: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300',
    italian: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=300',
    desserts: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300'
};

function loadSavedData(key, defaultData) {
    try {
        const saved = JSON.parse(localStorage.getItem(key) || 'null');
        return Array.isArray(saved) ? saved : defaultData;
    } catch {
        return defaultData;
    }
}

function getResponseMessage(error, fallback) {
    return error?.message || fallback;
}

function mergeRecords(staticRecords, databaseRecords) {
    const databaseNames = new Set(
        databaseRecords.map(item => item.name?.trim().toLowerCase())
    );

    const remainingStatic = staticRecords.filter(
        item => !databaseNames.has(item.name?.trim().toLowerCase())
    );

    return [
        ...databaseRecords.map(item => ({
            ...item,
            isStatic: false
        })),
        ...remainingStatic
    ];
}

function CategoryManagement() {
    const [categories, setCategories] = useState(() =>
        loadSavedData('recipe-categories', defaultCategories)
    );

    const [tags, setTags] = useState(() =>
        loadSavedData('recipe-tags', defaultTags)
    );

    const [categoryName, setCategoryName] = useState('');
    const [categoryDescription, setCategoryDescription] = useState('');
    const [tagName, setTagName] = useState('');

    const [editingCategoryId, setEditingCategoryId] = useState(null);
    const [editingTagId, setEditingTagId] = useState(null);

    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);

    // ==========================================
    // LOAD CATEGORIES AND TAGS FROM BACKEND
    // ==========================================

    useEffect(() => {
        let active = true;

        Promise.all([
            getCategories(),
            getTags()
        ])
            .then(([categoryResponse, tagResponse]) => {
                if (!active) return;

                const databaseCategories = Array.isArray(categoryResponse)
                    ? categoryResponse
                    : [];

                const databaseTags = Array.isArray(tagResponse)
                    ? tagResponse
                    : [];

                const savedCategories = loadSavedData(
                    'recipe-categories',
                    defaultCategories
                );

                const savedTags = loadSavedData(
                    'recipe-tags',
                    defaultTags
                );

                setCategories(
                    mergeRecords(
                        savedCategories.map(item => ({
                            ...item,
                            isStatic: true
                        })),
                        databaseCategories
                    )
                );

                setTags(
                    mergeRecords(
                        savedTags.map(item => ({
                            ...item,
                            isStatic: true
                        })),
                        databaseTags
                    )
                );
            })
            .catch(error => {
                if (!active) return;

                console.error('Unable to load categories and tags:', error);

                setMessage(
                    getResponseMessage(
                        error,
                        'Unable to load categories and tags from the server.'
                    )
                );
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    // ==========================================
    // SAVE STATIC DATA LOCALLY
    // ==========================================

    useEffect(() => {
        const staticCategories = categories
            .filter(item => item.isStatic)
            .map(({ id, name, description }) => ({
                id,
                name,
                description
            }));

        localStorage.setItem(
            'recipe-categories',
            JSON.stringify(staticCategories)
        );
    }, [categories]);

    useEffect(() => {
        const staticTags = tags
            .filter(item => item.isStatic)
            .map(({ id, name }) => ({
                id,
                name
            }));

        localStorage.setItem(
            'recipe-tags',
            JSON.stringify(staticTags)
        );
    }, [tags]);

    // ==========================================
    // RESET FORMS
    // ==========================================

    function resetCategoryForm() {
        setCategoryName('');
        setCategoryDescription('');
        setEditingCategoryId(null);
    }

    function resetTagForm() {
        setTagName('');
        setEditingTagId(null);
    }

    // ==========================================
    // CATEGORY CREATE / UPDATE
    // ==========================================

    function handleCategorySubmit(e) {
        e.preventDefault();

        if (!categoryName.trim() || !categoryDescription.trim()) {
            setMessage('Please enter category name and description.');
            return;
        }

        const duplicate = categories.some(
            category =>
                category.name.toLowerCase() ===
                    categoryName.trim().toLowerCase() &&
                String(category.id) !== String(editingCategoryId)
        );

        if (duplicate) {
            setMessage('This category already exists.');
            return;
        }

        const categoryData = {
            name: categoryName.trim(),
            description: categoryDescription.trim()
        };

        const request = editingCategoryId !== null
            ? updateCategory(editingCategoryId, categoryData)
            : createCategory(categoryData);

        request
            .then(savedCategory => {
                if (editingCategoryId !== null) {
                    setCategories(previous =>
                        previous.map(category =>
                            String(category.id) === String(editingCategoryId)
                                ? { ...savedCategory, isStatic: false }
                                : category
                        )
                    );

                    setMessage('Category updated successfully!');
                } else {
                    setCategories(previous =>
                        mergeRecords(
                            previous,
                            [...previous.filter(item => !item.isStatic), savedCategory]
                        )
                    );

                    setMessage('Category added successfully!');
                }

                resetCategoryForm();
            })
            .catch(error => {
                setMessage(
                    getResponseMessage(
                        error,
                        'Unable to save category.'
                    )
                );
            });
    }

    function editCategory(category) {
        if (category.isStatic) {
            setMessage(
                'Default demo categories are read-only. Create a database category to manage it.'
            );
            return;
        }

        setEditingCategoryId(category.id);
        setCategoryName(category.name);
        setCategoryDescription(category.description || '');
        setMessage('');

        window.scrollTo({
            top: 250,
            behavior: 'smooth'
        });
    }

    // ==========================================
    // CATEGORY DELETE
    // ==========================================

    function deleteCategory(id) {
        const category = categories.find(
            item => String(item.id) === String(id)
        );

        if (!category) return;

        if (category.isStatic) {
            setMessage('Default demo categories cannot be deleted.');
            return;
        }

        if (!window.confirm('Are you sure you want to delete this category?')) {
            return;
        }

        deleteCategoryRequest(id);
    }

    function deleteCategoryRequest(id) {
        deleteCategory(id)
            .then(() => {
                setCategories(previous =>
                    previous.filter(
                        category => String(category.id) !== String(id)
                    )
                );

                setMessage('Category deleted successfully!');

                if (String(editingCategoryId) === String(id)) {
                    resetCategoryForm();
                }
            })
            .catch(error => {
                setMessage(
                    getResponseMessage(
                        error,
                        'Unable to delete category.'
                    )
                );
            });
    }

    // ==========================================
    // TAG CREATE / UPDATE
    // ==========================================

    function handleTagSubmit(e) {
        e.preventDefault();

        if (!tagName.trim()) {
            setMessage('Please enter a tag name.');
            return;
        }

        const duplicate = tags.some(
            tag =>
                tag.name.toLowerCase() ===
                    tagName.trim().toLowerCase() &&
                String(tag.id) !== String(editingTagId)
        );

        if (duplicate) {
            setMessage('This tag already exists.');
            return;
        }

        const tagData = {
            name: tagName.trim()
        };

        const request = editingTagId !== null
            ? updateTag(editingTagId, tagData)
            : createTag(tagData);

        request
            .then(savedTag => {
                if (editingTagId !== null) {
                    setTags(previous =>
                        previous.map(tag =>
                            String(tag.id) === String(editingTagId)
                                ? { ...savedTag, isStatic: false }
                                : tag
                        )
                    );

                    setMessage('Tag updated successfully!');
                } else {
                    setTags(previous =>
                        mergeRecords(
                            previous,
                            [...previous.filter(item => !item.isStatic), savedTag]
                        )
                    );

                    setMessage('Tag added successfully!');
                }

                resetTagForm();
            })
            .catch(error => {
                setMessage(
                    getResponseMessage(
                        error,
                        'Unable to save tag.'
                    )
                );
            });
    }

    function editTag(tag) {
        if (tag.isStatic) {
            setMessage(
                'Default demo tags are read-only. Create a database tag to manage it.'
            );
            return;
        }

        setEditingTagId(tag.id);
        setTagName(tag.name);
        setMessage('');
    }

    // ==========================================
    // TAG DELETE
    // ==========================================

    function deleteTag(id) {
        const tag = tags.find(
            item => String(item.id) === String(id)
        );

        if (!tag) return;

        if (tag.isStatic) {
            setMessage('Default demo tags cannot be deleted.');
            return;
        }

        if (!window.confirm('Are you sure you want to delete this tag?')) {
            return;
        }

        deleteTagRequest(id);
    }

    function deleteTagRequest(id) {
        deleteTag(id)
            .then(() => {
                setTags(previous =>
                    previous.filter(
                        tag => String(tag.id) !== String(id)
                    )
                );

                setMessage('Tag deleted successfully!');

                if (String(editingTagId) === String(id)) {
                    resetTagForm();
                }
            })
            .catch(error => {
                setMessage(
                    getResponseMessage(
                        error,
                        'Unable to delete tag. It may already be assigned to a recipe.'
                    )
                );
            });
    }

    // ==========================================
    // UI
    // ==========================================

    return (
        <div className="category-management-page">

            {/* Hero Banner */}
            <section className="category-hero">
                <div className="category-hero-content">
                    <span className="category-hero-label">
                        RECIPE PORTAL / ADMINISTRATION
                    </span>

                    <h1>Category and Tag Management</h1>

                    <p>
                        Organize your culinary world. Manage recipe categories
                        and tags in one beautiful place.
                    </p>

                    <div className="category-hero-line"></div>
                </div>
            </section>

            {message && (
                <div className="category-management-message">
                    <span>{message}</span>
                    <button
                        type="button"
                        onClick={() => setMessage('')}
                        aria-label="Close message"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Category Form */}
            <section className="category-form-panel">

                <div className="category-panel-heading">
                    <div className="category-heading-icon">
                        <svg viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="3" width="8" height="8" rx="2" />
                            <rect x="13" y="3" width="8" height="8" rx="2" />
                            <rect x="3" y="13" width="8" height="8" rx="2" />
                            <rect x="13" y="13" width="8" height="8" rx="2" />
                        </svg>
                    </div>
                    <div>
                        <h2>
                            {editingCategoryId !== null
                                ? 'Update Category'
                                : 'Manage Categories'}
                        </h2>
                        <p>Create and organize your recipe collections</p>
                    </div>
                </div>

                <form
                    className="category-management-form"
                    onSubmit={handleCategorySubmit}
                >
                    <div className="category-input-group">
                        <label htmlFor="category-name">Category Name</label>
                        <input
                            id="category-name"
                            type="text"
                            value={categoryName}
                            onChange={e => setCategoryName(e.target.value)}
                            placeholder="Enter category name"
                        />
                    </div>

                    <div className="category-input-group">
                        <label htmlFor="category-description">
                            Category Description
                        </label>
                        <textarea
                            id="category-description"
                            value={categoryDescription}
                            onChange={e => setCategoryDescription(e.target.value)}
                            placeholder="Enter category description"
                            rows="3"
                        />
                    </div>

                    <div className="category-form-actions">
                        <button type="submit" className="category-primary-btn">
                            <span>{editingCategoryId !== null ? '✓' : '+'}</span>
                            {editingCategoryId !== null
                                ? 'Update Category'
                                : 'Add Category'}
                        </button>

                        <button
                            type="button"
                            className="category-reset-btn"
                            onClick={resetCategoryForm}
                        >
                            Reset
                        </button>
                    </div>
                </form>
            </section>

            {/* Category List */}
            <section className="category-list-panel">

                <div className="category-panel-heading">
                    <div className="category-heading-icon list-icon">
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M9 5H21M9 12H21M9 19H21" />
                            <circle cx="4" cy="5" r="1.5" />
                            <circle cx="4" cy="12" r="1.5" />
                            <circle cx="4" cy="19" r="1.5" />
                        </svg>
                    </div>
                    <div>
                        <h2>Categories List</h2>
                        <p>{categories.length} categories available</p>
                    </div>
                </div>

                {loading && (
                    <p className="admin-empty">Loading categories...</p>
                )}

                {!loading && categories.length > 0 ? (
                    <div className="category-list">
                        {categories.map(category => {
                            const image =
                                categoryImages[category.name.toLowerCase()] ||
                                'https://images.unsplash.com/photo-1547592180-85f173990554?w=300';

                            return (
                                <article className="category-item" key={`${category.isStatic ? 'static' : 'db'}-${category.id}`}>
                                    <img
                                        className="category-food-image"
                                        src={image}
                                        alt={category.name + ' food'}
                                        loading="lazy"
                                    />

                                    <div className="category-item-info">
                                        <h3>{category.name}</h3>
                                        <p>{category.description}</p>
                                    </div>

                                    <div className="category-item-actions">
                                        <button
                                            type="button"
                                            className="category-edit-btn"
                                            onClick={() => editCategory(category)}
                                        >
                                            Edit
                                        </button>

                                        <button
                                            type="button"
                                            className="category-delete-btn"
                                            onClick={() => deleteCategory(category.id)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    !loading && (
                        <p className="admin-empty">No categories available.</p>
                    )
                )}
            </section>

            {/* Tags Management */}
            <section className="tag-management-section">

                <div className="category-panel-heading">
                    <div className="category-heading-icon tag-heading-icon">
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M20 13L13 20L3 10V3H10L20 13Z" />
                            <circle cx="7" cy="7" r="1.5" />
                        </svg>
                    </div>
                    <div>
                        <h2>Manage Recipe Tags</h2>
                        <p>Organize recipes using useful tags</p>
                    </div>
                </div>

                <form className="tag-management-form" onSubmit={handleTagSubmit}>
                    <input
                        type="text"
                        value={tagName}
                        onChange={e => setTagName(e.target.value)}
                        placeholder="Enter a new recipe tag"
                    />

                    <button type="submit" className="category-primary-btn">
                        {editingTagId !== null ? 'Update Tag' : 'Add Tag'}
                    </button>

                    {editingTagId !== null && (
                        <button
                            type="button"
                            className="category-reset-btn"
                            onClick={resetTagForm}
                        >
                            Cancel
                        </button>
                    )}
                </form>

                {loading && (
                    <p className="admin-empty">Loading tags...</p>
                )}

                {!loading && tags.length > 0 ? (
                    <div className="tag-list">
                        {tags.map(tag => (
                            <div className="tag-item" key={`${tag.isStatic ? 'static' : 'db'}-${tag.id}`}>
                                <div className="tag-item-name">
                                    <span className="tag-dot"></span>
                                    {tag.name}
                                </div>

                                <div className="tag-item-actions">
                                    <button
                                        type="button"
                                        onClick={() => editTag(tag)}
                                    >
                                        Edit
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => deleteTag(tag.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    !loading && (
                        <p className="admin-empty">No tags available.</p>
                    )
                )}
            </section>

            <div className="category-bottom-note">
                <span>RECIPE PORTAL</span>
                <span>Organize • Create • Inspire</span>
            </div>
        </div>
    );
}

export default CategoryManagement;
