"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Save, ShieldAlert } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [dietaryPrefs, setDietaryPrefs] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load the user and their existing preferences
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/login");
        return;
      }
      
      setUserId(session.user.id);

      // Check if they already have a profile saved
      const { data: profile } = await supabase
        .from("profiles")
        .select("dietary_preferences")
        .eq("id", session.user.id)
        .single();

      if (profile && profile.dietary_preferences) {
        setDietaryPrefs(profile.dietary_preferences);
      }
      
      setLoading(false);
    };

    fetchProfile();
  }, [router]);

  // Save the preferences to the database
  const handleSave = async () => {
    if (!userId) return;
    setIsSaving(true);

    const { error } = await supabase
      .from("profiles")
      .upsert({ 
        id: userId, 
        dietary_preferences: dietaryPrefs,
        updated_at: new Date().toISOString()
      });

    setIsSaving(false);
    
    if (error) {
      alert("Failed to save profile.");
      console.error(error);
    } else {
      // Show a quick success feedback and go back home
      alert("Dietary profile securely saved!");
      router.push("/");
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">Loading...</div>;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10 border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Go back"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Dietary Profile</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-md mx-auto w-full mt-4">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3 mb-8">
          <ShieldAlert className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-900 leading-relaxed">
            Kitchen OS AI will automatically adapt every recipe you cook to respect these rules.
          </p>
        </div>

        <label className="block text-sm font-bold text-gray-900 mb-2">
          Allergies, Diets, & Dislikes
        </label>
        <textarea
          value={dietaryPrefs}
          onChange={(e) => setDietaryPrefs(e.target.value)}
          placeholder="E.g., I am highly allergic to peanuts. I am a strict vegan. I hate cilantro."
          className="w-full h-40 p-4 border border-gray-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm resize-none text-gray-700"
        />

        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full mt-8 bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md"
        >
          <Save className="w-5 h-5" />
          {isSaving ? "Saving to Vault..." : "Save Profile"}
        </button>
      </div>
    </main>
  );
}