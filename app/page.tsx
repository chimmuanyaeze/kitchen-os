"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { Search, LogOut, Play, Trash2, Settings } from "lucide-react"; // ChefHat, Clock,
import { Recipe, ActiveSessionWithRecipe } from "@/lib/types";
import Link from "next/link";
//import Image from "next/image";
import RecipeCard from "@/components/RecipeCard"; // <-- 1. IMPORT THE NEW CARD

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeSessions, setActiveSessions] = useState<ActiveSessionWithRecipe[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      // 1. Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);

      // 2. Fetch "Active" cooking sessions AND join the recipe title/times
      const { data: sessionData } = await supabase
        .from("cooking_sessions")
        .select("*, recipes(title, prep_time_mins, cook_time_mins)")
        .eq("user_id", session.user.id)
        .eq("status", "active")
        .order("current_step", { ascending: false });

      // 3. Fetch the top 10 Most Liked recipes!
      const { data: recipeData } = await supabase
        .from("recipes")
        .select("*")
        .order("likes_count", { ascending: false }) // <-- 2. SORT BY POPULARITY
        .limit(10);

      if (sessionData) setActiveSessions(sessionData as unknown as ActiveSessionWithRecipe[]);
      if (recipeData) setRecipes(recipeData);
      
      setLoading(false);
    };
    
    fetchDashboardData();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleRemoveSession = async (sessionId: string) => {
    await supabase.from("cooking_sessions").update({ status: "abandoned" }).eq("id", sessionId);
    setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-500">Loading Kitchen OS...</div>;
  }

  return (
    <main className="flex flex-col min-h-screen bg-gray-50 p-6 pb-24 overflow-x-hidden">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hello, Chef 👋</h1>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/profile" className="p-2 text-gray-400 hover:text-blue-600 transition-colors" aria-label="Profile settings" title="Profile settings">
            <Settings className="w-5 h-5" />
          </Link>
          <button onClick={handleSignOut} className="p-2 text-gray-400 hover:text-red-500 transition-colors" aria-label="Sign out" title="Sign out">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Ingredient Search Bar */}
      <form onSubmit={handleSearch} className="relative mb-8">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-700" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-white placeholder-gray-400 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          placeholder="What's in your kitchen? (e.g., eggs, rice)"
        />
        <button type="submit" className="hidden">Search</button>
      </form>

      {/* Netflix Row 1: Continue Cooking */}
      {activeSessions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Continue Cooking</h2>
          <div className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar">
            {activeSessions.map((activeSession) => (
              <div 
                key={activeSession.id} 
                className="relative min-w-70 bg-gray-900 text-white p-5 rounded-2xl shadow-md snap-start flex flex-col justify-between"
              >
                <button 
                  onClick={() => handleRemoveSession(activeSession.id)}
                  className="absolute top-4 right-4 p-1.5 bg-gray-800 rounded-full hover:bg-red-500 transition-colors text-gray-400 hover:text-white"
                  title="Remove Session"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="mb-6 pr-8">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1 block">
                    Step {activeSession.current_step}
                  </span>
                  <h3 className="text-lg font-bold leading-tight">{activeSession.recipes.title}</h3>
                </div>

                <Link 
                  href={`/cook/${activeSession.id}`}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-blue-500 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Resume
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Netflix Row 2: Popular Recipes */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Popular Recipes</h2>
        <div className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar">
          {recipes.map((recipe) => (
            // 3. USE THE NEW CARD COMPONENT AND SET THE WIDTH
            <div key={recipe.id} className="min-w-280px md:min-w-[320px] snap-start">
              <RecipeCard recipe={recipe} currentUserId={user?.id} />
            </div>
          ))}
        </div>
      </div>

      {/* Netflix Row 3: African Dishes (Placeholder) */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">African Dishes</h2>
        <div className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar">
          {recipes.map((recipe) => (
            <div key={`african-${recipe.id}`} className="min-w-280px md:min-w-[320px] snap-start">
              <RecipeCard recipe={recipe} currentUserId={user?.id} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}