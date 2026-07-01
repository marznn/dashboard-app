// Food lookup via USDA FoodData Central (official US govt nutrition database,
// free, CORS-enabled from the browser). Open Food Facts' search endpoints were
// tried first but are not callable client-side (no CORS headers on any of
// /cgi/search.pl, /api/v2/search, or the new search.openfoodfacts.org) — FDC
// works directly with no server/proxy needed.
//
// Reads VITE_USDA_API_KEY if set (get a free, non-rate-limited key in seconds
// at https://api.data.gov/signup/); falls back to the public DEMO_KEY, which
// is fine for trying this out but capped at ~30 requests/hour.

const API_KEY = import.meta.env.VITE_USDA_API_KEY || 'DEMO_KEY'

// Stable USDA nutrient IDs (consistent across Branded/Foundation/SR Legacy).
const NUTRIENT_ID = { calories: 1008, protein: 1003, carbs: 1005, fat: 1004 }

function titleCase(s) {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function nutrientValue(food, id) {
  const n = food.foodNutrients?.find((x) => x.nutrientId === id)
  return n ? Number(n.value) || 0 : null
}

function parseFood(food) {
  const name = (food.description || '').trim()
  if (!name) return null
  const calories = nutrientValue(food, NUTRIENT_ID.calories)
  const protein = nutrientValue(food, NUTRIENT_ID.protein)
  if (calories == null && protein == null) return null

  const brand = food.brandName || food.brandOwner || ''
  return {
    name: brand ? `${titleCase(name)} (${titleCase(brand)})` : titleCase(name),
    // FDC nutrient values are consistently reported per 100 g / 100 mL.
    basis: '100 g',
    calories: calories != null ? Math.round(calories) : 0,
    protein_g: Math.round(nutrientValue(food, NUTRIENT_ID.protein) ?? 0),
    carbs_g: Math.round(nutrientValue(food, NUTRIENT_ID.carbs) ?? 0),
    fat_g: Math.round(nutrientValue(food, NUTRIENT_ID.fat) ?? 0),
  }
}

export async function searchFoods(query, signal) {
  const q = query.trim()
  if (q.length < 2) return []
  const url =
    'https://api.nal.usda.gov/fdc/v1/foods/search' +
    `?query=${encodeURIComponent(q)}&pageSize=15&api_key=${encodeURIComponent(API_KEY)}`
  const res = await fetch(url, { signal })
  if (res.status === 429) {
    throw new Error(
      API_KEY === 'DEMO_KEY'
        ? 'Rate limited — the shared demo key is out of requests for now. Get a free key at api.data.gov/signup and set VITE_USDA_API_KEY.'
        : 'Rate limited — try again in a moment.',
    )
  }
  if (!res.ok) throw new Error('Food search failed')
  const json = await res.json()
  return (json.foods || []).map(parseFood).filter(Boolean).slice(0, 12)
}
