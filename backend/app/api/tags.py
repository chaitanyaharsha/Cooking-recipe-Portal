
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.db.database import get_db
from app.models.dietary_tag import DietaryTag
from app.models.recipe_tag import RecipeTag
from app.schemas.tag import TagCreate, TagUpdate, TagResponse
from app.api.dependencies import require_admin

router = APIRouter(prefix="/tags", tags=["Recipe Tags"])


# View all tags
@router.get("", response_model=list[TagResponse])
def get_tags(db: Session = Depends(get_db)):
    return db.query(DietaryTag).order_by(DietaryTag.name).all()


# View one tag
@router.get("/{tag_id}", response_model=TagResponse)
def get_tag(
    tag_id: int,
    db: Session = Depends(get_db)
):
    tag = db.get(DietaryTag, tag_id)

    if not tag:
        raise HTTPException(404, "Tag not found")

    return tag


# Create tag (Admin only)
@router.post("", response_model=TagResponse, status_code=201)
def create_tag(
    data: TagCreate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    tag = DietaryTag(**data.model_dump())

    db.add(tag)

    try:
        db.commit()
        db.refresh(tag)

    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Tag name already exists")

    return tag


# Update tag (Admin only)
@router.put("/{tag_id}", response_model=TagResponse)
def update_tag(
    tag_id: int,
    data: TagUpdate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    tag = db.get(DietaryTag, tag_id)

    if not tag:
        raise HTTPException(404, "Tag not found")

    updates = data.model_dump(exclude_unset=True)

    for key, value in updates.items():
        setattr(tag, key, value)

    try:
        db.commit()
        db.refresh(tag)

    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Tag name already exists")

    return tag


# Delete tag (Admin only)
@router.delete("/{tag_id}")
def delete_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    tag = db.get(DietaryTag, tag_id)

    if not tag:
        raise HTTPException(404, "Tag not found")

    linked_recipe = db.query(RecipeTag).filter(
        RecipeTag.tag_id == tag_id
    ).first()

    if linked_recipe:
        raise HTTPException(
            409,
            "This tag is assigned to recipes and cannot be deleted."
        )

    db.delete(tag)
    db.commit()

    return {"message": "Tag deleted successfully"}
