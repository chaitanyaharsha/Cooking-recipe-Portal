from pydantic import BaseModel, Field, ConfigDict


class IngredientCreate(BaseModel):
    ingredient_name: str
    quantity: str | None = None
    unit: str | None = None


class StepCreate(BaseModel):
    step_number: int = Field(ge=1)
    instruction: str


class RecipeCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str | None = None
    category_id: int
    image_url: str | None = None
    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None
    servings: int = Field(default=1, ge=1)
    difficulty: str = "easy"
    ingredients: list[IngredientCreate]
    steps: list[StepCreate]


class IngredientResponse(BaseModel):
    id: int
    ingredient_name: str
    quantity: str | None
    unit: str | None

    model_config = ConfigDict(from_attributes=True)


class StepResponse(BaseModel):
    id: int
    step_number: int
    instruction: str

    model_config = ConfigDict(from_attributes=True)



class RecipeUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category_id: int | None = None
    image_url: str | None = None
    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None
    servings: int | None = Field(default=None, ge=1)
    difficulty: str | None = None
    ingredients: list[IngredientCreate] | None = None
    steps: list[StepCreate] | None = None




class RecipeResponse(BaseModel):
    id: int
    author_id: int
    category_id: int
    title: str
    description: str | None
    image_url: str | None
    prep_time_minutes: int | None
    cook_time_minutes: int | None
    servings: int
    difficulty: str
    status: str
    ingredients: list[IngredientResponse]
    steps: list[StepResponse]
    rejection_reason: str | None = None
    is_featured: bool

    model_config = ConfigDict(from_attributes=True)

class PaginatedRecipeResponse(BaseModel):
    items: list[RecipeResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class FeaturedRecipeUpdate(BaseModel):
    is_featured: bool