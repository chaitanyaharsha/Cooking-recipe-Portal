import os
import fastapi
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from app.db.database import engine, Base, SessionLocal

from app.models.category import Category
from app.models.dietary_tag import DietaryTag

# API Routers
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.categories import router as categories_router
from app.api.recipes import router as recipes_router
from app.api.moderation import router as moderation_router
from app.api.favorites import router as favorites_router
from app.api.reviews import router as reviews_router
from app.api.ratings import router as ratings_router
from app.api.reports import router as reports_router
from app.api.audit_logs import router as audit_logs_router
from app.api.uploads import router as uploads_router
from app.api.tags import router as tags_router
from app.api.admin_setting import router as admin_setting_router
from app.api.notifications import router as notifications_router


app = FastAPI(
    title="Cooking Recipe Portal API",
    description="Backend API for Cooking Recipe Portal",
    version="1.0.0"
)


# CORS Configuration for React + Vite
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register API Routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(categories_router)
app.include_router(recipes_router)
app.include_router(moderation_router)
app.include_router(favorites_router)
app.include_router(reviews_router)
app.include_router(ratings_router)
app.include_router(reports_router)
app.include_router(audit_logs_router)
app.include_router(uploads_router)
app.include_router(tags_router)
app.include_router(admin_setting_router)
app.include_router(notifications_router)


# Create Database Tables
Base.metadata.create_all(bind=engine)


# --------------------------------------------------
# SEED DEFAULT RECIPE CATEGORIES AND TAGS
# --------------------------------------------------

def seed_recipe_options():
    categories = [
        "Biryani",
        "Starters",
        "Main Course",
        "South Indian",
        "Chinese",
        "Italian",
        "Dessert"
    ]

    tags = [
        "Vegetarian",
        "Vegan",
        "Gluten-Free",
        "Dairy-Free",
        "Non-Vegetarian",
        "Milk",
        "Peanuts",
        "Tree Nuts",
        "Soy",
        "Wheat",
        "Eggs",
        "Fish",
        "Shellfish"
    ]

    with SessionLocal() as db:

        # Seed Categories
        for category_name in categories:
            existing_category = db.query(Category).filter(
                Category.name.ilike(category_name)
            ).first()

            if not existing_category:
                db.add(
                    Category(
                        name=category_name,
                        description="Recipe category",
                        status="active"
                    )
                )

        # Seed Dietary and Allergen Tags
        for tag_name in tags:
            existing_tag = db.query(DietaryTag).filter(
                DietaryTag.name.ilike(tag_name)
            ).first()

            if not existing_tag:
                db.add(
                    DietaryTag(
                        name=tag_name,
                        description="Recipe dietary or allergen tag"
                    )
                )

        db.commit()

    print("Default recipe categories and tags are ready.")


# Run seeding when FastAPI starts
@app.on_event("startup")
def startup_event():
    seed_recipe_options()


# Static Image Upload Directory
os.makedirs("uploads", exist_ok=True)

app.mount(
    "/uploads",
    fastapi.staticfiles.StaticFiles(directory="uploads"),
    name="uploads"
)


# Home API
@app.get("/")
def home():
    return {
        "message": "Welcome to Cooking Recipe Portal API"
    }


# Health Check API
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "message": "Backend is running successfully"
    }


# Database Connection Check
@app.get("/db-check")
def database_check():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))

        return {
            "message": "MySQL connected successfully",
            "result": result.scalar()
        }
