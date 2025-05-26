// Utility for theme-specific progress bar gradients
export function getProgressBarGradient(theme?: string): string {
  const gradients: Record<string, string> = {
    dbz: 'linear-gradient(90deg, #facc15 0%, #f59e42 100%)', // yellow to orange
    naruto: 'linear-gradient(90deg, #fb923c 0%, #f43f5e 100%)', // orange to red
    hogwarts: 'linear-gradient(90deg, #a78bfa 0%, #f472b6 100%)', // purple to pink
    default: 'linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%)', // blue to cyan
  };
  if (!theme) return gradients.default;
  const key = theme.toLowerCase();
  return gradients[key] || gradients.default;
}

export function getProgressBarGradientClass(theme?: string): string {
  const classes: Record<string, string> = {
    dbz: 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500',
    naruto: 'bg-gradient-to-r from-orange-400 via-orange-500 to-red-500',
    hogwarts: 'bg-gradient-to-r from-purple-400 via-pink-400 to-pink-600',
    default: 'bg-gradient-to-r from-blue-500 via-cyan-500 to-cyan-400',
  };
  if (!theme) return classes.default;
  const key = theme.toLowerCase();
  return classes[key] || classes.default;
} 