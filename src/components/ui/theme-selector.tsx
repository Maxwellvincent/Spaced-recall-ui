import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState } from "react";

interface ThemeSelectorProps {
  currentTheme: string;
  onThemeSelect: (theme: string) => void;
  className?: string;
}

const themes = [
  {
    id: "dbz",
    name: "Dragon Ball Z",
    description: "Power up like a Saiyan warrior!",
    icon: "🔥",
    previewColor: "from-yellow-600 to-orange-600"
  },
  {
    id: "naruto",
    name: "Naruto",
    description: "Follow the ninja way to become Hokage!",
    icon: "🍃",
    previewColor: "from-orange-600 to-red-600"
  },
  {
    id: "hogwarts",
    name: "Hogwarts",
    description: "Master the magical arts at Hogwarts!",
    icon: "✨",
    previewColor: "from-purple-600 to-violet-600"
  },
  {
    id: "classic",
    name: "Classic",
    description: "Traditional progression system",
    icon: "📚",
    previewColor: "from-blue-600 to-cyan-600"
  }
];

export function ThemeSelector({
  currentTheme,
  onThemeSelect,
  className
}: ThemeSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);
  
  const handleThemeSelect = (themeId: string) => {
    setSelectedTheme(themeId);
    onThemeSelect(themeId);
  };
  
  return (
    <div className={cn("rounded-lg p-5 bg-slate-900/70 border border-slate-800", className)}>
      <h3 className="text-xl font-bold text-slate-200 mb-4">Choose Your Theme</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {themes.map((theme) => (
          <motion.div
            key={theme.id}
            className={cn(
              "relative p-4 rounded-lg cursor-pointer transition-all overflow-hidden border-2",
              selectedTheme === theme.id
                ? "border-white/50 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                : "border-transparent hover:border-white/20"
            )}
            whileHover={{ scale: 1.02 }}
            onClick={() => handleThemeSelect(theme.id)}
          >
            <div
              className={cn(
                "absolute inset-0 opacity-20 bg-gradient-to-br",
                theme.previewColor
              )}
            />
            
            <div className="relative flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-black/30 text-2xl">
                {theme.icon}
              </div>
              
              <div>
                <div className="flex items-center">
                  <h4 className="font-semibold text-lg text-slate-200">
                    {theme.name}
                  </h4>
                  
                  {selectedTheme === theme.id && (
                    <motion.div
                      className="ml-2 text-xs py-0.5 px-2 rounded-full bg-white/20 text-white"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring" }}
                    >
                      Active
                    </motion.div>
                  )}
                </div>
                
                <p className="text-sm text-slate-300/80">{theme.description}</p>
                
                {selectedTheme === theme.id && (
                  <motion.div
                    className="mt-3 text-sm text-slate-300"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    Tap to preview progression system
                  </motion.div>
                )}
              </div>
            </div>
            
            {selectedTheme === theme.id && (
              <motion.div
                className="absolute bottom-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-white text-slate-900"
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: 360 }}
                transition={{ type: "spring" }}
              >
                ✓
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
      
      <div className="mt-6 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <h4 className="font-medium text-slate-200 mb-2">Why themes matter</h4>
        <p className="text-sm text-slate-300/80">
          Themes provide visual motivation and add meaning to your learning journey. 
          They help track progress through fun, thematic visuals that make studying more engaging.
        </p>
      </div>
      
      <div className="flex justify-end mt-4">
        <button
          className="px-5 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
          onClick={() => onThemeSelect(selectedTheme)}
        >
          Apply Theme
        </button>
      </div>
    </div>
  );
} 