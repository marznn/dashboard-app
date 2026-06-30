// Calorie + macro targets from a nutrition_profile row.
// Mifflin-St Jeor BMR → TDEE (activity factor) → deficit/surplus derived
// from the user's goal weight. Protein is set from lean body mass using
// the entered body-fat %.

const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sedentary (little/no exercise)' },
  { value: 'light', label: 'Light (1–3 days/week)' },
  { value: 'moderate', label: 'Moderate (3–5 days/week)' },
  { value: 'active', label: 'Active (6–7 days/week)' },
  { value: 'very_active', label: 'Very active (hard daily / physical job)' },
]

// Direction derived from current vs goal weight (±2 lb dead-band = maintain)
export function deriveGoal(weightLb, goalWeightLb) {
  const w = Number(weightLb)
  const g = Number(goalWeightLb)
  if (!g || Math.abs(g - w) <= 2) return 'maintain'
  return g < w ? 'lose' : 'bulk'
}

const GOAL_ADJUST = { lose: -500, maintain: 0, bulk: 300 }

export function computeTargets(profile) {
  if (!profile) return null
  const weightLb = Number(profile.weight_lb)
  const bf = Number(profile.body_fat_pct) || 0
  const kg = weightLb * 0.453592
  const cm = Number(profile.height_in) * 2.54
  const age = Number(profile.age)

  const bmr =
    profile.gender === 'male'
      ? 10 * kg + 6.25 * cm - 5 * age + 5
      : 10 * kg + 6.25 * cm - 5 * age - 161

  const tdee = bmr * (ACTIVITY_FACTORS[profile.activity] ?? 1.2)
  const goal = deriveGoal(weightLb, profile.goal_weight_lb)
  const calories = Math.max(1000, Math.round(tdee + GOAL_ADJUST[goal]))

  // Lean body mass drives protein (preserve/build muscle while changing weight)
  const lbm = bf > 0 ? weightLb * (1 - bf / 100) : weightLb
  const protein_g = Math.round(bf > 0 ? lbm * 1.1 : weightLb * 1.0)
  const fat_g = Math.round((calories * 0.25) / 9) // 25% of calories from fat
  const carbs_g = Math.max(0, Math.round((calories - protein_g * 4 - fat_g * 9) / 4))

  const goalLbm =
    profile.goal_weight_lb && profile.goal_bodyfat_pct != null
      ? Math.round(Number(profile.goal_weight_lb) * (1 - Number(profile.goal_bodyfat_pct) / 100))
      : null

  return {
    calories, protein_g, carbs_g, fat_g, goal,
    lbm: Math.round(lbm), goalLbm,
  }
}

export const GOAL_LABEL = {
  lose: 'Cutting — calorie deficit',
  maintain: 'Maintaining',
  bulk: 'Bulking — calorie surplus',
}
