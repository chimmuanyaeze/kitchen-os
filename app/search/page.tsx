"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, ChefHat, Clock } from "lucide-react";
import { RecipeWithIngredients } from "@/lib/types";
import Link from "next/link";
import Image from "next/image";


// We wrap the main logic in a separate component because Next.js requires 
// 'useSearchParams' to be used inside a Suspense boundary for performance optimization.
function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<RecipeWithIngredients[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      
      if (!query) {
        setResults([]);
        setLoading(false);
        return;
      }

      // For the MVP, we fetch all recipes and their ingredients, 
      // then filter them in the browser to see if they match the user's search.
      const { data } = await supabase
        .from("recipes")
        .select("*, recipe_ingredients(ingredients(name))");

      if (data) {
        const searchTerms = query.toLowerCase().split(",").map(t => t.trim());
        
        const filtered = data.filter((recipe: RecipeWithIngredients) => {
          // Check if the title matches
          const titleMatch = recipe.title.toLowerCase().includes(searchTerms[0]);
          
          // Check if any of the ingredients match
          const ingredientMatch = recipe.recipe_ingredients?.some((ri) => 
            searchTerms.some(term => ri.ingredients?.name.toLowerCase().includes(term))
          );

          return titleMatch || ingredientMatch;
        });

        setResults(filtered);
      }
      
      setLoading(false);
    };

    fetchResults();
  }, [query]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Top Header */}
      <div className="bg-white px-6 py-4 flex items-center gap-4 sticky top-0 z-10 border-b border-gray-100">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Search Results</h1>
          <p className="text-sm text-gray-500">Showing results for &quot;{query}&quot;</p>
        </div>
      </div>

      {/* Results Feed */}
      <div className="p-6 grow flex">
        {loading ? (
          <div className="text-center text-gray-500 mt-10 animate-pulse">Searching the pantry...</div>
        ) : results.length === 0 ? (
          <div className="text-center mt-20">
            <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <ChefHat className="w-10 h-10" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">No recipes found</h2>
            <p className="text-gray-500 text-sm">Try searching for different ingredients like &quot;eggs&quot; or &quot;rice&quot;.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((recipe) => (
              <Link 
                href={`/recipes/${recipe.id}`}
                key={recipe.id} 
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex items-center h-28"
              >
                <div className="w-28 h-full bg-slate-100 relative shrink-0">
                  {recipe.image_url ? (
                    <Image 
                      src={recipe.image_url} 
                      alt={recipe.title}
                      fill
                      sizes="112px"
                      priority
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <ChefHat className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="p-4 grow flex min-w-0">
                  <h3 className="text-md font-bold text-gray-900 truncate mb-1">{recipe.title}</h3>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{recipe.prep_time_mins + recipe.cook_time_mins} mins</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">Loading...</div>}>
      <SearchResults />
    </Suspense>
  );
}