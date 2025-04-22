import { useState, useEffect } from 'react';
import { ThemeConfig, getAvailableThemes, generateCustomTheme } from '@/lib/xpSystem';
import Image from 'next/image';

interface ThemeSelectorProps {
  onThemeSelect: (theme: ThemeConfig) => void;
  currentTheme?: ThemeConfig;
}

export default function ThemeSelector({ onThemeSelect, currentTheme }: ThemeSelectorProps) {
  const [themes, setThemes] = useState<ThemeConfig[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<ThemeConfig | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customPreferences, setCustomPreferences] = useState({
    interests: [''],
    favoriteBooks: [''],
    favoriteMovies: [''],
    learningStyle: ''
  });

  useEffect(() => {
    setThemes(getAvailableThemes());
    if (currentTheme) {
      setSelectedTheme(currentTheme);
    }
  }, [currentTheme]);

  const handleGenerateTheme = async () => {
    setIsGenerating(true);
    try {
      const newTheme = await generateCustomTheme({
        interests: customPreferences.interests.filter(Boolean),
        favoriteBooks: customPreferences.favoriteBooks.filter(Boolean),
        favoriteMovies: customPreferences.favoriteMovies.filter(Boolean),
        learningStyle: customPreferences.learningStyle
      });
      setThemes([...themes, newTheme]);
      setSelectedTheme(newTheme);
      onThemeSelect(newTheme);
    } catch (error) {
      console.error('Error generating theme:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const addPreference = (type: 'interests' | 'favoriteBooks' | 'favoriteMovies') => {
    setCustomPreferences(prev => ({
      ...prev,
      [type]: [...prev[type], '']
    }));
  };

  const updatePreference = (
    type: 'interests' | 'favoriteBooks' | 'favoriteMovies',
    index: number,
    value: string
  ) => {
    setCustomPreferences(prev => ({
      ...prev,
      [type]: prev[type].map((item, i) => (i === index ? value : item))
    }));
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Select Your Learning Theme</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Default Themes */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Default Themes</h3>
          <div className="grid grid-cols-1 gap-4">
            {themes.map((theme) => (
              <div
                key={theme.name}
                className={`p-4 rounded-lg cursor-pointer transition-all ${
                  selectedTheme?.name === theme.name
                    ? 'bg-blue-600'
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
                onClick={() => {
                  setSelectedTheme(theme);
                  onThemeSelect(theme);
                }}
              >
                <div className="flex items-center space-x-4">
                  <div className="relative w-16 h-16">
                    <Image
                      src={theme.avatarLevels[0].image}
                      alt={theme.avatarLevels[0].name}
                      fill
                      className="rounded-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-medium">{theme.name}</h4>
                    <p className="text-sm text-gray-400">{theme.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Theme Generator */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Create Custom Theme</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Interests</label>
              {customPreferences.interests.map((interest, index) => (
                <input
                  key={index}
                  type="text"
                  id={`interest-${index}`}
                  name={`interest-${index}`}
                  className="w-full p-2 bg-slate-700 rounded mb-2"
                  value={interest}
                  onChange={(e) => updatePreference('interests', index, e.target.value)}
                  placeholder="Enter an interest"
                />
              ))}
              <button
                onClick={() => addPreference('interests')}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                + Add Interest
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Favorite Books</label>
              {customPreferences.favoriteBooks.map((book, index) => (
                <input
                  key={index}
                  type="text"
                  id={`book-${index}`}
                  name={`book-${index}`}
                  className="w-full p-2 bg-slate-700 rounded mb-2"
                  value={book}
                  onChange={(e) => updatePreference('favoriteBooks', index, e.target.value)}
                  placeholder="Enter a book title"
                />
              ))}
              <button
                onClick={() => addPreference('favoriteBooks')}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                + Add Book
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Learning Style</label>
              <select
                className="w-full p-2 bg-slate-700 rounded"
                value={customPreferences.learningStyle}
                onChange={(e) => setCustomPreferences(prev => ({
                  ...prev,
                  learningStyle: e.target.value
                }))}
              >
                <option value="">Select a learning style</option>
                <option value="visual">Visual</option>
                <option value="auditory">Auditory</option>
                <option value="reading">Reading/Writing</option>
                <option value="kinesthetic">Kinesthetic</option>
              </select>
            </div>

            <button
              onClick={handleGenerateTheme}
              disabled={isGenerating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:opacity-50"
            >
              {isGenerating ? 'Generating Theme...' : 'Generate Custom Theme'}
            </button>
          </div>
        </div>
      </div>

      {/* Theme Preview */}
      {selectedTheme && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-4">Theme Preview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedTheme.avatarLevels.map((avatar) => (
              <div key={avatar.level} className="bg-slate-700 p-4 rounded-lg">
                <div className="relative w-24 h-24 mx-auto mb-2">
                  <Image
                    src={avatar.image}
                    alt={avatar.name}
                    fill
                    className="rounded-full object-cover"
                  />
                </div>
                <h4 className="text-center font-medium">{avatar.name}</h4>
                <p className="text-sm text-center text-gray-400">
                  Level {avatar.level}
                </p>
                <p className="text-xs text-center text-gray-400 mt-1">
                  {avatar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 