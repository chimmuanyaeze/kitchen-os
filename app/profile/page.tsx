"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Edit2, Save, X, User } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  
  // State Machine
  const [dietaryPrefs, setDietaryPrefs] = useState("");
  const [isEditing, setIsEditing] = useState(false); // The magic toggle
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
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
      setIsLoading(false);
    };

    fetchProfile();
  }, [router]);

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
      // Success! Lock the vault back into Read-Only mode
      setIsEditing(false); 
    }
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10 border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Your Profile</h1>
        </div>
      </div>

      <div className="p-6 max-w-2xl mx-auto mt-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          
          {/* Section Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" /> Medical & Dietary Vault
            </h2>
            
            {/* Show the Edit button ONLY if we are in Read-Only mode */}
            {!isEditing && !isLoading && (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Edit2 className="w-4 h-4" /> Edit
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="text-gray-400 animate-pulse">Unlocking vault...</div>
          ) : isEditing ? (
            
            // --- 🔓 EDIT MODE ---
            <div className="space-y-4 animate-in fade-in duration-300">
              <p className="text-sm text-gray-500 mb-2">
                Update your allergies, intolerances, and strict dietary rules here. The AI will strictly enforce these rules across all recipes.
              </p>
              <textarea
                value={dietaryPrefs}
                onChange={(e) => setDietaryPrefs(e.target.value)}
                className="w-full p-4 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none h-32 text-gray-900 placeholder:text-gray-400"
                placeholder="e.g., I am highly allergic to peanuts. I am lactose intolerant..."
              />
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-2"
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
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 animate-in fade-in duration-300">
              {dietaryPrefs ? (
                <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                  {dietaryPrefs}
                </p>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500 italic mb-4">Your medical vault is currently empty.</p>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="text-blue-600 font-medium hover:underline"
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