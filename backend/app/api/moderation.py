
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.recipe import Recipe
from app.models.moderation import RecipeModeration
from app.models.notification import Notification
from app.models.user import User
from app.api.dependencies import require_moderator_or_admin
from app.services.audit_services import create_audit_log


router = APIRouter(
    prefix="/moderation",
    tags=["Moderation"]
)


# 1. View all pending recipes
@router.get("/pending")
def get_pending_recipes(
    db: Session = Depends(get_db),
    moderator: User = Depends(require_moderator_or_admin)
):
    recipes = db.query(Recipe).filter(
        Recipe.status == "pending"
    ).order_by(
        Recipe.created_at.asc()
    ).all()

    return recipes


# 2. Approve a recipe
@router.post("/{recipe_id}/approve")
def approve_recipe(
    recipe_id: int,
    comments: str | None = None,
    db: Session = Depends(get_db),
    moderator: User = Depends(require_moderator_or_admin)
):
    recipe = db.query(Recipe).filter(
        Recipe.id == recipe_id
    ).first()

    if not recipe:
        raise HTTPException(
            status_code=404,
            detail="Recipe not found"
        )

    if recipe.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Recipe is not pending moderation"
        )

    recipe.status = "published"

    moderation = RecipeModeration(
        recipe_id=recipe.id,
        moderator_id=moderator.id,
        status="approved",
        comments=comments
    )

    # Create notification for recipe author
    notification = Notification(
        recipient_id=recipe.author_id,
        actor_id=moderator.id,
        recipe_id=recipe.id,
        type="recipe-approved",
        title="Recipe Approved!",
        message=(
            f'Your recipe "{recipe.title}" '
            f'has been approved and published.'
        ),
        is_read=False
    )

    db.add(moderation)
    db.add(notification)

    # Save recipe status, moderation and notification together
    db.commit()

    db.refresh(recipe)
    db.refresh(notification)

    create_audit_log(
        db=db,
        user_id=moderator.id,
        action="APPROVE",
        entity_type="RECIPE",
        entity_id=recipe.id,
        details="Recipe approved by moderator/admin"
    )

    return {
        "message": "Recipe approved and published successfully"
    }


# 3. Reject a recipe
@router.post("/{recipe_id}/reject")
def reject_recipe(
    recipe_id: int,
    comments: str,
    db: Session = Depends(get_db),
    moderator: User = Depends(require_moderator_or_admin)
):
    if not comments or not comments.strip():
        raise HTTPException(
            status_code=400,
            detail="Rejection reason is required"
        )

    recipe = db.query(Recipe).filter(
        Recipe.id == recipe_id
    ).first()

    if not recipe:
        raise HTTPException(
            status_code=404,
            detail="Recipe not found"
        )

    if recipe.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Recipe is not pending moderation"
        )

    recipe.status = "rejected"

    moderation = RecipeModeration(
        recipe_id=recipe.id,
        moderator_id=moderator.id,
        status="rejected",
        comments=comments.strip()
    )

    # Create notification for recipe author
    notification = Notification(
        recipient_id=recipe.author_id,
        actor_id=moderator.id,
        recipe_id=recipe.id,
        type="recipe-rejected",
        title="Recipe Needs Changes",
        message=(
            f'Your recipe "{recipe.title}" was not approved. '
            f"Reason: {comments.strip()}"
        ),
        is_read=False
    )

    db.add(moderation)
    db.add(notification)

    # Save recipe status, moderation and notification together
    db.commit()

    db.refresh(recipe)
    db.refresh(notification)

    create_audit_log(
        db=db,
        user_id=moderator.id,
        action="REJECT",
        entity_type="RECIPE",
        entity_id=recipe.id,
        details="Recipe rejected by moderator/admin"
    )

    return {
        "message": "Recipe rejected successfully"
    }


# 4. Moderator dashboard statistics
@router.get("/stats")
def get_moderation_stats(
    db: Session = Depends(get_db),
    moderator: User = Depends(require_moderator_or_admin)
):
    total_users = db.query(User).count()

    total_recipes = db.query(Recipe).filter(
        Recipe.status != "archived"
    ).count()

    pending_recipes = db.query(Recipe).filter(
        Recipe.status == "pending"
    ).count()

    approved_recipes = db.query(Recipe).filter(
        Recipe.status == "published"
    ).count()

    rejected_recipes = db.query(Recipe).filter(
        Recipe.status == "rejected"
    ).count()

    return {
        "total_users": total_users,
        "total_recipes": total_recipes,
        "pending_recipes": pending_recipes,
        "approved_recipes": approved_recipes,
        "rejected_recipes": rejected_recipes
    }


# 5. Moderation history
@router.get("/history")
def get_moderation_history(
    db: Session = Depends(get_db),
    moderator: User = Depends(require_moderator_or_admin)
):
    history = db.query(
        RecipeModeration,
        Recipe,
        User
    ).join(
        Recipe,
        RecipeModeration.recipe_id == Recipe.id
    ).outerjoin(
        User,
        RecipeModeration.moderator_id == User.id
    ).order_by(
        RecipeModeration.reviewed_at.desc()
    ).all()

    return [
        {
            "id": moderation.id,
            "recipe_id": recipe.id,
            "recipe_title": recipe.title,
            "author_id": recipe.author_id,
            "moderator_id": moderation.moderator_id,
            "moderator_name": (
                moderator_user.display_name
                if moderator_user else "Unknown"
            ),
            "status": moderation.status,
            "comments": moderation.comments,
            "reviewed_at": moderation.reviewed_at
        }
        for moderation, recipe, moderator_user in history
    ]
