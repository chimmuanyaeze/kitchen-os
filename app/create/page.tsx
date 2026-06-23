"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Save, Plus, Trash2, ChefHat, Star } from "lucide-react";

// The new structured blueprint for our form memory
interface StructuredIngredient {
  quantity: string;
  unit: string;
  name: string;
  is_core: boolean;
}

export default function CreateRecipePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [overview, setOverview] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [servings, setServings] = useState("4"); // <-- NEW: Default Servings
  
  // Dynamic Arrays - Upgraded to Structured Objects
  const [ingredients, setIngredients] = useState<StructuredIngredient[]>([
    { quantity: "", unit: "", name: "", is_core: true }
  ]);
  const [steps, setSteps] = useState([""]);

  // --- Security Check ---
  useEffect(() => {
    const enforceAdminSecurity = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error || profile?.role !== "admin") {
        alert("Security Alert: Only Master Chefs can access the Kitchen Vault.");
        router.push("/");
      }
    };
    enforceAdminSecurity();
  }, [router]);

  // --- Helpers for Dynamic Fields ---
  const updateIngredient = (index: number, field: keyof StructuredIngredient, value: string | boolean) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setIngredients(newIngredients);
  };

  const handleStepChange = (index: number, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = value;
    setSteps(newSteps);
  };

  // --- The Master Submit Function ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Save the main recipe data (Now with servings!)
      const { data: recipeData, error: recipeError } = await supabase
        .from("recipes")
        .insert({
          title,
          overview,
          image_url: imageUrl,
          prep_time_mins: parseInt(prepTime) || 0,
          cook_time_mins: parseInt(cookTime) || 0,
          default_servings: parseInt(servings) || 2,
        })
        .select()
        .single();

      if (recipeError) throw recipeError;
      const recipeId = recipeData.id;

      // 2. Save the instructions
      const validSteps = steps.filter(s => s.trim() !== "");
      if (validSteps.length > 0) {
        const stepsToInsert = validSteps.map((instruction, index) => ({
          recipe_id: recipeId,
          step_number: index + 1,
          instruction
        }));
        await supabase.from("recipe_steps").insert(stepsToInsert);
      }

      // 3. Save the STRUCTURED ingredients
      const validIngredients = ingredients.filter(i => i.name.trim() !== "");
      
      for (const ing of validIngredients) {
        let ingredientId;
        const cleanName = ing.name.trim().toLowerCase();
        
        // Check if the pure ingredient name already exists in the master list
        const { data: existingIng, error: searchError } = await supabase
          .from("ingredients")
          .select("id")
          .ilike("name", cleanName)
          .maybeSingle(); 

        if (searchError) throw searchError;

        if (existingIng) {
          ingredientId = existingIng.id;
        } else {
          // Save ONLY the pure name to the master table
          const { data: newIng, error: ingError } = await supabase
            .from("ingredients")
            .insert({ name: cleanName })
            .select()
            .single();
            
          if (ingError) throw ingError;
          ingredientId = newIng.id;
        }

        // Link it to the recipe WITH the specific math
        await supabase.from("recipe_ingredients").insert({
          recipe_id: recipeId,
          ingredient_id: ingredientId,
          quantity: parseFloat(ing.quantity) || 0,
          unit: ing.unit.trim().toLowerCase(),
          is_core: ing.is_core
        });
      }

      alert("Structured Recipe safely added to the Kitchen OS Vault!");
      router.push("/");
      
    } catch (error) {
      console.error("Failed to save recipe:", error);
      alert("Error saving recipe. Check the console.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10 border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Go back"
            title="Go back"
            onClick={() => router.push("/")}
            className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Add New Recipe</h1>
        </div>
        <button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          <Save className="w-4 h-4" />
          {isSubmitting ? "Saving..." : "Save Recipe"}
        </button>
      </div>

      <div className="p-6 max-w-3xl mx-auto mt-4 space-y-8">
        
        {/* Section 1: Basic Info */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-blue-600" /> Basic Information
          </h2>
          <div className="space-y-5">
            {/* Title & Servings Row */}
            <div className="flex gap-4">
              <div className="flex-3">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Recipe Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 placeholder:text-gray-400" placeholder="e.g., Authentic Nigerian Jollof" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Servings</label>
                <input type="number" min="0" value={servings} onChange={e => setServings(e.target.value)} className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 placeholder:text-gray-400" placeholder="4" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Short Overview</label>
              <textarea value={overview} onChange={e => setOverview(e.target.value)} className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none h-24 text-gray-900 placeholder:text-gray-400" placeholder="A rich, smoky party Jollof that brings the heat..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Image URL</label>
              <input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 placeholder:text-gray-400" placeholder="https://images.unsplash.com/..." />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Prep Time (mins)</label>
                <input type="number" min="0" value={prepTime} onChange={e => setPrepTime(e.target.value)} className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 placeholder:text-gray-400" placeholder="15" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Cook Time (mins)</label>
                <input type="number" min="0" value={cookTime} onChange={e => setCookTime(e.target.value)} className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 placeholder:text-gray-400" placeholder="45" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Structured Ingredients */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-5">Ingredients (Database Ready)</h2>
          <div className="space-y-4">
            {/* Column Headers for clarity */}
            <div className="flex gap-2 px-1 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <div className="w-20">Qty</div>
              <div className="w-28">Unit</div>
              <div className="flex-1">Pure Ingredient Name</div>
              <div className="w-16 text-center">Core?</div>
              <div className="w-10"></div>
            </div>

            {ingredients.map((ing, index) => (
              <div key={index} className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-100">
                <input 
                  type="number" step="any" min="0"
                  value={ing.quantity} 
                  onChange={e => updateIngredient(index, "quantity", e.target.value)} 
                  className="w-20 p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900" 
                  placeholder="2" 
                />
                <input 
                  type="text" 
                  value={ing.unit} 
                  onChange={e => updateIngredient(index, "unit", e.target.value)} 
                  className="w-28 p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900" 
                  placeholder="cups" 
                />
                <input 
                  type="text" 
                  value={ing.name} 
                  onChange={e => updateIngredient(index, "name", e.target.value)} 
                  className="flex-1 p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900" 
                  placeholder="long grain rice" 
                />
                
                {/* Is Core Toggle */}
                <button
                  type="button"
                  onClick={() => updateIngredient(index, "is_core", !ing.is_core)}
                  className={`w-12 h-10 flex items-center justify-center rounded-lg border transition-colors ${
                    ing.is_core ? "bg-amber-50 border-amber-200 text-amber-500" : "bg-white border-gray-200 text-gray-300"
                  }`}
                  title={ing.is_core ? "Core Ingredient (Required)" : "Optional/Garnish"}
                >
                  <Star className={`w-5 h-5 ${ing.is_core ? "fill-current" : ""}`} />
                </button>

                <button 
                  type="button"
                  onClick={() => setIngredients(ingredients.filter((_, i) => i !== index))}
                  className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove ingredient"
                  aria-label="Remove ingredient"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={() => setIngredients([...ingredients, { quantity: "", unit: "", name: "", is_core: true }])} className="text-sm bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-100 transition-colors flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>
        </div>

        {/* Section 3: Instructions (Unchanged) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-5">Cooking Steps</h2>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 mt-1">
                  {index + 1}
                </div>
                <textarea 
                  value={step} 
                  onChange={e => handleStepChange(index, e.target.value)} 
                  className="flex-1 p-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none h-28 text-gray-900 placeholder:text-gray-400" 
                  placeholder={`Describe step ${index + 1}...`} 
                />
                <button 
                  type="button"
                  onClick={() => setSteps(steps.filter((_, i) => i !== index))}
                  className="p-3.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors mt-1"
                  title={`Remove step ${index + 1}`}
                  aria-label={`Remove step ${index + 1}`}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setSteps([...steps, ""])}
              className="text-sm bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-100 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Step
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}