from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload
from app.models.notification import Notification
from app.db.database import get_db
from app.models.recipe import Recipe
from app.models.category import Category
from app.models.ingredient import RecipeIngredient
from app.models.recipe_step import RecipeStep
from app.models.recipe_tag import RecipeTag
from app.models.user import User
from app.models.dietary_tag import DietaryTag
from app.models.moderation import RecipeModeration
from app.models.admin_setting import AdminSetting

from app.api.dependencies import get_current_user, require_admin

from app.schemas.recipe import (
    RecipeCreate,
    RecipeUpdate,
    RecipeResponse,
    PaginatedRecipeResponse,
    FeaturedRecipeUpdate
)

from app.schemas.tag import RecipeTagAssign, TagResponse
from app.services.audit_services import create_audit_log


router = APIRouter(prefix="/recipes", tags=["Recipes"])


def check_recipe_access(recipe, user):
    if recipe.author_id != user.id and user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="You cannot modify this recipe"
        )


# --------------------------------------------------
# ADMIN: GET ALL PUBLISHED RECIPES
# --------------------------------------------------

@router.get(
    "/admin/featured",
    response_model=list[RecipeResponse]
)
def get_admin_featured_recipes(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    return db.query(Recipe).options(
        joinedload(Recipe.ingredients),
        joinedload(Recipe.steps)
    ).filter(
        Recipe.status == "published"
    ).order_by(
        Recipe.created_at.desc()
    ).all()


# --------------------------------------------------
# ADMIN: UPDATE A PUBLISHED RECIPE
# --------------------------------------------------

@router.put(
    "/admin/{recipe_id}",
    response_model=RecipeResponse
)
def admin_update_recipe(
    recipe_id: int,
    data: RecipeUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    recipe = db.query(Recipe).options(
        joinedload(Recipe.ingredients),
        joinedload(Recipe.steps)
    ).filter(
        Recipe.id == recipe_id
    ).first()

    if not recipe:
        raise HTTPException(
            status_code=404,
            detail="Recipe not found"
        )

    updates = data.model_dump(exclude_unset=True)

    ingredients_data = updates.pop("ingredients", None)
    steps_data = updates.pop("steps", None)

    if "category_id" in updates:
        category = db.get(Category, updates["category_id"])

        if not category or category.status != "active":
            raise HTTPException(
                status_code=404,
                detail="Active category not found"
            )

    for key, value in updates.items():
        setattr(recipe, key, value)

    if ingredients_data is not None:
        recipe.ingredients.clear()

        for item in ingredients_data:
            recipe.ingredients.append(
                RecipeIngredient(**item)
            )

    if steps_data is not None:
        recipe.steps.clear()

        for item in steps_data:
            recipe.steps.append(
                RecipeStep(**item)
            )

    db.commit()
    db.refresh(recipe)

    create_audit_log(
        db=db,
        user_id=admin.id,
        action="ADMIN_UPDATE",
        entity_type="RECIPE",
        entity_id=recipe.id,
        details="Admin updated recipe details"
    )

    return recipe


# --------------------------------------------------
# GET FEATURED RECIPES FOR PUBLIC HOMEPAGE
# --------------------------------------------------

@router.get(
    "/featured",
    response_model=list[RecipeResponse]
)
def get_featured_recipes(
    db: Session = Depends(get_db)
):
    return db.query(Recipe).options(
        joinedload(Recipe.ingredients),
        joinedload(Recipe.steps)
    ).filter(
        Recipe.status == "published",
        Recipe.is_featured == True
    ).order_by(
        Recipe.created_at.desc()
    ).all()


# --------------------------------------------------
# ADMIN: MAKE OR REMOVE A RECIPE FROM FEATURED
# --------------------------------------------------

@router.put("/{recipe_id}/featured")
def update_featured_recipe(
    recipe_id: int,
    data: FeaturedRecipeUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    recipe = db.query(Recipe).filter(
        Recipe.id == recipe_id
    ).first()

    if not recipe:
        raise HTTPException(404, "Recipe not found")

    if recipe.status != "published":
        raise HTTPException(
            400,
            "Only published recipes can be featured"
        )

    recipe.is_featured = data.is_featured

    db.commit()
    db.refresh(recipe)

    create_audit_log(
        db=db,
        user_id=admin.id,
        action="FEATURE" if data.is_featured else "UNFEATURE",
        entity_type="RECIPE",
        entity_id=recipe.id,
        details=(
            "Recipe added to featured list"
            if data.is_featured
            else "Recipe removed from featured list"
        )
    )

    return {
        "message": (
            "Recipe added to featured list"
            if data.is_featured
            else "Recipe removed from featured list"
        ),
        "recipe_id": recipe.id,
        "is_featured": recipe.is_featured
    }


# --------------------------------------------------
# 1. CREATE RECIPE (SAVED AS DRAFT)
# --------------------------------------------------

@router.post(
    "",
    response_model=RecipeResponse,
    status_code=201
)
def create_recipe(
    data: RecipeCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # CHECK ADMIN SUBMISSION SETTINGS
    settings = db.query(AdminSetting).filter(
        AdminSetting.id == 1
    ).first()

    if settings and not settings.recipe_submissions:
        raise HTTPException(
            status_code=403,
            detail="Recipe submissions are currently disabled"
        )

    # CHECK CATEGORY
    category = db.get(Category, data.category_id)

    if not category or category.status != "active":
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    # CREATE RECIPE
    recipe = Recipe(
        author_id=user.id,
        category_id=data.category_id,
        title=data.title,
        description=data.description,
        image_url=data.image_url,
        prep_time_minutes=data.prep_time_minutes,
        cook_time_minutes=data.cook_time_minutes,
        servings=data.servings,
        difficulty=data.difficulty,
        status="draft"
    )

    # ADD INGREDIENTS
    for item in data.ingredients:
        recipe.ingredients.append(
            RecipeIngredient(**item.model_dump())
        )

    # ADD STEPS
    for item in data.steps:
        recipe.steps.append(
            RecipeStep(**item.model_dump())
        )

    db.add(recipe)
    db.commit()
    db.refresh(recipe)

    # AUDIT LOG
    create_audit_log(
        db=db,
        user_id=user.id,
        action="CREATE",
        entity_type="RECIPE",
        entity_id=recipe.id,
        details="Recipe created successfully"
    )

    return recipe


# --------------------------------------------------
# 2. LIST PUBLISHED RECIPES
# --------------------------------------------------

@router.get(
    "",
    response_model=PaginatedRecipeResponse
)
def list_recipes(
    search: str | None = None,
    category_id: int | None = None,
    difficulty: str | None = None,
    max_prep_time: int | None = Query(default=None, ge=0),
    tag_id: int | None = None,
    sort_by: str = "created_at",
    order: str = "desc",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Recipe).filter(
        Recipe.status == "published"
    )

    if search:
        query = query.filter(
            or_(
                Recipe.title.ilike(f"%{search}%"),
                Recipe.description.ilike(f"%{search}%")
            )
        )

    if category_id:
        query = query.filter(
            Recipe.category_id == category_id
        )

    if difficulty:
        query = query.filter(
            Recipe.difficulty == difficulty
        )

    if max_prep_time is not None:
        query = query.filter(
            Recipe.prep_time_minutes <= max_prep_time
        )

    if tag_id:
        query = query.join(
            RecipeTag,
            Recipe.id == RecipeTag.recipe_id
        ).filter(
            RecipeTag.tag_id == tag_id
        )

    total = query.distinct().count()

    sort_options = {
        "created_at": Recipe.created_at,
        "title": Recipe.title,
        "prep_time": Recipe.prep_time_minutes
    }

    if sort_by not in sort_options:
        raise HTTPException(400, "Invalid sort field")

    if order not in ["asc", "desc"]:
        raise HTTPException(400, "Order must be asc or desc")

    sort_column = sort_options[sort_by]

    if order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    recipes = query.distinct().options(
        joinedload(Recipe.ingredients),
        joinedload(Recipe.steps)
    ).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    return {
        "items": recipes,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


# --------------------------------------------------
# 3. LIST RECIPES CREATED BY LOGGED-IN USER
# --------------------------------------------------

@router.get(
    "/my-recipes",
    response_model=list[RecipeResponse]
)
def list_my_recipes(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    recipes = db.query(Recipe).options(
        joinedload(Recipe.ingredients),
        joinedload(Recipe.steps)
    ).filter(
        Recipe.author_id == user.id,
        Recipe.status != "archived"
    ).order_by(
        Recipe.created_at.desc()
    ).all()

    recipe_ids = [recipe.id for recipe in recipes]

    rejection_records = db.query(RecipeModeration).filter(
        RecipeModeration.recipe_id.in_(recipe_ids),
        RecipeModeration.status == "rejected"
    ).order_by(
        RecipeModeration.reviewed_at.desc()
    ).all() if recipe_ids else []

    latest_reasons = {}

    for record in rejection_records:
        if record.recipe_id not in latest_reasons:
            latest_reasons[record.recipe_id] = record.comments

    for recipe in recipes:
        recipe.rejection_reason = latest_reasons.get(recipe.id)

    return recipes


# --------------------------------------------------
# 4. GET RECIPE DETAILS
# --------------------------------------------------

@router.get(
    "/{recipe_id}",
    response_model=RecipeResponse
)
def get_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    recipe = db.query(Recipe).options(
        joinedload(Recipe.ingredients),
        joinedload(Recipe.steps)
    ).filter(
        Recipe.id == recipe_id
    ).first()

    if not recipe:
        raise HTTPException(404, "Recipe not found")

    if recipe.status != "published":
        check_recipe_access(recipe, user)

    return recipe


# --------------------------------------------------
# 5. GET TAGS ASSIGNED TO A RECIPE
# --------------------------------------------------

@router.get(
    "/{recipe_id}/tags",
    response_model=list[TagResponse]
)
def get_recipe_tags(
    recipe_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    recipe = db.get(Recipe, recipe_id)

    if not recipe:
        raise HTTPException(404, "Recipe not found")

    if recipe.status != "published":
        check_recipe_access(recipe, user)

    tags = db.query(DietaryTag).join(
        RecipeTag,
        DietaryTag.id == RecipeTag.tag_id
    ).filter(
        RecipeTag.recipe_id == recipe_id
    ).order_by(
        DietaryTag.name
    ).all()

    return tags


# --------------------------------------------------
# 6. ASSIGN A TAG TO A RECIPE
# --------------------------------------------------

@router.post("/{recipe_id}/tags")
def assign_recipe_tag(
    recipe_id: int,
    data: RecipeTagAssign,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    recipe = db.get(Recipe, recipe_id)

    if not recipe:
        raise HTTPException(404, "Recipe not found")

    check_recipe_access(recipe, user)

    if recipe.status not in ["draft", "rejected"]:
        raise HTTPException(
            400,
            "Tags can only be assigned to draft or rejected recipes"
        )

    tag = db.get(DietaryTag, data.tag_id)

    if not tag:
        raise HTTPException(404, "Tag not found")

    existing = db.query(RecipeTag).filter(
        RecipeTag.recipe_id == recipe_id,
        RecipeTag.tag_id == data.tag_id
    ).first()

    if existing:
        raise HTTPException(
            409,
            "Tag already assigned to this recipe"
        )

    recipe_tag = RecipeTag(
        recipe_id=recipe_id,
        tag_id=data.tag_id
    )

    db.add(recipe_tag)
    db.commit()

    return {
        "message": "Tag assigned successfully",
        "recipe_id": recipe_id,
        "tag_id": data.tag_id
    }


# --------------------------------------------------
# 7. REMOVE A TAG FROM A RECIPE
# --------------------------------------------------

@router.delete("/{recipe_id}/tags/{tag_id}")
def remove_recipe_tag(
    recipe_id: int,
    tag_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    recipe = db.get(Recipe, recipe_id)

    if not recipe:
        raise HTTPException(404, "Recipe not found")

    check_recipe_access(recipe, user)

    if recipe.status not in ["draft", "rejected"]:
        raise HTTPException(
            400,
            "Tags can only be removed from draft or rejected recipes"
        )

    recipe_tag = db.query(RecipeTag).filter(
        RecipeTag.recipe_id == recipe_id,
        RecipeTag.tag_id == tag_id
    ).first()

    if not recipe_tag:
        raise HTTPException(
            404,
            "Tag assignment not found"
        )

    db.delete(recipe_tag)
    db.commit()

    return {"message": "Recipe tag removed successfully"}


# --------------------------------------------------
# 8. UPDATE A DRAFT OR REJECTED RECIPE
# --------------------------------------------------

@router.put(
    "/{recipe_id}",
    response_model=RecipeResponse
)
def update_recipe(
    recipe_id: int,
    data: RecipeUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    recipe = db.get(Recipe, recipe_id)

    if not recipe:
        raise HTTPException(404, "Recipe not found")

    check_recipe_access(recipe, user)

    if recipe.status not in ["draft", "rejected"]:
        raise HTTPException(
            400,
            "Only draft or rejected recipes can be edited"
        )

    updates = data.model_dump(exclude_unset=True)

    ingredients_data = updates.pop("ingredients", None)
    steps_data = updates.pop("steps", None)

    if "category_id" in updates:
        category = db.get(Category, updates["category_id"])

        if not category or category.status != "active":
            raise HTTPException(
                404,
                "Category not found"
            )

    for key, value in updates.items():
        setattr(recipe, key, value)

    if ingredients_data is not None:
        recipe.ingredients.clear()

        for item in ingredients_data:
            recipe.ingredients.append(
                RecipeIngredient(**item)
            )

    if steps_data is not None:
        recipe.steps.clear()

        for item in steps_data:
            recipe.steps.append(
                RecipeStep(**item)
            )

    db.commit()
    db.refresh(recipe)

    create_audit_log(
        db=db,
        user_id=user.id,
        action="UPDATE",
        entity_type="RECIPE",
        entity_id=recipe.id,
        details="Recipe updated successfully"
    )

    return recipe


# --------------------------------------------------
# 9. ARCHIVE A RECIPE
# --------------------------------------------------

@router.delete("/{recipe_id}")
def delete_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    recipe = db.get(Recipe, recipe_id)

    if not recipe:
        raise HTTPException(404, "Recipe not found")

    check_recipe_access(recipe, user)

    recipe.status = "archived"
    db.commit()

    create_audit_log(
        db=db,
        user_id=user.id,
        action="DELETE",
        entity_type="RECIPE",
        entity_id=recipe.id,
        details="Recipe archived successfully"
    )

    return {"message": "Recipe archived successfully"}


# --------------------------------------------------
# 10. SUBMIT RECIPE FOR ADMIN APPROVAL
# --------------------------------------------------


# --------------------------------------------------
# 10. SUBMIT RECIPE FOR ADMIN APPROVAL
# --------------------------------------------------

@router.post("/{recipe_id}/submit")
def submit_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    recipe = db.get(Recipe, recipe_id)

    if not recipe:
        raise HTTPException(404, "Recipe not found")

    check_recipe_access(recipe, user)

    if recipe.status not in ["draft", "rejected"]:
        raise HTTPException(
            400,
            "Recipe cannot be submitted"
        )

    if not recipe.ingredients or not recipe.steps:
        raise HTTPException(
            400,
            "Add ingredients and steps first"
        )

    settings = db.query(AdminSetting).filter(
        AdminSetting.id == 1
    ).first()

    if settings and not settings.recipe_submissions:
        raise HTTPException(
            status_code=403,
            detail="Recipe submissions are currently disabled"
        )

    if settings and settings.automatic_approval:

        recipe.status = "published"

        moderation = RecipeModeration(
            recipe_id=recipe.id,
            moderator_id=None,
            status="approved",
            comments="Automatically approved by admin settings"
        )

        db.add(moderation)

        # Notify recipe author about automatic approval
        notification = Notification(
            recipient_id=user.id,
            actor_id=None,
            recipe_id=recipe.id,
            type="recipe-approved",
            title="Recipe Approved!",
            message=(
                f'Your recipe "{recipe.title}" '
                "has been automatically approved and published."
            ),
            is_read=False
        )

        db.add(notification)

        message = "Recipe submitted and automatically approved"
        audit_action = "AUTO_APPROVE"
        audit_details = "Recipe automatically approved by admin settings"

    else:

        recipe.status = "pending"

        # Find all admins and moderators
        moderators = db.query(User).filter(
            User.role.in_(["admin", "moderator"]),
            User.id != user.id
        ).all()

        # Notify admins and moderators about the submission
        for moderator in moderators:
            notification = Notification(
                recipient_id=moderator.id,
                actor_id=user.id,
                recipe_id=recipe.id,
                type="recipe-submitted",
                title="New Recipe Submitted",
                message=(
                    f'{user.display_name} submitted '
                    f'"{recipe.title}" for moderation.'
                ),
                is_read=False
            )

            db.add(notification)

        message = "Recipe submitted for moderation"
        audit_action = "SUBMIT"
        audit_details = "Recipe submitted for moderation"

    db.commit()
    db.refresh(recipe)

    create_audit_log(
        db=db,
        user_id=user.id,
        action=audit_action,
        entity_type="RECIPE",
        entity_id=recipe.id,
        details=audit_details
    )

    return {"message": message}
