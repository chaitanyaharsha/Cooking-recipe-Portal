
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.api.dependencies import get_current_user, require_admin
from app.models.report import ContentReport
from app.models.recipe import Recipe
from app.models.review import Review
from app.models.user import User
from app.models.admin_setting import AdminSetting
from app.schemas.report import ReportCreate, ReportResponse
from app.services.audit_services import create_audit_log
from app.models.rating import Rating

router = APIRouter(prefix="/reports", tags=["Content Reports"])


# ---------------- DATABASE RECIPE REPORT ----------------

@router.post("/recipe/{recipe_id}", response_model=ReportResponse, status_code=201)
def report_recipe(
    recipe_id: int,
    report_data: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    recipe = db.query(Recipe).filter(
        Recipe.id == recipe_id
    ).first()

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    new_report = ContentReport(
        reporter_id=current_user.id,
        recipe_id=recipe_id,
        static_recipe_id=None,
        reason=report_data.reason,
        details=report_data.details
    )

    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    return new_report


# ---------------- STATIC RECIPE REPORT ----------------

@router.post("/static/recipe/{static_recipe_id}", response_model=ReportResponse, status_code=201)
def report_static_recipe(
    static_recipe_id: str,
    report_data: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not static_recipe_id.strip():
        raise HTTPException(status_code=400, detail="Invalid static recipe ID")

    new_report = ContentReport(
        reporter_id=current_user.id,
        recipe_id=None,
        static_recipe_id=static_recipe_id,
        reason=report_data.reason,
        details=report_data.details
    )

    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    return new_report


# ---------------- REVIEW REPORT ----------------

@router.post("/review/{review_id}", response_model=ReportResponse, status_code=201)
def report_review(
    review_id: int,
    report_data: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    settings = db.query(AdminSetting).filter(
        AdminSetting.id == 1
    ).first()

    if settings and not settings.review_reports:
        raise HTTPException(
            status_code=403,
            detail="Review reporting is currently disabled"
        )

    review = db.query(Review).filter(
        Review.id == review_id
    ).first()

    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    new_report = ContentReport(
        reporter_id=current_user.id,
        review_id=review_id,
        reason=report_data.reason,
        details=report_data.details
    )

    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    return new_report


# ---------------- ADMIN: VIEW ALL REPORTS ----------------

@router.get("/", response_model=list[ReportResponse])
def get_reports(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    return db.query(ContentReport).order_by(
        ContentReport.created_at.desc()
    ).all()


# ---------------- ADMIN: GET REPORTED REVIEWS ----------------

@router.get("/review-reports")
def get_review_reports(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    reports = (
        db.query(ContentReport)
        .filter(ContentReport.review_id.isnot(None))
        .order_by(ContentReport.created_at.desc())
        .all()
    )

    result = []

    for report in reports:
        review = db.query(Review).filter(
            Review.id == report.review_id
        ).first()

        if not review:
            continue

        reviewer = db.query(User).filter(
            User.id == review.user_id
        ).first()

        reporter = db.query(User).filter(
            User.id == report.reporter_id
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

        recipe = None

        if review.recipe_id is not None:
            recipe = db.query(Recipe).filter(
                Recipe.id == review.recipe_id
            ).first()

        result.append({
            "id": report.id,
            "review_id": review.id,
            "recipe_id": review.recipe_id,
            "static_recipe_id": review.static_recipe_id,
            "recipe_name": recipe.title if recipe else None,
            "review_name": reviewer.display_name if reviewer else "User",
            "review_comment": review.comment,
            "review_rating": rating.score if rating else 0,
            "reported_by": reporter.display_name if reporter else "User",
            "reason": report.reason,
            "details": report.details,
            "status": report.status,
            "review_status": review.status,
            "date": report.created_at
        })

    return result


# ---------------- ADMIN: UPDATE REPORT STATUS ----------------

@router.put("/{report_id}/status", response_model=ReportResponse)
def update_report_status(
    report_id: int,
    status: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    allowed_statuses = ["pending", "reviewed", "dismissed"]

    status = status.strip().lower()

    if status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid report status"
        )

    report = db.query(ContentReport).filter(
        ContentReport.id == report_id
    ).first()

    if not report:
        raise HTTPException(
            status_code=404,
            detail="Report not found"
        )

    report.status = status
    report.resolved_by = admin.id if status in ["reviewed", "dismissed"] else None

    db.commit()
    db.refresh(report)

    create_audit_log(
        db=db,
        user_id=admin.id,
        action="UPDATE_STATUS",
        entity_type="REPORT",
        entity_id=report.id,
        details=f"Report status changed to {status}"
    )

    return report


# ---------------- ADMIN: RESOLVE REPORT ----------------

@router.put("/{report_id}/resolve", response_model=ReportResponse)
def resolve_report(
    report_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    report = db.query(ContentReport).filter(
        ContentReport.id == report_id
    ).first()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if report.status == "resolved":
        raise HTTPException(
            status_code=400,
            detail="Report is already resolved"
        )

    report.status = "resolved"
    report.resolved_by = admin.id

    db.commit()
    db.refresh(report)

    create_audit_log(
        db=db,
        user_id=admin.id,
        action="RESOLVE",
        entity_type="REPORT",
        entity_id=report.id,
        details="Content report resolved by admin"
    )

    return report
