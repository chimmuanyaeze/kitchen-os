"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, ChefHat, Heart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Recipe } from "@/lib/types"; // Make sure this path matches your types file!

interface RecipeCardProps {
  recipe: Recipe;
  currentUserId?: string | null;
}

export default function RecipeCard({ recipe, currentUserId }: RecipeCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(recipe.likes_count || 0);
  const [isLiking, setIsLiking] = useState(false);

  // Check if the current user has already liked this recipe
  useEffect(() => {
    if (!currentUserId) return;

    const checkLikeStatus = async () => {
      const { data } = await supabase
        .from("user_likes")
        .select("id")
        .eq("user_id", currentUserId)
        .eq("recipe_id", recipe.id)
        .maybeSingle();

      if (data) setIsLiked(true);
    };

    checkLikeStatus();
  }, [currentUserId, recipe.id]);

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

  return (
    <Link href={`/recipes/${recipe.id}`} className="group block bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden relative">
      
      {/* Image Header */}
      <div className="w-full h-48 bg-slate-100 relative overflow-hidden">
        {recipe.image_url ? (
          <Image 
            src={recipe.image_url} 
            alt={recipe.title}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <ChefHat className="w-12 h-12" />
          </div>
        )}
        
        {/* The Like Button */}
        <button
          type="button"
          title="like"
          onClick={handleLikeToggle}
          aria-label={isLiked ? "Unlike recipe" : "Like recipe"}
          className="absolute top-4 right-4 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:scale-110 active:scale-95 transition-all"
        >
          <Heart
            className={`w-5 h-5 transition-colors ${isLiked ? "fill-red-500 text-red-500" : "text-gray-400"}`}
            aria-hidden="true"
          />
        </button>
      </div>
      
      {/* Card Content */}
      <div className="p-5">
        <div className="flex justify-between items-start gap-4 mb-2">
          <h3 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
            {recipe.title}
          </h3>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-sm font-bold shrink-0">
            <Heart className="w-3.5 h-3.5 fill-current" />
            {likeCount}
          </div>
        </div>
        
        {/* The New Overview Text */}
        <p className="text-gray-500 text-sm line-clamp-2 mb-4 leading-relaxed">
          {recipe.overview || "A delicious Kitchen OS recipe ready to be cooked."}
        </p>

        <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-500" />
            <span>{recipe.prep_time_mins + recipe.cook_time_mins} mins total</span>
          </div>
        </div>
      </div>
    </Link>
  );
}