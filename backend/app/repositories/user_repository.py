from sqlalchemy.orm import Session
from app.models.user import User

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def create_user(db: Session, display_name: str, email: str, password_hash: str):
    user = User(
        display_name=display_name,
        email=email,
        password_hash=password_hash,
        role="user",
        status="active"
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user