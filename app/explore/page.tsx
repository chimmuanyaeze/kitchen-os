"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { Recipe } from "@/lib/types";
import RecipeCard from "@/components/RecipeCard"; // <-- 1. IMPORT THE CARD

export default function ExplorePage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null); // <-- 2. ADD USER MEMORY

  useEffect(() => {
    async function fetchPageData() {
      // Get the current user so they can like things!
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUser(session.user);

      // Fetch all recipes
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: false }); // Show newest first!

      if (error) {
        console.error("Error fetching recipes:", error.message);
      } else {
        setRecipes(data || []);
      }
      setLoading(false);
    }

    fetchPageData();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-6 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Explore Recipes</h1>
      <p className="text-gray-600 mb-6">Find your next meal from our database.</p>

      {loading ? (
        <div className="text-center text-gray-500 mt-10 text-sm font-medium animate-pulse">
          Fetching from Vault...
        </div>
      ) : (
        /* Upgraded to a responsive grid: 1 column on mobile, 2 on tablets, 3 on desktops */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* 3. LOOP AND RENDER THE COMPONENT */}
          {recipes.map((recipe) => (
            <RecipeCard 
              key={recipe.id} 
              recipe={recipe} 
              currentUserId={user?.id} 
            />
          ))}
          
        </div>
      )}
    </main>
  );
}