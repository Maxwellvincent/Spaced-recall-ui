// DBZ Power Level mapping (approximate, based on DBZ canon)
export function getDbzPowerLevel(xp: number): number {
  if (xp >= 2000000) return 150000000; // Frieza (final form)
  if (xp >= 1000000) return 30000000;  // Goku (Super Saiyan)
  if (xp >= 500000) return 3000000;    // Vegeta (Namek)
  if (xp >= 100000) return 180000;     // Goku (Saiyan Saga)
  if (xp >= 50000) return 90000;       // Ginyu Force
  if (xp >= 9000) return 9001;         // Over 9000 meme
  if (xp >= 5000) return 8000;
  if (xp >= 1000) return 4000;
  if (xp >= 500) return 1500;
  if (xp >= 100) return 500;
  return Math.max(5, Math.floor(xp * 2)); // Early DBZ humans
}

export function getDbzMilestone(powerLevel: number): string {
  if (powerLevel >= 150000000) return "Final Form Frieza!";
  if (powerLevel >= 30000000) return "Super Saiyan Goku!";
  if (powerLevel >= 3000000) return "Namek Saga Vegeta!";
  if (powerLevel >= 180000) return "Saiyan Saga Goku!";
  if (powerLevel >= 90000) return "Ginyu Force!";
  if (powerLevel >= 9001) return "It's Over 9,000!";
  if (powerLevel >= 8000) return "Elite Saiyan!";
  if (powerLevel >= 4000) return "Piccolo (Saiyan Saga)!";
  if (powerLevel >= 1500) return "Raditz!";
  if (powerLevel >= 500) return "Yamcha!";
  return "Earthling";
} 