// lib/types.ts

// The basic shape of a Recipe from our Explore page
export interface Recipe {
  id: string;
  title: string;
  prep_time_mins: number;
  cook_time_mins: number;
  default_servings: number;
  image_url?: string;
  overview?: string | null;
  likes_count?: number;
}

// The shape of an Ingredient when attached to a Recipe
export interface RecipeIngredient {
  quantity: number;
  unit: string;
  is_core: boolean;
  ingredients: {
    name: string;
  };
}

// The shape of a Step
export interface RecipeStep {
  step_number: number;
  instruction: string;
}

// The complete Recipe with its connected ingredients and steps (for the Detail page)
export interface RecipeDetail extends Recipe {
  recipe_ingredients: RecipeIngredient[];
  recipe_steps: RecipeStep[];
}

export interface CookingSession {
  id: string;
  user_id: string;
  recipe_id: string;
  current_step: number;
  status: string;
  modifications?: SessionModifications | null;
}

// The shape of the JSONB data stored in a user's session
export interface SessionModifications {
  ai_steps?: {
    [stepNumber: number]: string; // This tells TS: "The keys are numbers (steps), the values are strings (text)"
  };
  scratchpad?: string[];
}

// The shape of an Active Session joined with its Recipe details for the Home Page
export interface ActiveSessionWithRecipe extends CookingSession {
  recipes: {
    title: string;
    prep_time_mins: number;
    cook_time_mins: number;
    image_url?: string;
  };
}

// The shape of a Recipe when joined with its nested ingredient names (used for Search)
export interface RecipeWithIngredients extends Recipe {
  recipe_ingredients: {
    ingredients: {
      name: string;
    };
  }[];
}