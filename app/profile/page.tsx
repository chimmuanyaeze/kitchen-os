"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Edit2, Save, X, User, Sun, Moon, Settings as SettingsIcon } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  
  // --- VAULT STATE ---
  const [dietaryPrefs, setDietaryPrefs] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // --- THEME STATE ---
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize both Profile Data and Theme Status on load
 useEffect(() => {
    const loadPageData = async () => {
      // 1. Fetch Profile Data First
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("dietary_preferences")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!error && data?.dietary_preferences) {
        setDietaryPrefs(data.dietary_preferences);
      }

      // 2. Check Theme Status AFTER the network pause!
      // This is no longer "synchronous" to the initial render, satisfying the linter.
      const isDark = document.documentElement.classList.contains("dark");
      setIsDarkMode(isDark);
      
      // 3. Finally, unlock the vault UI
      setIsLoading(false);
    };

    loadPageData();
  }, [router]);

  // --- HANDLERS ---
  const handleSave = async () => {
    setIsSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) return;

    const { error } = await supabase
      .from("profiles")
      .update({ dietary_preferences: dietaryPrefs })
      .eq("id", session.user.id);

    if (error) {
      console.error("Failed to save profile:", error);
      alert("Error saving profile. Check console.");
    } else {
      setIsEditing(false); 
    }
    setIsSaving(false);
  };

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
      setIsDarkMode(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 transition-colors duration-200">
      
      {/* Header - Stretches perfectly across the top */}
      <div className="bg-white dark:bg-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10 border-b border-gray-100 dark:border-gray-700 shadow-sm transition-colors duration-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="p-2 bg-gray-50 dark:bg-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Your Profile</h1>
        </div>
      </div>

      {/* Main Container - The w-full ensures it stretches out completely inside the max-w layout */}
      <div className="p-6 max-w-5xl mx-auto mt-6 space-y-6 w-full flex flex-col items-center">
        
        {/* --- 1. PREFERENCES & THEME CARD --- */}
        <div className="w-full bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" /> Preferences
          </h2>

          <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700 gap-4">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">Interface Theme</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Switch between light and dark modes.</p>
            </div>

            <button
              onClick={toggleTheme}
              className="p-3 w-full sm:w-auto rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-sm text-gray-700 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
              title="Toggle Theme"
            >
              {isDarkMode ? (
                <div className="flex items-center gap-2 font-medium text-amber-400">
                  <Sun className="w-5 h-5 fill-current" />
                  <span className="text-xs text-gray-300">Light Mode</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 font-medium text-blue-600">
                  <Moon className="w-5 h-5 fill-current" />
                  <span className="text-xs text-gray-600">Dark Mode</span>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* --- 2. MEDICAL & DIETARY VAULT CARD --- */}
        <div className="w-full bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
          
          <div className="flex items-center justify-between mb-6 gap-2">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" /> Medical & Dietary Vault
            </h2>
            
            {!isEditing && !isLoading && (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors whitespace-nowrap"
              >
                <Edit2 className="w-4 h-4" /> Edit
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="text-gray-400 dark:text-gray-500 animate-pulse">Unlocking vault...</div>
          ) : isEditing ? (
            
            // --- 🔓 EDIT MODE ---
            <div className="space-y-4 animate-in fade-in duration-300 w-full">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Update your allergies, intolerances, and strict dietary rules here. The AI will strictly enforce these rules across all recipes.
              </p>
              <textarea
                value={dietaryPrefs}
                onChange={(e) => setDietaryPrefs(e.target.value)}
                className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none h-32 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                placeholder="e.g., I am highly allergic to peanuts. I am lactose intolerant..."
              />
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2.5 rounded-xl font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </div>
            
          ) : (
            
            // --- 🔒 READ-ONLY MODE ---
            <div className="w-full bg-gray-50 dark:bg-gray-900/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700 animate-in fade-in duration-300">
              {dietaryPrefs ? (
                <p className="text-gray-900 dark:text-gray-200 leading-relaxed whitespace-pre-wrap break-words">
                  {dietaryPrefs}
                </p>
              ) : (
                <div className="text-center py-6 w-full">
                  <p className="text-gray-500 dark:text-gray-400 italic mb-4">Your medical vault is currently empty.</p>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
                  >
                    Add your dietary restrictions now
                  </button>
                </div>
              )}
            </div>
            
          )}
          
        </div>
      </div>
    </div>
  );

}