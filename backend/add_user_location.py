from sqlalchemy import inspect, text
from app.db.database import engine

inspector = inspect(engine)

columns = [
    column["name"]
    for column in inspector.get_columns("users")
]

if "location" not in columns:
    with engine.begin() as connection:
        connection.execute(
            text("ALTER TABLE users ADD COLUMN location VARCHAR(150) NULL")
        )

print("User profile database migration completed.")