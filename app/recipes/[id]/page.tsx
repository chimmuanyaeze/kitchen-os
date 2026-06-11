"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Clock, Users, ArrowLeft, Heart, BookmarkPlus, Play } from "lucide-react";
import { RecipeDetail, RecipeStep } from "@/lib/types";

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingSession, setStartingSession] = useState(false);
  const [showPreflight, setShowPreflight] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchRecipeDetails() {

      const { data: { session: authSession } } = await supabase.auth.getSession();

      // Check if the recipe is already saved by this user
      if (authSession) {
      const { data: savedData } = await supabase
        .from("saved_recipes")
        .select("id")
        .eq("user_id", authSession.user.id)
        .eq("recipe_id", params.id)
        .single();

      if (savedData) {
        setIsSaved(true);
      }
    }
      // We use the ID from the URL to fetch the recipe AND its connected ingredients/steps
      const { data, error } = await supabase
        .from("recipes")
        .select(`
          *,
          recipe_ingredients (
            quantity,
            unit,
            is_core,
            ingredients (name)
          ),
          recipe_steps (
            step_number,
            instruction
          )
        `)
        .eq("id", params.id)
        .single(); // .single() tells Supabase we only expect ONE recipe back

      if (error) {
        console.error("Error fetching recipe:", error.message);
      } else {
        // Sort the steps so they are always in the correct 1, 2, 3 order
        if (data.recipe_steps) {
          data.recipe_steps.sort((a:RecipeStep, b:RecipeStep) => a.step_number - b.step_number);
        }
        setRecipe(data);
      }
      setLoading(false);
    }

    if (params.id) {
      fetchRecipeDetails();
    }
  }, [params.id]);

  

  // This function creates the cooking session and moves the user to the kitchen
  // 1. This just opens the confirmation modal
  const triggerPreflight = () => {
    setShowPreflight(true);
  };

  // 2. This runs ONLY when they click "Yes, I'm ready" inside the modal
  const confirmAndStartCooking = async () => {
    setStartingSession(true);
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push("/login");
      return;
    }

    const { data: newSession, error } = await supabase
      .from("cooking_sessions")
      .insert({
        user_id: session.user.id,
        recipe_id: recipe?.id,
        current_step: 1,
        status: "active"
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to start session:", error.message);
      setStartingSession(false);
    } else {
      router.push(`/cook/${newSession.id}`);
    }
  };

  const toggleSaveRecipe = async () => {
  setIsSaving(true);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    router.push("/login");
    return;
  }

  if (isSaved) {
    // Remove the bookmark
    await supabase
      .from("saved_recipes")
      .delete()
      .eq("user_id", session.user.id)
      .eq("recipe_id", recipe?.id);
    setIsSaved(false);
  } else {
    // Add the bookmark
    await supabase
      .from("saved_recipes")
      .insert({
        user_id: session.user.id,
        recipe_id: recipe?.id
      });
    setIsSaved(true);
  }
  setIsSaving(false);
};

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-500">Loading Recipe...</div>;
  }

  if (!recipe) {
    return <div className="p-6 text-center text-red-500">Recipe not found.</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      {/* Header Image Placeholder & Back Button */}
      <div className="relative h-64 bg-slate-200">
        <button
          type="button"
          title="Go back"
          onClick={() => router.back()}
          className="absolute top-4 left-4 p-2 bg-white/80 rounded-full shadow-sm hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-900" />
        </button>
      </div>

      <div className="p-6 -mt-6 relative bg-gray-50 rounded-t-2xl">
        {/* Title and Quick Actions */}
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">{recipe.title}</h1>
          <div className="flex gap-2">
            <button
              className="p-2 text-gray-400 hover:text-red-500 bg-white rounded-full shadow-sm"
              title="Add to favorites"
            >
              <Heart className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex gap-6 mb-8 text-sm text-gray-600 border-b border-gray-200 pb-6">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{recipe.prep_time_mins + recipe.cook_time_mins} mins</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{recipe.default_servings} servings</span>
          </div>
        </div>

        {/* Action Buttons */}
       <div className="flex gap-3 mb-8">
          <button 
            onClick={triggerPreflight}
            disabled={startingSession}
            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Play className="w-5 h-5" />
            {startingSession ? "Starting..." : "Cook Now"}
          </button>
          
          {/* Dynamic Save Later Button */}
          <button 
            onClick={toggleSaveRecipe}
            disabled={isSaving}
            className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors shadow-sm border ${
              isSaved 
                ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100" 
                : "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
            }`}
          >
            <BookmarkPlus className={`w-5 h-5 ${isSaved ? "text-blue-600 fill-current" : "text-gray-500"}`} />
            {isSaving ? "Saving..." : isSaved ? "Saved" : "Save Later"}
          </button>
        </div>

        {/* Ingredients Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Ingredients</h2>
          <ul className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {recipe.recipe_ingredients.map((item, idx: number) => (
              <li key={idx} className="flex justify-between items-center p-4 border-b border-gray-50 last:border-0">
                <span className="text-gray-900 font-medium">{item.ingredients.name}</span>
                <span className="text-gray-500 text-sm">{item.quantity} {item.unit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Steps Preview Section */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Steps Preview</h2>
          <div className="space-y-4">
            {recipe.recipe_steps.map((step) => (
              <div key={step.step_number} className="flex gap-4">
                <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                  {step.step_number}
                </div>
                <p className="text-gray-700 pt-1 leading-relaxed">{step.instruction}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
      {/* Pre-Flight Checklist Modal Overlay */}
      {showPreflight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Pre-Flight Checklist</h3>
            <p className="text-gray-500 text-sm mb-4">
              Do you have all the ingredients ready on your counter?
            </p>
            
            {/* Display the ingredients list again for quick checking */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 max-h-48 overflow-y-auto border border-gray-100 text-sm">
              <ul className="space-y-2">
                {recipe.recipe_ingredients.map((item, idx) => (
                  <li key={idx} className="flex justify-between text-gray-700">
                    <span className="font-medium">{item.ingredients.name}</span>
                    <span className="text-gray-500">{item.quantity} {item.unit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowPreflight(false)}
                className="flex-1 bg-gray-100 text-gray-900 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Not Yet
              </button>
              <button 
                onClick={confirmAndStartCooking}
                disabled={startingSession}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm text-center"
              >
                {startingSession ? "Starting..." : "Let's Cook"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}