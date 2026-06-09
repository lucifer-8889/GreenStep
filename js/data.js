/**
 * @fileoverview Centralized data layer containing emission factors,
 * calculator questions, action recommendations, challenges, achievements,
 * education content, and pledge options. All exported constants are
 * deeply frozen to prevent accidental runtime mutation.
 */

/** @type {Object} Emission factors organized by category (kg CO₂ per unit per year) */
export const EMISSION_FACTORS = Object.freeze({
  transport: {
    // km per week -> annual kg CO₂
    carPetrol: 0.192 * 52,       // 0.192 kg/km * 52 weeks
    carDiesel: 0.171 * 52,
    carHybrid: 0.110 * 52,
    carElectric: 0.053 * 52,
    publicTransit: 0.089 * 52,
    motorcycle: 0.103 * 52,
    bicycle: 0,
    walking: 0,
    // flights per year
    shortFlight: 255,   // kg CO₂ per short-haul flight (<3h)
    mediumFlight: 600,  // per medium-haul (3-6h)
    longFlight: 1800,   // per long-haul (>6h)
  },
  energy: {
    // per kWh per month
    electricity: 0.42 * 12,  // global average kg CO₂/kWh
    naturalGas: 2.0 * 12,    // per cubic meter per month
    heatingOil: 2.54 * 12,   // per liter per month
    solarOffset: -0.42 * 12, // offset per kWh from solar
  },
  diet: {
    // annual kg CO₂ per diet type
    heavyMeat: 3300,
    mediumMeat: 2500,
    lightMeat: 1900,
    pescatarian: 1700,
    vegetarian: 1500,
    vegan: 1100,
  },
  shopping: {
    // monthly spending categories -> annual kg CO₂
    clothing: 15 * 12,      // per item per month avg
    electronics: 50 * 12,   // per device
    furniture: 30 * 12,
    general: 5 * 12,
  },
  waste: {
    // kg CO₂ per behavior
    recycleNone: 1200,
    recycleSome: 800,
    recycleMost: 400,
    recycleAll: 200,
    compost: -150,     // offset
  }
});

/** @type {Object} National/global CO₂ per-capita averages in tonnes/year */
export const COUNTRY_AVERAGES = Object.freeze({
  world: 4.7,
  usa: 15.5,
  uk: 5.5,
  eu: 6.8,
  india: 1.9,
  china: 7.4,
  brazil: 2.3,
  japan: 9.0,
  australia: 15.3,
  canada: 14.2,
  germany: 8.9,
  france: 4.6,
});

/** @type {number} Paris Agreement target: tonnes CO₂ per person by 2030 */
export const PARIS_TARGET = 2.1;

/** @type {Array} Category metadata with colors and emoji */
export const CATEGORIES = Object.freeze([
  { id: 'transport', name: 'Transport', emoji: '🚗', color: '#38bdf8' },
  { id: 'energy',    name: 'Home Energy', emoji: '⚡', color: '#f59e0b' },
  { id: 'diet',      name: 'Diet', emoji: '🥩', color: '#ef4444' },
  { id: 'shopping',  name: 'Shopping', emoji: '🛍️', color: '#a78bfa' },
  { id: 'waste',     name: 'Waste', emoji: '♻️', color: '#10b981' },
]);

/** @type {Array} Multi-step calculator wizard question definitions */
export const CALCULATOR_STEPS = Object.freeze([
  {
    id: 'transport',
    title: '🚗 Transportation',
    description: 'How do you get around?',
    fields: [
      {
        id: 'carType',
        label: 'Primary vehicle type',
        type: 'select',
        options: [
          { value: 'none', label: 'I don\'t drive' },
          { value: 'carPetrol', label: 'Petrol / Gasoline car' },
          { value: 'carDiesel', label: 'Diesel car' },
          { value: 'carHybrid', label: 'Hybrid car' },
          { value: 'carElectric', label: 'Electric car' },
          { value: 'motorcycle', label: 'Motorcycle / Scooter' },
        ]
      },
      {
        id: 'carKm',
        label: 'Weekly driving distance',
        type: 'slider',
        min: 0, max: 500, step: 10, defaultValue: 100,
        unit: 'km/week'
      },
      {
        id: 'publicTransitKm',
        label: 'Weekly public transit distance',
        type: 'slider',
        min: 0, max: 200, step: 5, defaultValue: 20,
        unit: 'km/week'
      },
      {
        id: 'shortFlights',
        label: 'Short-haul flights per year (<3 hours)',
        type: 'slider',
        min: 0, max: 20, step: 1, defaultValue: 2,
        unit: 'flights'
      },
      {
        id: 'longFlights',
        label: 'Long-haul flights per year (>6 hours)',
        type: 'slider',
        min: 0, max: 10, step: 1, defaultValue: 1,
        unit: 'flights'
      },
    ]
  },
  {
    id: 'energy',
    title: '⚡ Home Energy',
    description: 'Tell us about your home energy usage.',
    fields: [
      {
        id: 'electricityKwh',
        label: 'Monthly electricity usage',
        type: 'slider',
        min: 0, max: 1000, step: 10, defaultValue: 300,
        unit: 'kWh/month'
      },
      {
        id: 'gasM3',
        label: 'Monthly natural gas usage',
        type: 'slider',
        min: 0, max: 200, step: 5, defaultValue: 50,
        unit: 'm³/month'
      },
      {
        id: 'hasSolar',
        label: 'Do you have solar panels?',
        type: 'select',
        options: [
          { value: 'no', label: 'No' },
          { value: 'partial', label: 'Yes — covers some usage' },
          { value: 'full', label: 'Yes — covers most usage' },
        ]
      },
      {
        id: 'householdSize',
        label: 'People in your household',
        type: 'slider',
        min: 1, max: 8, step: 1, defaultValue: 2,
        unit: 'people'
      },
    ]
  },
  {
    id: 'diet',
    title: '🍽️ Diet & Food',
    description: 'What does your typical diet look like?',
    fields: [
      {
        id: 'dietType',
        label: 'Diet type',
        type: 'select',
        options: [
          { value: 'heavyMeat', label: 'Heavy meat eater (daily meat)' },
          { value: 'mediumMeat', label: 'Medium meat eater (3-5 times/week)' },
          { value: 'lightMeat', label: 'Light meat eater (1-2 times/week)' },
          { value: 'pescatarian', label: 'Pescatarian (fish, no meat)' },
          { value: 'vegetarian', label: 'Vegetarian' },
          { value: 'vegan', label: 'Vegan' },
        ]
      },
      {
        id: 'localFood',
        label: 'How often do you buy local/seasonal food?',
        type: 'select',
        options: [
          { value: 'never', label: 'Rarely or never' },
          { value: 'sometimes', label: 'Sometimes' },
          { value: 'often', label: 'Most of the time' },
          { value: 'always', label: 'Always' },
        ]
      },
      {
        id: 'foodWaste',
        label: 'How much food do you waste weekly?',
        type: 'select',
        options: [
          { value: 'high', label: 'A lot — frequently throwing food away' },
          { value: 'medium', label: 'Some — occasionally waste food' },
          { value: 'low', label: 'Very little — I plan meals carefully' },
          { value: 'none', label: 'Almost none — I compost leftovers' },
        ]
      },
    ]
  },
  {
    id: 'shopping',
    title: '🛍️ Shopping & Goods',
    description: 'Your consumption habits.',
    fields: [
      {
        id: 'clothingItems',
        label: 'New clothing items per month',
        type: 'slider',
        min: 0, max: 20, step: 1, defaultValue: 3,
        unit: 'items'
      },
      {
        id: 'electronicsYear',
        label: 'Electronic devices purchased per year',
        type: 'slider',
        min: 0, max: 10, step: 1, defaultValue: 2,
        unit: 'devices'
      },
      {
        id: 'shoppingHabit',
        label: 'Shopping preference',
        type: 'select',
        options: [
          { value: 'new', label: 'Mostly buy new items' },
          { value: 'mixed', label: 'Mix of new and second-hand' },
          { value: 'secondhand', label: 'Prefer second-hand / thrift' },
          { value: 'minimal', label: 'Minimalist — buy only essentials' },
        ]
      },
    ]
  },
  {
    id: 'waste',
    title: '♻️ Waste & Recycling',
    description: 'How do you handle waste?',
    fields: [
      {
        id: 'recycling',
        label: 'How much do you recycle?',
        type: 'select',
        options: [
          { value: 'recycleNone', label: 'I don\'t recycle' },
          { value: 'recycleSome', label: 'I recycle some items' },
          { value: 'recycleMost', label: 'I recycle most items' },
          { value: 'recycleAll', label: 'I recycle everything possible' },
        ]
      },
      {
        id: 'composting',
        label: 'Do you compost?',
        type: 'select',
        options: [
          { value: 'no', label: 'No' },
          { value: 'yes', label: 'Yes' },
        ]
      },
      {
        id: 'plasticUse',
        label: 'Single-use plastic consumption',
        type: 'select',
        options: [
          { value: 'high', label: 'Frequent — bags, bottles, packaging' },
          { value: 'medium', label: 'Moderate — trying to reduce' },
          { value: 'low', label: 'Low — I use reusables' },
          { value: 'none', label: 'Almost zero plastic' },
        ]
      },
    ]
  }
]);

/** @type {Array} Curated action recommendations with savings data */
export const ACTIONS = Object.freeze([
  {
    id: 'bike-commute',
    category: 'transport',
    title: 'Bike or Walk to Work',
    description: 'Replace short car trips with cycling or walking. Great for health and the environment.',
    icon: '🚲',
    savingsKg: 750,
    difficulty: 'medium',
    costSaving: '$1,200/yr',
  },
  {
    id: 'public-transit',
    category: 'transport',
    title: 'Switch to Public Transit',
    description: 'Use buses, trains, and metros instead of driving alone.',
    icon: '🚆',
    savingsKg: 1200,
    difficulty: 'easy',
    costSaving: '$3,000/yr',
  },
  {
    id: 'ev-switch',
    category: 'transport',
    title: 'Switch to Electric Vehicle',
    description: 'EVs produce significantly less CO₂ over their lifetime, especially with renewable energy.',
    icon: '⚡',
    savingsKg: 2400,
    difficulty: 'hard',
    costSaving: '$1,500/yr fuel',
  },
  {
    id: 'reduce-flights',
    category: 'transport',
    title: 'Reduce Air Travel',
    description: 'Take one fewer long-haul flight per year. Consider trains for shorter distances.',
    icon: '✈️',
    savingsKg: 1800,
    difficulty: 'medium',
    costSaving: 'Varies',
  },
  {
    id: 'led-bulbs',
    category: 'energy',
    title: 'Switch to LED Lighting',
    description: 'LED bulbs use 75% less energy and last 25x longer than incandescent bulbs.',
    icon: '💡',
    savingsKg: 136,
    difficulty: 'easy',
    costSaving: '$75/yr',
  },
  {
    id: 'solar-panels',
    category: 'energy',
    title: 'Install Solar Panels',
    description: 'Generate your own clean energy and reduce grid dependence.',
    icon: '☀️',
    savingsKg: 1500,
    difficulty: 'hard',
    costSaving: '$1,000/yr',
  },
  {
    id: 'thermostat',
    category: 'energy',
    title: 'Smart Thermostat',
    description: 'Reduce heating/cooling by 2°C. Smart thermostats optimize automatically.',
    icon: '🌡️',
    savingsKg: 500,
    difficulty: 'easy',
    costSaving: '$180/yr',
  },
  {
    id: 'insulation',
    category: 'energy',
    title: 'Improve Home Insulation',
    description: 'Better insulation reduces heating energy by up to 40%.',
    icon: '🏠',
    savingsKg: 800,
    difficulty: 'hard',
    costSaving: '$500/yr',
  },
  {
    id: 'reduce-meat',
    category: 'diet',
    title: 'Eat Less Meat',
    description: 'Swap 3 meat meals per week with plant-based alternatives.',
    icon: '🥗',
    savingsKg: 600,
    difficulty: 'medium',
    costSaving: '$400/yr',
  },
  {
    id: 'go-vegetarian',
    category: 'diet',
    title: 'Go Vegetarian',
    description: 'A vegetarian diet reduces food-related emissions by ~50%.',
    icon: '🌱',
    savingsKg: 1100,
    difficulty: 'medium',
    costSaving: '$600/yr',
  },
  {
    id: 'local-food',
    category: 'diet',
    title: 'Buy Local & Seasonal',
    description: 'Reduce food miles by choosing local, in-season produce.',
    icon: '🧑‍🌾',
    savingsKg: 350,
    difficulty: 'easy',
    costSaving: '$200/yr',
  },
  {
    id: 'reduce-food-waste',
    category: 'diet',
    title: 'Reduce Food Waste',
    description: 'Plan meals, use leftovers, and compost scraps.',
    icon: '🍲',
    savingsKg: 300,
    difficulty: 'easy',
    costSaving: '$500/yr',
  },
  {
    id: 'secondhand',
    category: 'shopping',
    title: 'Buy Second-Hand',
    description: 'Thrift stores, online marketplaces — extend product lifecycles.',
    icon: '🏷️',
    savingsKg: 450,
    difficulty: 'easy',
    costSaving: '$800/yr',
  },
  {
    id: 'less-fast-fashion',
    category: 'shopping',
    title: 'Quit Fast Fashion',
    description: 'Buy fewer, higher-quality clothes. Repair instead of replacing.',
    icon: '👗',
    savingsKg: 400,
    difficulty: 'medium',
    costSaving: '$600/yr',
  },
  {
    id: 'recycle-more',
    category: 'waste',
    title: 'Maximize Recycling',
    description: 'Learn what can be recycled locally. Clean and sort properly.',
    icon: '♻️',
    savingsKg: 400,
    difficulty: 'easy',
    costSaving: '$50/yr',
  },
  {
    id: 'composting',
    category: 'waste',
    title: 'Start Composting',
    description: 'Divert food scraps from landfill. Use compost in your garden.',
    icon: '🪱',
    savingsKg: 200,
    difficulty: 'easy',
    costSaving: '$100/yr',
  },
  {
    id: 'zero-waste',
    category: 'waste',
    title: 'Go Zero-Waste',
    description: 'Eliminate single-use plastics. Use reusable bags, bottles, and containers.',
    icon: '🌍',
    savingsKg: 600,
    difficulty: 'hard',
    costSaving: '$300/yr',
  },
  {
    id: 'green-energy',
    category: 'energy',
    title: 'Switch to Green Energy',
    description: 'Choose a renewable energy provider for your electricity.',
    icon: '🌿',
    savingsKg: 1200,
    difficulty: 'easy',
    costSaving: '$0 (same price)',
  },
]);

/** @type {Array} Pool of daily challenges that rotate by date */
export const DAILY_CHALLENGES = Object.freeze([
  { id: 'c1', emoji: '🚶', title: 'Walk Instead', desc: 'Walk or bike for at least one trip today instead of driving.', impactKg: 2.5 },
  { id: 'c2', emoji: '🥗', title: 'Meat-Free Day', desc: 'Go entirely plant-based for all meals today.', impactKg: 3.6 },
  { id: 'c3', emoji: '💡', title: 'Lights Out', desc: 'Turn off all unnecessary lights and unplug idle electronics.', impactKg: 1.2 },
  { id: 'c4', emoji: '🚿', title: 'Short Shower', desc: 'Keep your shower under 5 minutes today.', impactKg: 1.0 },
  { id: 'c5', emoji: '♻️', title: 'Recycle Right', desc: 'Sort all your waste properly and recycle everything you can.', impactKg: 0.8 },
  { id: 'c6', emoji: '🛒', title: 'No Plastic', desc: 'Avoid all single-use plastic today. Bring your own bags and bottle.', impactKg: 0.5 },
  { id: 'c7', emoji: '🌱', title: 'Plant Something', desc: 'Plant a seed, herb, or flower today.', impactKg: 0.1 },
  { id: 'c8', emoji: '📦', title: 'Declutter & Donate', desc: 'Find 5 items to donate or give away instead of throwing out.', impactKg: 2.0 },
  { id: 'c9', emoji: '🍳', title: 'Cook at Home', desc: 'Prepare all meals at home using local ingredients.', impactKg: 2.0 },
  { id: 'c10', emoji: '🚌', title: 'Public Transit Day', desc: 'Use only public transportation today.', impactKg: 3.0 },
  { id: 'c11', emoji: '🧊', title: 'Thermostat Challenge', desc: 'Lower your heating by 2°C or raise cooling by 2°C.', impactKg: 1.5 },
  { id: 'c12', emoji: '📱', title: 'Digital Detox', desc: 'Reduce screen time by 2 hours. Less energy, more presence.', impactKg: 0.3 },
  { id: 'c13', emoji: '🧺', title: 'Air-Dry Laundry', desc: 'Skip the dryer and air-dry your clothes today.', impactKg: 2.4 },
  { id: 'c14', emoji: '🍎', title: 'Zero Food Waste', desc: 'Plan meals to use all perishables. No food in the bin today.', impactKg: 1.8 },
  { id: 'c15', emoji: '🌳', title: 'Nature Connection', desc: 'Spend 30 minutes outdoors in nature. Appreciate what we protect.', impactKg: 0 },
  { id: 'c16', emoji: '💧', title: 'Water Saver', desc: 'Fix a leak, shorten showers, or reuse water today.', impactKg: 0.7 },
  { id: 'c17', emoji: '📖', title: 'Learn & Share', desc: 'Read a climate article and share one fact with someone.', impactKg: 0 },
  { id: 'c18', emoji: '🛠️', title: 'Repair Something', desc: 'Fix an item instead of buying a replacement.', impactKg: 5.0 },
  { id: 'c19', emoji: '🥤', title: 'Reusable Only', desc: 'Use only reusable cups, bottles, and containers all day.', impactKg: 0.4 },
  { id: 'c20', emoji: '🏪', title: 'Shop Local', desc: 'Buy from a local store or farmer\'s market today.', impactKg: 1.5 },
  { id: 'c21', emoji: '🚗', title: 'Carpool Day', desc: 'Share a ride with a colleague, friend, or neighbor.', impactKg: 3.5 },
  { id: 'c22', emoji: '🧹', title: 'Clean Green', desc: 'Use only eco-friendly cleaning products today.', impactKg: 0.2 },
  { id: 'c23', emoji: '☕', title: 'Bring Your Mug', desc: 'Use your own reusable mug for all beverages today.', impactKg: 0.1 },
  { id: 'c24', emoji: '🌿', title: 'Meatless Monday', desc: 'Start the week right — no meat today!', impactKg: 3.6 },
  { id: 'c25', emoji: '📋', title: 'Meal Prep', desc: 'Plan and prepare meals for the next 3 days to reduce waste.', impactKg: 2.5 },
]);

/** @type {Array} Achievement definitions with tiers and unlock thresholds */
export const ACHIEVEMENTS = Object.freeze([
  { id: 'first-calc', name: 'First Step', emoji: '🌱', desc: 'Complete your first carbon calculation', tier: 'bronze', threshold: 1 },
  { id: 'streak-3', name: 'Eco Warrior', emoji: '🔥', desc: 'Complete 3 daily challenges in a row', tier: 'bronze', threshold: 3 },
  { id: 'streak-7', name: 'Week Champion', emoji: '⭐', desc: '7-day challenge streak', tier: 'silver', threshold: 7 },
  { id: 'streak-14', name: 'Fortnight Force', emoji: '💪', desc: '14-day challenge streak', tier: 'silver', threshold: 14 },
  { id: 'streak-30', name: 'Monthly Master', emoji: '🏆', desc: '30-day challenge streak!', tier: 'gold', threshold: 30 },
  { id: 'actions-3', name: 'Action Taker', emoji: '🎯', desc: 'Adopt 3 green actions', tier: 'bronze', threshold: 3 },
  { id: 'actions-5', name: 'Change Maker', emoji: '🌍', desc: 'Adopt 5 green actions', tier: 'silver', threshold: 5 },
  { id: 'actions-10', name: 'Eco Hero', emoji: '🦸', desc: 'Adopt 10 green actions', tier: 'gold', threshold: 10 },
  { id: 'pledge-1', name: 'Pledger', emoji: '✊', desc: 'Make your first pledge', tier: 'bronze', threshold: 1 },
  { id: 'pledge-5', name: 'Committed', emoji: '💚', desc: 'Make 5 pledges', tier: 'silver', threshold: 5 },
  { id: 'below-avg', name: 'Below Average', emoji: '📉', desc: 'Score below global average', tier: 'gold', threshold: 1 },
  { id: 'paris-ready', name: 'Paris Ready', emoji: '🌏', desc: 'Reach Paris Agreement target (2.1 tonnes)', tier: 'platinum', threshold: 1 },
]);

/** @type {Array} Climate facts for the education carousel */
export const ECO_FACTS = Object.freeze([
  { emoji: '🌡️', text: 'The Earth\'s average temperature has risen by 1.1°C since pre-industrial times. We need to limit warming to 1.5°C to avoid the worst impacts.', source: 'IPCC AR6, 2021' },
  { emoji: '✈️', text: 'A single round-trip transatlantic flight generates about 1.6 tonnes of CO₂ — nearly as much as the average person in India produces in an entire year.', source: 'ICAO Carbon Calculator' },
  { emoji: '🥩', text: 'Beef production generates 60 kg of CO₂ per kg of food — that\'s 100x more than peas (0.9 kg CO₂).', source: 'Our World in Data' },
  { emoji: '🌳', text: 'A single mature tree absorbs about 22 kg of CO₂ per year. We need 50 billion trees planted to offset current emissions.', source: 'European Environment Agency' },
  { emoji: '🚗', text: 'Transportation accounts for about 27% of all greenhouse gas emissions globally. Electric vehicles can cut driving emissions by 50-70%.', source: 'EPA & IEA' },
  { emoji: '🏠', text: 'Buildings consume 40% of global energy. Simple measures like insulation and LED lighting can cut household emissions by 30%.', source: 'UNEP' },
  { emoji: '🌊', text: 'The ocean absorbs about 30% of human-produced CO₂, but this is causing ocean acidification, threatening marine ecosystems.', source: 'NOAA' },
  { emoji: '⚡', text: 'Renewable energy is now cheaper than fossil fuels in most countries. Solar energy costs have dropped 89% since 2010.', source: 'IRENA, 2023' },
  { emoji: '🗑️', text: 'Food waste accounts for 8-10% of global greenhouse gas emissions. If it were a country, it would be the 3rd largest emitter.', source: 'FAO' },
  { emoji: '🧊', text: 'The Arctic is warming 4 times faster than the global average. Summer Arctic sea ice has declined by 40% since 1979.', source: 'NASA' },
]);

/** @type {Array} Deep-dive educational comparison cards */
export const EDU_CARDS = Object.freeze([
  {
    icon: '🚗',
    title: 'Transport Impact',
    text: 'Transportation is the largest source of personal emissions. One car emits about 4.6 tonnes of CO₂ per year.',
    comparisons: [
      { label: 'Car (15,000 km/yr)', value: '4,600 kg' },
      { label: 'Electric Car', value: '2,100 kg' },
      { label: 'Public Transit', value: '1,300 kg' },
      { label: 'Bicycle', value: '0 kg' },
    ]
  },
  {
    icon: '🍔',
    title: 'Food & Diet',
    text: 'What you eat matters. Animal agriculture produces 14.5% of all greenhouse gas emissions.',
    comparisons: [
      { label: '1 kg Beef', value: '60 kg CO₂' },
      { label: '1 kg Chicken', value: '6 kg CO₂' },
      { label: '1 kg Rice', value: '2.7 kg CO₂' },
      { label: '1 kg Vegetables', value: '0.4 kg CO₂' },
    ]
  },
  {
    icon: '⚡',
    title: 'Home Energy',
    text: 'Your home is a big part of your footprint. Heating, cooling, and electricity are key areas to optimize.',
    comparisons: [
      { label: 'Coal electricity', value: '1.0 kg/kWh' },
      { label: 'Natural gas', value: '0.45 kg/kWh' },
      { label: 'Solar/Wind', value: '0.02 kg/kWh' },
      { label: 'Nuclear', value: '0.01 kg/kWh' },
    ]
  },
  {
    icon: '👗',
    title: 'Fashion Footprint',
    text: 'The fashion industry emits 10% of global carbon. A single cotton t-shirt requires 2,700 liters of water.',
    comparisons: [
      { label: 'New jeans', value: '33 kg CO₂' },
      { label: 'New t-shirt', value: '7 kg CO₂' },
      { label: 'Thrift jeans', value: '~0 kg CO₂' },
      { label: 'Repair & reuse', value: '~0 kg CO₂' },
    ]
  },
  {
    icon: '✈️',
    title: 'Flying vs. Ground',
    text: 'Air travel has a massive carbon impact. Taking a train instead of flying within Europe saves 80-90% of emissions.',
    comparisons: [
      { label: 'London→Paris flight', value: '244 kg CO₂' },
      { label: 'London→Paris train', value: '22 kg CO₂' },
      { label: 'London→NYC flight', value: '986 kg CO₂' },
      { label: 'Offset cost', value: '~$25' },
    ]
  },
  {
    icon: '🗑️',
    title: 'Waste Matters',
    text: 'The average person generates 0.74 kg of waste daily. Recycling and composting can divert 50-80% from landfills.',
    comparisons: [
      { label: 'Landfill methane', value: 'High GHG' },
      { label: 'Recycling', value: '-50% waste' },
      { label: 'Composting', value: '-30% waste' },
      { label: 'Zero waste', value: '-90% waste' },
    ]
  },
]);

/** @type {Array} Green pledge commitment options */
export const PLEDGE_OPTIONS = Object.freeze([
  { id: 'p-meatless', emoji: '🥬', text: 'Meatless Mondays', savingsKg: 156 },
  { id: 'p-transit', emoji: '🚌', text: 'Public Transit Commute', savingsKg: 900 },
  { id: 'p-reusable', emoji: '🥤', text: 'No Single-Use Plastic', savingsKg: 50 },
  { id: 'p-local', emoji: '🧑‍🌾', text: 'Buy Local Food', savingsKg: 350 },
  { id: 'p-energy', emoji: '💡', text: 'Reduce Energy 20%', savingsKg: 400 },
  { id: 'p-recycle', emoji: '♻️', text: 'Recycle Everything', savingsKg: 300 },
  { id: 'p-bike', emoji: '🚲', text: 'Bike to Work', savingsKg: 750 },
  { id: 'p-compost', emoji: '🪱', text: 'Start Composting', savingsKg: 150 },
  { id: 'p-thrift', emoji: '🏷️', text: 'Second-Hand Shopping', savingsKg: 450 },
  { id: 'p-tree', emoji: '🌳', text: 'Plant a Tree', savingsKg: 22 },
]);

/** @type {number} Average tree CO₂ absorption per year in kg */
export const TREE_ABSORPTION = 22;

/**
 * Converts raw kg CO₂ into relatable real-world equivalents.
 * @param {number} kgCO2 - Annual emissions in kilograms
 * @returns {{ tonnes: string, trees: number, flights: string, drivingKm: number }}
 */
export function relatableUnits(kgCO2) {
  const tonnes = kgCO2 / 1000;
  const trees = Math.ceil(kgCO2 / TREE_ABSORPTION);
  const flights = (kgCO2 / 1800).toFixed(1);
  const drivingKm = Math.round(kgCO2 / 0.192);
  return { tonnes: tonnes.toFixed(1), trees, flights, drivingKm };
}
