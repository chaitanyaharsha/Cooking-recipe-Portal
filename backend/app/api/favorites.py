
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.models.favorite import Favorite
from app.models.recipe import Recipe
from app.models.user import User
from app.api.dependencies import get_current_user
from app.schemas.recipe import RecipeResponse

router = APIRouter(prefix="/favorites", tags=["Favorites"])


# 1. Add recipe to favorites
@router.post("/{recipe_id}")
def add_favorite(
    recipe_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    recipe = db.query(Recipe).filter(
        Recipe.id == recipe_id,
        Recipe.status == "published"
    ).first()

    if not recipe:
        raise HTTPException(404, "Published recipe not found")

    existing = db.query(Favorite).filter(
        Favorite.user_id == user.id,
        Favorite.recipe_id == recipe_id
    ).first()

    if existing:
        raise HTTPException(400, "Recipe already in favorites")

    favorite = Favorite(
        user_id=user.id,
        recipe_id=recipe_id
    )

    db.add(favorite)
    db.commit()

    return {"message": "Recipe added to favorites successfully"}


# 2. Get my favorite recipes
@router.get("", response_model=list[RecipeResponse])
def get_favorites(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    recipes = db.query(Recipe).join(
        Favorite,
        Favorite.recipe_id == Recipe.id
    ).options(
        joinedload(Recipe.ingredients),
        joinedload(Recipe.steps)
    ).filter(
        Favorite.user_id == user.id,
        Recipe.status == "published"
    ).all()

    return recipes


# 3. Remove recipe from favorites
@router.delete("/{recipe_id}")
def remove_favorite(
    recipe_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    favorite = db.query(Favorite).filter(
        Favorite.user_id == user.id,
        Favorite.recipe_id == recipe_id
    ).first()

    if not favorite:
        raise HTTPException(404, "Favorite not found")

    db.delete(favorite)
    db.commit()

    return {"message": "Recipe removed from favorites successfully"}
