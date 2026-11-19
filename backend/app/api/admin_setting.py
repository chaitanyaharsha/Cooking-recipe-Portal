from sqlalchemy import func
from app.models.user import User
from app.models.recipe import Recipe
from app.models.review import Review
from app.models.rating import Rating
from app.models.category import Category
from app.models.audit_log import AuditLog
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.api.dependencies import require_admin
from app.models.admin_setting import AdminSetting
from app.schemas.admin_setting import (
    AdminSettingUpdate,
    AdminSettingResponse
)

router = APIRouter(
    prefix="/admin/settings",
    tags=["Admin Settings"]
)


def get_or_create_settings(db: Session):
    settings = db.query(AdminSetting).filter(
        AdminSetting.id == 1
    ).first()

    if not settings:
        settings = AdminSetting(
            id=1,
            recipe_submissions=True,
            reviews_enabled=True,
            review_reports=True,
            automatic_approval=False
        )

        db.add(settings)
        db.commit()
        db.refresh(settings)

    return settings


@router.get("", response_model=AdminSettingResponse)
def get_admin_settings(
    db: Session = Depends(get_db),
    current_admin=Depends(require_admin)
):
    return get_or_create_settings(db)


@router.put("", response_model=AdminSettingResponse)
def update_admin_settings(
    data: AdminSettingUpdate,
    db: Session = Depends(get_db),
    current_admin=Depends(require_admin)
):
    updates = data.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=400,
            detail="No settings provided"
        )

    settings = get_or_create_settings(db)

    for key, value in updates.items():
        setattr(settings, key, value)

    db.commit()
    db.refresh(settings)

    return settings 

@router.get("/analytics")
def get_admin_analytics(
    db: Session = Depends(get_db),
    current_admin=Depends(require_admin)
):
    # Summary statistics
    total_users = db.query(func.count(User.id)).scalar() or 0

    total_recipes = db.query(func.count(Recipe.id)).filter(
        Recipe.status != "archived"
    ).scalar() or 0

    total_reviews = db.query(func.count(Review.id)).filter(
        Review.status == "active"
    ).scalar() or 0

    average_rating = db.query(
        func.avg(Rating.score)
    ).scalar()

    average_rating = round(float(average_rating or 0), 1)

    # Recipe moderation statistics
    approved = db.query(func.count(Recipe.id)).filter(
        Recipe.status == "published"
    ).scalar() or 0

    pending = db.query(func.count(Recipe.id)).filter(
        Recipe.status == "pending"
    ).scalar() or 0

    rejected = db.query(func.count(Recipe.id)).filter(
        Recipe.status == "rejected"
    ).scalar() or 0

    # Recipes grouped by category
    category_rows = db.query(
        Category.name,
        func.count(Recipe.id)
    ).outerjoin(
        Recipe,
        Recipe.category_id == Category.id
    ).filter(
        Recipe.status != "archived"
    ).group_by(
        Category.id,
        Category.name
    ).order_by(
        func.count(Recipe.id).desc()
    ).all()

    category_data = [
        {
            "name": name,
            "count": count
        }
        for name, count in category_rows
    ]

    # Recent activity from actual audit logs
    audit_rows = db.query(
        AuditLog,
        User.display_name
    ).outerjoin(
        User,
        AuditLog.user_id == User.id
    ).order_by(
        AuditLog.created_at.desc()
    ).limit(10).all()

    activities = []

    for audit, display_name in audit_rows:

        action = (audit.action or "").upper()
        entity_type = (audit.entity_type or "").upper()

        if action == "CREATE" and entity_type == "RECIPE":
            activity_name = "New recipe submitted"
        elif action == "APPROVE" and entity_type == "RECIPE":
            activity_name = "Recipe approved"
        elif action == "REJECT" and entity_type == "RECIPE":
            activity_name = "Recipe rejected"
        elif action == "CREATE" and entity_type == "REVIEW":
            activity_name = "New review added"
        else:
            activity_name = f"{audit.action} {audit.entity_type}"

        activities.append({
            "id": audit.id,
            "activity": activity_name,
            "user": display_name or "System",
            "date": (
                audit.created_at.strftime("%B %d, %Y")
                if audit.created_at else ""
            )
        })

    return {
        "reportData": {
            "totalUsers": total_users,
            "totalRecipes": total_recipes,
            "totalReviews": total_reviews,
            "averageRating": average_rating,
            "approved": approved,
            "pending": pending,
            "rejected": rejected
        },
        "categoryData": category_data,
        "activities": activities
    }