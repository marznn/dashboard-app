// Calorie + macro targets from a nutrition_profile row.
// Mifflin-St Jeor BMR → TDEE (activity factor) → goal adjustment.

const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

const GOAL_ADJUST = {
  lose: -500,
  maintain: 0,
  bulk: 300,
}

export const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sedentary (little/no exercise)' },
  { value: 'light', label: 'Light (1–3 days/week)' },
  { value: 'moderate', label: 'Moderate (3–5 days/week)' },
  { value: 'active', label: 'Active (6–7 days/week)' },
  { value: 'very_active', label: 'Very active (hard daily / physical job)' },
]

export const GOAL_OPTIONS = [
  { value: 'lose', label: 'Lose weight' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'bulk', label: 'Bulk' },
]

export function computeTargets(profile) {
  if (!profile) return null
  const kg = Number(profile.weight_lb) * 0.453592
  const cm = Number(profile.height_in) * 2.54
  const age = Number(profile.age)

  const bmr =
    profile.gender === 'male'
      ? 10 * kg + 6.25 * cm - 5 * age + 5
      : 10 * kg + 6.25 * cm - 5 * age - 161

  const tdee = bmr * (ACTIVITY_FACTORS[profile.activity] ?? 1.2)
  const calories = Math.max(1000, Math.round(tdee + (GOAL_ADJUST[profile.goal] ?? 0)))

  const protein_g = Math.round(Number(profile.weight_lb) * 1.0) // ~1g per lb bodyweight
  const fat_g = Math.round((calories * 0.25) / 9) // 25% of calories from fat
  const carbs_g = Math.max(0, Math.round((calories - protein_g * 4 - fat_g * 9) / 4))

  return { calories, protein_g, carbs_g, fat_g }
}
