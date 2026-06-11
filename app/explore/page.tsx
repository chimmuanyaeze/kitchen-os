"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Clock, Users, ChefHat } from "lucide-react";
import { Recipe } from "@/lib/types";
import Image from "next/image";

export default function ExplorePage() {
  // 1. Create a "memory container" to hold the recipes
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  // 2. This runs the moment the page opens
  useEffect(() => {
    async function fetchRecipes() {
      // Ask Supabase to give us everything (*) from the 'recipes' table
      const { data, error } = await supabase
        .from("recipes")
        .select("*");

      if (error) {
        console.error("Error fetching recipes:", error.message);
      } else {
        // Save the data we got back into our memory container
        setRecipes(data || []);
      }
      setLoading(false);
    }

    fetchRecipes();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-6 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Explore Recipes</h1>
      <p className="text-gray-600 mb-6">Find your next meal from our database.</p>

      {/* Show a loading message if we are still fetching data */}
      {loading ? (
        <div className="text-center text-gray-500 mt-10 text-sm font-medium animate-pulse">
          Fetching from Vault...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          
          {/* 3. Loop through our memory container and draw a card for every recipe */}
          {recipes.map((recipe) => (
            <Link 
    href={`/recipes/${recipe.id}`}
    key={recipe.id} 
    className="block bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all cursor-pointer"
  >
              {/* Recipe Image Banner */}
              <div className="h-40 -mx-5 -mt-5 mb-4 rounded-t-xl overflow-hidden bg-slate-100 relative border-b border-gray-100">

                  {recipe.image_url ? (
                  <Image 
                  src={recipe.image_url} 
                  alt={recipe.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 300px"
                  priority
                  className="object-cover"
                />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <ChefHat className="w-10 h-10" />
                  </div>
                )}
              </div>
              
              {/* Recipe Title */}
              <h2 className="text-lg font-bold text-gray-900">{recipe.title}</h2>
              
              {/* Display the math we got from the database */}
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {/* We add prep + cook time together for total time */}
                  <span>{recipe.prep_time_mins + recipe.cook_time_mins} mins</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{recipe.default_servings} servings</span>
                </div>
              </div>
            </Link>
          ))}
          
        </div>
      )}
    </main>
  );
}