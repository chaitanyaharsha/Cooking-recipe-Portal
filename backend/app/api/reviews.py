
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, or_

from app.db.database import get_db
from app.models.review import Review
from app.models.rating import Rating
from app.models.recipe import Recipe
from app.models.user import User
from app.models.admin_setting import AdminSetting
from app.schemas.review import ReviewCreate, ReviewUpdate, ReviewResponse
from app.api.dependencies import get_current_user, require_admin
from app.models.notification import Notification


router = APIRouter(prefix="/reviews", tags=["Reviews"])


def get_review_response(db: Session, review: Review):
    user = db.query(User).filter(
        User.id == review.user_id
    ).first()

    if review.recipe_id is not None:
        rating = db.query(Rating).filter(
            Rating.user_id == review.user_id,
            Rating.recipe_id == review.recipe_id
        ).first()
    else:
        rating = db.query(Rating).filter(
            Rating.user_id == review.user_id,
            Rating.static_recipe_id == review.static_recipe_id
        ).first()

    recipe_name = None

    if review.recipe_id is not None:
        recipe = db.query(Recipe).filter(
            Recipe.id == review.recipe_id
        ).first()

        if recipe:
            recipe_name = recipe.title

    return {
        "id": review.id,
        "user_id": review.user_id,
        "recipe_id": review.recipe_id,
        "static_recipe_id": review.static_recipe_id,
        "recipeName": recipe_name,
        "comment": review.comment,
        "status": review.status,
        "display_name": user.display_name if user else "User",
        "rating": rating.score if rating else None,
        "created_at": review.created_at
    }


def is_admin(user: User):
    return str(
        getattr(user, "role", "")
    ).strip().lower() == "admin"


def check_reviews_enabled(db: Session):
    settings = db.query(AdminSetting).filter(
        AdminSetting.id == 1
    ).first()

    if settings and not settings.reviews_enabled:
        raise HTTPException(
            status_code=403,
            detail="Reviews are currently disabled"
        )


# ---------------- DATABASE RECIPE REVIEWS ----------------


@router.post("/{recipe_id}", response_model=ReviewResponse)
def create_review(
    recipe_id: int,
    review_data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_reviews_enabled(db)

    recipe = db.query(Recipe).filter(
        Recipe.id == recipe_id
    ).first()

    if not recipe or recipe.status != "published":
        raise HTTPException(
            status_code=404,
            detail="Published recipe not found"
        )

    existing = db.query(Review).filter(
        Review.user_id == current_user.id,
        Review.recipe_id == recipe_id,
        Review.status != "deleted"
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="You have already reviewed this recipe"
        )

    review = Review(
        user_id=current_user.id,
        recipe_id=recipe_id,
        static_recipe_id=None,
        comment=review_data.comment
    )

    db.add(review)

    # Notify the recipe author when another user submits a review
    if recipe.author_id != current_user.id:
        notification = Notification(
            recipient_id=recipe.author_id,
            actor_id=current_user.id,
            recipe_id=recipe.id,
            type="new-review",
            title="New Review Received!",
            message=(
                f"{current_user.display_name} reviewed your recipe "
                f'"{recipe.title}".'
            ),
            is_read=False
        )

        db.add(notification)

    db.commit()
    db.refresh(review)

    return get_review_response(db, review)


# ---------------- GET DATABASE RECIPE REVIEWS ----------------


@router.get(
    "/recipe/{recipe_id}",
    response_model=list[ReviewResponse]
)
def get_recipe_reviews(
    recipe_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    recipe = db.query(Recipe).filter(
        Recipe.id == recipe_id
    ).first()

    if not recipe:
        raise HTTPException(
            status_code=404,
            detail="Recipe not found"
        )

    query = db.query(Review).filter(
        Review.recipe_id == recipe_id,
        Review.status != "deleted"
    )

    role = str(
        getattr(current_user, "role", "")
    ).strip().lower()

    if role not in ["admin", "moderator"]:
        query = query.filter(
            Review.status == "active"
        )

    reviews = query.order_by(
        Review.created_at.desc()
    ).all()

    return [
        get_review_response(db, review)
        for review in reviews
    ]


# ---------------- STATIC RECIPE REVIEWS ----------------


@router.post("/static/{static_recipe_id}", response_model=ReviewResponse)
def create_static_review(
    static_recipe_id: str,
    review_data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_reviews_enabled(db)

    if not static_recipe_id.strip():
        raise HTTPException(
            status_code=400,
            detail="Invalid static recipe ID"
        )

    existing = db.query(Review).filter(
        Review.user_id == current_user.id,
        Review.static_recipe_id == static_recipe_id,
        Review.status != "deleted"
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="You have already reviewed this recipe"
        )

    review = Review(
        user_id=current_user.id,
        recipe_id=None,
        static_recipe_id=static_recipe_id,
        comment=review_data.comment
    )

    db.add(review)
    db.commit()
    db.refresh(review)

    return get_review_response(db, review)


@router.get(
    "/static/{static_recipe_id}",
    response_model=list[ReviewResponse]
)
def get_static_recipe_reviews(
    static_recipe_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    reviews = (
        db.query(Review)
        .filter(
            Review.static_recipe_id == static_recipe_id,
            Review.status == "active"
        )
        .order_by(Review.created_at.desc())
        .all()
    )

    return [
        get_review_response(db, review)
        for review in reviews
    ]


# ---------------- UPDATE REVIEW ----------------


@router.put("/{review_id}", response_model=ReviewResponse)
def update_review(
    review_id: int,
    review_data: ReviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    review = db.query(Review).filter(
        Review.id == review_id
    ).first()

    if not review:
        raise HTTPException(
            status_code=404,
            detail="Review not found"
        )

    if review.status == "deleted":
        raise HTTPException(
            status_code=404,
            detail="Deleted review cannot be updated"
        )

    if review.user_id != current_user.id and not is_admin(current_user):
        raise HTTPException(
            status_code=403,
            detail="Not authorized to update this review"
        )

    review.comment = review_data.comment

    db.commit()
    db.refresh(review)

    return get_review_response(db, review)


# ---------------- DELETE REVIEW ----------------


@router.delete("/{review_id}")
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    review = db.query(Review).filter(
        Review.id == review_id
    ).first()

    if not review:
        raise HTTPException(
            status_code=404,
            detail="Review not found"
        )

    if review.user_id != current_user.id and not is_admin(current_user):
        raise HTTPException(
            status_code=403,
            detail="Not authorized to delete this review"
        )

    if review.status == "deleted":
        raise HTTPException(
            status_code=400,
            detail="Review is already deleted"
        )

    review.status = "deleted"

    db.commit()

    return {
        "message": "Review deleted successfully"
    }


# ---------------- MY REVIEWS ----------------


@router.get("/my-reviews")
def get_my_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rating_match = and_(
        Rating.user_id == Review.user_id,
        or_(
            and_(
                Review.recipe_id.isnot(None),
                Rating.recipe_id == Review.recipe_id
            ),
            and_(
                Review.static_recipe_id.isnot(None),
                Rating.static_recipe_id == Review.static_recipe_id
            )
        )
    )

    reviews = (
        db.query(
            Review.id,
            Review.user_id,
            Review.recipe_id,
            Review.static_recipe_id,
            Review.comment,
            Review.status,
            Review.created_at,
            Recipe.title.label("recipe_name"),
            Rating.score.label("rating")
        )
        .outerjoin(
            Recipe,
            Review.recipe_id == Recipe.id
        )
        .outerjoin(
            Rating,
            rating_match
        )
        .filter(
            Review.user_id == current_user.id,
            Review.status != "deleted"
        )
        .order_by(
            desc(Review.created_at)
        )
        .all()
    )

    return [
        {
            "id": review.id,
            "user_id": review.user_id,
            "recipe_id": review.recipe_id,
            "static_recipe_id": review.static_recipe_id,
            "recipeName": review.recipe_name,
            "rating": review.rating or 0,
            "comment": review.comment,
            "status": review.status,
            "created_at": review.created_at
        }
        for review in reviews
    ]


# ---------------- ADMIN: HIDE OR RESTORE REVIEW ----------------


@router.put("/{review_id}/visibility")
def update_review_visibility(
    review_id: int,
    is_hidden: bool,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    review = db.query(Review).filter(
        Review.id == review_id
    ).first()

    if not review:
        raise HTTPException(
            status_code=404,
            detail="Review not found"
        )

    if review.status == "deleted":
        raise HTTPException(
            status_code=400,
            detail="Deleted reviews cannot be restored or modified"
        )

    review.status = "hidden" if is_hidden else "active"

    db.commit()
    db.refresh(review)

    return {
        "message": "Review hidden successfully" if is_hidden
        else "Review restored successfully",
        "id": review.id,
        "status": review.status
    }
