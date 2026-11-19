
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.models.rating import Rating
from app.models.recipe import Recipe
from app.models.user import User
from app.schemas.rating import RatingCreate, RatingResponse
from app.api.dependencies import get_current_user


router = APIRouter(prefix="/ratings", tags=["Ratings"])


# =====================================================
# DATABASE RECIPE RATINGS
# =====================================================

# CREATE DATABASE RECIPE RATING

@router.post(
    "/{recipe_id}",
    response_model=RatingResponse,
    status_code=201
)
def create_rating(
    recipe_id: int,
    data: RatingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    recipe = db.query(Recipe).filter(
        Recipe.id == recipe_id,
        Recipe.status == "published"
    ).first()

    if not recipe:
        raise HTTPException(
            status_code=404,
            detail="Published recipe not found"
        )

    existing = db.query(Rating).filter(
        Rating.user_id == user.id,
        Rating.recipe_id == recipe_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="You have already rated this recipe. Update your existing rating."
        )

    rating = Rating(
        user_id=user.id,
        recipe_id=recipe_id,
        static_recipe_id=None,
        score=data.score
    )

    db.add(rating)
    db.commit()
    db.refresh(rating)

    return rating


# GET DATABASE RECIPE RATING SUMMARY

@router.get("/{recipe_id:int}/summary")
def get_rating_summary(
    recipe_id: int,
    db: Session = Depends(get_db)
):
    recipe = db.query(Recipe).filter(
        Recipe.id == recipe_id,
        Recipe.status == "published"
    ).first()

    if not recipe:
        raise HTTPException(
            status_code=404,
            detail="Published recipe not found"
        )

    result = db.query(
        func.count(Rating.id),
        func.avg(Rating.score)
    ).filter(
        Rating.recipe_id == recipe_id
    ).first()

    return {
        "recipe_id": recipe_id,
        "total_ratings": result[0],
        "average_rating": (
            round(float(result[1]), 2)
            if result[1] is not None else 0
        )
    }


# GET CURRENT USER DATABASE RECIPE RATING

@router.get(
    "/{recipe_id:int}/my-rating",
    response_model=RatingResponse
)
def get_my_rating(
    recipe_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    rating = db.query(Rating).filter(
        Rating.recipe_id == recipe_id,
        Rating.user_id == user.id
    ).first()

    if not rating:
        raise HTTPException(
            status_code=404,
            detail="You have not rated this recipe"
        )

    return rating


# UPDATE DATABASE RECIPE RATING

@router.put(
    "/{recipe_id}",
    response_model=RatingResponse
)
def update_rating(
    recipe_id: int,
    data: RatingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    rating = db.query(Rating).filter(
        Rating.recipe_id == recipe_id,
        Rating.user_id == user.id
    ).first()

    if not rating:
        raise HTTPException(
            status_code=404,
            detail="Rating not found"
        )

    rating.score = data.score

    db.commit()
    db.refresh(rating)

    return rating


# DELETE DATABASE RECIPE RATING

@router.delete("/{recipe_id}")
def delete_rating(
    recipe_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    rating = db.query(Rating).filter(
        Rating.recipe_id == recipe_id,
        Rating.user_id == user.id
    ).first()

    if not rating:
        raise HTTPException(
            status_code=404,
            detail="Rating not found"
        )

    db.delete(rating)
    db.commit()

    return {
        "message": "Rating deleted successfully"
    }


# =====================================================
# STATIC RECIPE RATINGS
# =====================================================

# CREATE STATIC RECIPE RATING

@router.post(
    "/static/{static_recipe_id}",
    response_model=RatingResponse,
    status_code=201
)
def create_static_rating(
    static_recipe_id: str,
    data: RatingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if not static_recipe_id.strip():
        raise HTTPException(
            status_code=400,
            detail="Invalid static recipe ID"
        )

    existing = db.query(Rating).filter(
        Rating.user_id == user.id,
        Rating.static_recipe_id == static_recipe_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="You have already rated this recipe. Update your existing rating."
        )

    rating = Rating(
        user_id=user.id,
        recipe_id=None,
        static_recipe_id=static_recipe_id,
        score=data.score
    )

    db.add(rating)
    db.commit()
    db.refresh(rating)

    return rating


# GET STATIC RECIPE RATING SUMMARY

@router.get("/static/{static_recipe_id}/summary")
def get_static_rating_summary(
    static_recipe_id: str,
    db: Session = Depends(get_db)
):
    if not static_recipe_id.strip():
        raise HTTPException(
            status_code=400,
            detail="Invalid static recipe ID"
        )

    result = db.query(
        func.count(Rating.id),
        func.avg(Rating.score)
    ).filter(
        Rating.static_recipe_id == static_recipe_id
    ).first()

    return {
        "static_recipe_id": static_recipe_id,
        "total_ratings": result[0],
        "average_rating": (
            round(float(result[1]), 2)
            if result[1] is not None else 0
        )
    }


# GET CURRENT USER STATIC RECIPE RATING

@router.get(
    "/static/{static_recipe_id}/my-rating",
    response_model=RatingResponse
)
def get_my_static_rating(
    static_recipe_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    rating = db.query(Rating).filter(
        Rating.static_recipe_id == static_recipe_id,
        Rating.user_id == user.id
    ).first()

    if not rating:
        raise HTTPException(
            status_code=404,
            detail="You have not rated this recipe"
        )

    return rating


# UPDATE STATIC RECIPE RATING

@router.put(
    "/static/{static_recipe_id}",
    response_model=RatingResponse
)
def update_static_rating(
    static_recipe_id: str,
    data: RatingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    rating = db.query(Rating).filter(
        Rating.static_recipe_id == static_recipe_id,
        Rating.user_id == user.id
    ).first()

    if not rating:
        raise HTTPException(
            status_code=404,
            detail="Rating not found"
        )

    rating.score = data.score

    db.commit()
    db.refresh(rating)

    return rating


# DELETE STATIC RECIPE RATING

@router.delete("/static/{static_recipe_id}")
def delete_static_rating(
    static_recipe_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    rating = db.query(Rating).filter(
        Rating.static_recipe_id == static_recipe_id,
        Rating.user_id == user.id
    ).first()

    if not rating:
        raise HTTPException(
            status_code=404,
            detail="Rating not found"
        )

    db.delete(rating)
    db.commit()

    return {
        "message": "Rating deleted successfully"
    }
