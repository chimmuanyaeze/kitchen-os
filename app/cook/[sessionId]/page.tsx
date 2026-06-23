"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, ChevronRight, ChevronLeft, Mic, Send, ChefHat } from "lucide-react";
import { RecipeDetail, RecipeStep, CookingSession } from "@/lib/types";


export default function ActiveCookingPage() {
  const params = useParams();
  const router = useRouter();
  
  const [session, setSession] = useState<CookingSession | null>(null);
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [commandInput, setCommandInput] = useState("");
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [dietaryPrefs, setDietaryPrefs] = useState<string | null>(null);

  // Fetch the session and its attached recipe
  useEffect(() => {
    async function fetchSession() {
      const { data: sessionData, error: sessionError } = await supabase
        .from("cooking_sessions")
        .select("*, recipes(*, recipe_steps(*))")
        .eq("id", params.sessionId)
        .single();

      if (sessionError || !sessionData) {
        console.error("Error fetching session:", sessionError);
        router.push("/");
        return;
      }

      // Sort the steps just like we did on the detail page
      if (sessionData.recipes && sessionData.recipes.recipe_steps) {
        sessionData.recipes.recipe_steps.sort((a: RecipeStep, b: RecipeStep) => a.step_number - b.step_number);
      }

      setSession(sessionData);
      setRecipe(sessionData.recipes);
      setLoading(false);
    }

    if (params.sessionId) {
      fetchSession();
    }
  }, [params.sessionId, router]);

  // Handle moving to the next step
  const handleNextStep = async () => {
    setShowOriginal(false); // Reset to showing AI version whenever we switch sessions
    if (!session || !recipe) return;

    // 1. Fetch the user's dietary profile from the secure vault
      const { data: profile } = await supabase
        .from("profiles")
        .select("dietary_preferences")
        .eq("id", session.user_id)
        .single();

      if (profile?.dietary_preferences) {
        setDietaryPrefs(profile.dietary_preferences);
      }
    
    const isLastStep = session.current_step === recipe.recipe_steps.length;
    
    if (isLastStep) {
      // Mark session as complete!
      await supabase.from("cooking_sessions").update({ status: "completed" }).eq("id", session.id);
      
      // Show the beautiful modal instead of the ugly alert
      setShowCompletionModal(true);
    } else {
      // Move to the next step and save it to the database
      const nextStep = session.current_step + 1;
      await supabase.from("cooking_sessions").update({ current_step: nextStep }).eq("id", session.id);
      setSession({ ...session, current_step: nextStep });
    }
  };

  // Handle moving to the previous step
  const handlePrevStep = async () => {
    setShowOriginal(false); // Reset to showing AI version whenever we switch sessions
    if (!session || session.current_step === 1) return;
    const prevStep = session.current_step - 1;
    await supabase.from("cooking_sessions").update({ current_step: prevStep }).eq("id", session.id);
    setSession({ ...session, current_step: prevStep });
  };

  // This function sends the user's command to OpenAI and updates the screen
  const handleAICommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim() || !recipe || !session) return;

    setIsProcessingAI(true);
    
    // Grab the text of the step the user is currently on
    const currentStepText = recipe.recipe_steps.find((s) => s.step_number === session.current_step)?.instruction;

    try {
      // 1. Send the command to our AI brain
      const res = await fetch("/api/ai/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          command: commandInput, 
          currentStep: currentStepText,
          dietaryProfile: dietaryPrefs,
          scratchpad: session.modifications?.scratchpad || [] 
        }),
      });

      const aiResponse = await res.json();

      // 2. The JARVIS Effect: Speak the response out loud using the browser's native voice
      if (aiResponse.speech) {
        const utterance = new SpeechSynthesisUtterance(aiResponse.speech);
        window.speechSynthesis.speak(utterance);
      }

      // 3. Magically rewrite the instruction on the screen
     //  Save the new instruction to the database permanently
      if (aiResponse.updated_instruction) {
        // Create safe COPIES of the existing modifications so React doesn't get mad
        const currentMods = { ...(session.modifications || {}) };
        const aiSteps = { ...(currentMods.ai_steps || {}) };
        const currentScratchpad = [...(currentMods.scratchpad || [])]; // Grab existing notes
        
        // Save the new AI text specifically for the step we are currently on
        aiSteps[session.current_step] = aiResponse.updated_instruction;
        
        if (aiResponse.new_scratchpad_note) {
          currentScratchpad.push(aiResponse.new_scratchpad_note);
        }

        const newMods = { ...currentMods, ai_steps: aiSteps, scratchpad: currentScratchpad };

        // Push it to Supabase
        await supabase
          .from("cooking_sessions")
          .update({ modifications: newMods })
          .eq("id", session.id);

        // Update the screen and ensure we are looking at the AI version
        setSession({ ...session, modifications: newMods });
        setShowOriginal(false);
      }
    } catch (error) {
      console.error("Failed to reach AI:", error);
      alert("Kitchen OS is having trouble connecting to the network.");
    } finally {
      setIsProcessingAI(false);
      setCommandInput(""); // Clear the input box
    }
  };

  
// --- THE AUTO-CLEANER ---
  // This watches the current step. If you click "Next", it automatically checks the scratchpad.
  useEffect(() => {
    // 1. EARLY EXITS: These completely prevent infinite loops!
    if (!session || !session.modifications?.scratchpad?.length) return;
    
    // If we already have an AI-modified version of this step, don't run it again.
    if (session.modifications?.ai_steps?.[session.current_step]) return;

    const autoCleanStep = async () => {
      setIsProcessingAI(true);
      const currentStepText = recipe?.recipe_steps.find((s) => s.step_number === session.current_step)?.instruction;

      try {
        // Silently send the step to the AI to be scrubbed
        const res = await fetch("/api/ai/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            command: "Silently apply the scratchpad rules to this step.", 
            currentStep: currentStepText,
            dietaryProfile: dietaryPrefs,
            scratchpad: session.modifications?.scratchpad 
          }),
        });

        const aiResponse = await res.json();

        // If the AI rewrites it, save it immediately!
        if (aiResponse.updated_instruction) {
          const currentMods = { ...(session.modifications || {}) };
          const aiSteps = { ...(currentMods.ai_steps || {}) };
          aiSteps[session.current_step] = aiResponse.updated_instruction;
          
          const newMods = { ...currentMods, ai_steps: aiSteps };

          // Save to database
          await supabase.from("cooking_sessions").update({ modifications: newMods }).eq("id", session.id);
          
          // 2. THE FUNCTIONAL UPDATE: Fixes the React warning perfectly
          setSession(prev => prev ? { ...prev, modifications: newMods } : prev);
          setShowOriginal(false);
        }
      } catch (error) {
        console.error("Background AI sync failed:", error);
      } finally {
        setIsProcessingAI(false);
      }
    };

    autoCleanStep();
  }, [session, recipe, dietaryPrefs]); 


  if (loading || !recipe || !session) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">Loading Kitchen...</div>;
  }

  // Find the exact instruction for the step the user is currently on
  const currentStepData = recipe.recipe_steps.find((s) => s.step_number === session.current_step);
// Check if the AI has modified this specific step in the database
  const aiModifiedInstruction = session?.modifications?.ai_steps?.[session.current_step];
  
  // Decide which text to show based on the toggle button
  const displayText = aiModifiedInstruction && !showOriginal 
    ? aiModifiedInstruction 
    : currentStepData?.instruction;
  return (
    <main className="flex flex-col min-h-screen bg-gray-900 text-white">
      {/* Top Header */}
      <div className="flex justify-between items-center p-6 border-b border-gray-800">
        <button
          type="button"
          title="Go back"
          aria-label="Go back"
          onClick={() => router.push("/")}
          className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-medium text-gray-400">
          Step {session.current_step} of {recipe.recipe_steps.length}
        </span>
        <div className="w-9"></div> {/* Empty spacer for alignment */}
      </div>

      {/* Main Instruction Area */}
      <div className="grow flex flex-col items-center justify-center p-8 text-center">
        <div className="flex flex-col items-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold leading-tight text-center">
            {displayText}
          </h2>
          
          {/* Only show the toggle button if the AI actually modified this step */}
          {aiModifiedInstruction && (
            <button
              onClick={() => setShowOriginal(!showOriginal)}
              className="mt-6 flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full transition-colors bg-gray-800 text-blue-400 hover:bg-gray-700"
            >
              {showOriginal ? "✨ Switch to AI Adapted Version" : "📖 View Original Recipe Step"}
            </button>
          )}
        </div>
        
        {/* The AI Command Center */}
        <form 
          onSubmit={handleAICommand} 
          className="mt-8 w-full max-w-md flex items-center bg-gray-800 rounded-full p-1 border border-gray-700 shadow-xl"
        >
          <div className="p-3 text-blue-500">
            <Mic className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            disabled={isProcessingAI}
            placeholder="E.g., I just added chopped carrots..."
            className="grow bg-transparent text-white placeholder-gray-500 focus:outline-none p-2 text-sm"
          />
          <button 
            type="submit"
            disabled={isProcessingAI || !commandInput.trim()}
            className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-500 disabled:opacity-50 disabled:bg-gray-700 transition-colors"
          >
            {isProcessingAI ? (
              <span className="animate-pulse text-xs font-bold px-1">...</span>
            ) : (
              <Send className="w-4 h-4 ml-0.5" />
            )}
          </button>
        </form>
      </div>

      {/* Bottom Controls */}
      <div className="flex gap-4 p-6 bg-gray-950 pb-safe">
       <button 
          onClick={handlePrevStep}
          disabled={session.current_step === 1}
          className="w-1/3 bg-gray-800 py-4 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Previous
        </button>
        <button 
          onClick={handleNextStep}
          className="w-2/3 bg-white text-gray-900 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
        >
          {session.current_step === recipe.recipe_steps.length ? "Finish Meal" : "Next Step"}
          {session.current_step !== recipe.recipe_steps.length && <ChevronRight className="w-5 h-5" />}
        </button>
      </div>
      
      {/* Completion Celebration Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-md transition-opacity">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-sm rounded-3xl p-8 shadow-2xl text-center animate-in fade-in zoom-in duration-300">
            
            {/* Celebratory Icon */}
            <div className="w-24 h-24 bg-blue-900/30 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner shadow-blue-500/20">
              <ChefHat className="w-12 h-12" />
            </div>
            
            <h3 className="text-3xl font-bold text-white mb-3">Bon Appétit!</h3>
            
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
              You&apos;ve successfully conquered <span className="text-white font-medium">{recipe.title}</span>. Time to plate up and enjoy your masterpiece.
            </p>
            
            <button
              onClick={() => router.push("/")}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-500 active:scale-95 transition-all shadow-lg shadow-blue-900/50"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}

    </main>
  );
}