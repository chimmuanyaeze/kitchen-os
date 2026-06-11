"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Recipe } from "@/lib/types";
import { ArrowLeft, ChefHat, Clock, Trash2, Bookmark } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// We create a custom blueprint here because Supabase joins the two tables together
interface SavedRecipeItem {
  id: string; // The ID of the bookmark itself
  recipes: Recipe; // The actual recipe data attached to the bookmark
}

export default function CookLaterPage() {
  const router = useRouter();
  const [savedItems, setSavedItems] = useState<SavedRecipeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSavedRecipes = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/login");
        return;
      }

      // This is the magic Supabase syntax to join the saved_recipes table with the recipes table
      const { data, error } = await supabase
        .from("saved_recipes")
        .select(`
          id,
          recipes (*)
        `)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching saved recipes:", error);
      } else if (data) {
        // TypeScript needs a little help knowing the shape of the joined data
        setSavedItems(data as unknown as SavedRecipeItem[]);
      }
      
      setLoading(false);
    };

    fetchSavedRecipes();
  }, [router]);
  

  const handleRemoveBookmark = async (e: React.MouseEvent, bookmarkId: string) => {
    // Prevent the click from also opening the recipe link
    e.preventDefault(); 
    
    // Instantly remove it from the screen for a snappy UI (Optimistic UI update)
    setSavedItems((prev) => prev.filter((item) => item.id !== bookmarkId));

    // Then quietly delete it from the database in the background
    await supabase.from("saved_recipes").delete().eq("id", bookmarkId);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-24">
      {/* Top Header */}
      <div className="bg-white px-6 py-4 flex items-center gap-4 sticky top-0 z-10 border-b border-gray-100">
        <button 
          onClick={() => router.push("/")}
          className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Go back"
          title="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cook Later</h1>
          <p className="text-sm text-gray-500">Your personal recipe vault</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 grow flex">
        {loading ? (
          <div className="text-center text-gray-500 mt-10 animate-pulse">Unlocking vault...</div>
        ) : savedItems.length === 0 ? (
          <div className="text-center mt-24">
            <div className="bg-blue-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-200 shadow-inner">
              <Bookmark className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Your vault is empty</h2>
            <p className="text-gray-500 text-sm mb-8 px-4 leading-relaxed">
              When you find a recipe you want to try, tap the bookmark icon to save it here for later.
            </p>
            <button 
              onClick={() => router.push("/explore")}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-md"
            >
              Explore Recipes
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedItems.map((item) => (
              <Link 
                href={`/recipes/${item.recipes.id}`}
                key={item.id} 
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex items-center h-28 group"
              >
                {/* Recipe Image */}
                <div className="w-28 h-full bg-slate-100 relative shrink-0">
                  {item.recipes.image_url ? (
                    <Image 
                      src={item.recipes.image_url} 
                      alt={item.recipes.title}
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <ChefHat className="w-8 h-8" />
                    </div>
                  )}
                </div>
                
                {/* Recipe Info */}
                <div className="p-4 grow flex flex-col min-w-0 justify-between">
                  <div className="min-w-0 pr-4">
                    <h3 className="text-md font-bold text-gray-900 truncate mb-1">{item.recipes.title}</h3>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{item.recipes.prep_time_mins + item.recipes.cook_time_mins} mins</span>
                    </div>
                  </div>
                  
                  {/* Quick Delete Button */}
                  <button 
                    onClick={(e) => handleRemoveBookmark(e, item.id)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-100 md:opacity-0 group-hover:opacity-100 shrink-0"
                    title="Remove from Cook Later"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}