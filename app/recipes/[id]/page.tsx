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

  // --- LIKE BUTTON STATE ---
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecipeDetails() {

      const { data: { session: authSession } } = await supabase.auth.getSession();

      // Check if the recipe is already saved by this user
      if (authSession) {
        setCurrentUserId(authSession.user.id);
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

 // 1. Check if the user already liked this recipe when the page loads
  useEffect(() => {
    const fetchLikeStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
        
        // If we have a recipe loaded, check the ledger
        if (recipe?.id) {
          setLikeCount(recipe.likes_count || 0); // Set initial count
          
          const { data } = await supabase
            .from("user_likes")
            .select("id")
            .eq("user_id", session.user.id)
            .eq("recipe_id", recipe.id)
            .maybeSingle();
            
          if (data) setIsLiked(true);
        }
      }
    };
    fetchLikeStatus();
  }, [recipe?.id, recipe?.likes_count]); 

 const handleLikeToggle = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault(); // Needed for RecipeCard to stop navigation
    
    if (!currentUserId) {
      alert("Please log in to like recipes!");
      return;
    }
    if (isLiking || !recipe) return;

    setIsLiking(true);

    // 1. THE MATH FIX: Prevent negative numbers!
    const newIsLiked = !isLiked;
    const newCount = newIsLiked ? likeCount + 1 : Math.max(0, likeCount - 1);

    // 2. Optimistic UI Update
    setIsLiked(newIsLiked);
    setLikeCount(newCount);

    try {
      if (newIsLiked) {
        // 3. THE ERROR FIX: Force a crash if Supabase rejects it
        const { error: likeErr } = await supabase.from("user_likes").insert({ user_id: currentUserId, recipe_id: recipe.id });
        if (likeErr) throw likeErr;

        const { error: recErr } = await supabase.from("recipes").update({ likes_count: newCount }).eq("id", recipe.id);
        if (recErr) throw recErr;
      } else {
        const { error: unlikeErr } = await supabase.from("user_likes").delete().eq("user_id", currentUserId).eq("recipe_id", recipe.id);
        if (unlikeErr) throw unlikeErr;

        const { error: recErr } = await supabase.from("recipes").update({ likes_count: newCount }).eq("id", recipe.id);
        if (recErr) throw recErr;
      }
    } catch (error) {
      // 4. If anything fails, revert the math and the UI
      setIsLiked(!newIsLiked);
      setLikeCount(newIsLiked ? Math.max(0, newCount - 1) : newCount + 1);
      console.error("Database rejected the like:", error);
    } finally {
      setIsLiking(false);
    }
  };

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
        {/* Dynamic Like Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleLikeToggle}
                aria-label={isLiked ? "Unlike recipe" : "Like recipe"}
                className={`p-3 bg-white rounded-full shadow-sm transition-all hover:scale-110 active:scale-95 border ${
                  isLiked ? "border-red-100" : "border-gray-100"
                }`}
                title={isLiked ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart 
                  className={`w-5 h-5 transition-colors ${
                    isLiked ? "fill-red-500 text-red-500" : "text-gray-400 hover:text-red-500"
                  }`} 
                  aria-hidden="true" 
                />
              </button>
              
              {/* Optional: Show the count next to the button */}
              <span className="text-sm font-bold text-gray-500">
                {likeCount} {likeCount === 1 ? 'Like' : 'Likes'}
              </span>
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