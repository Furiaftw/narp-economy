// netlify/functions/data.js
// ─────────────────────────────────────────────────────
//  PUBLIC endpoint — no auth required.
//  Reads economy data from Netlify Blobs and returns JSON.
//  If no data stored yet, returns sensible defaults.
//  Called by the website on every page load (with cache).
// ─────────────────────────────────────────────────────

const { getStore, connectLambda } = require('@netlify/blobs');

const DEFAULT_CONFIG = {
  master_dial: 0.005,
  tiers: [
    { name: 'Lowest Cost', grp: 2    },
    { name: 'Base Cost',   grp: 4    },
    { name: 'Standard',    grp: 16   },
    { name: 'Premium',     grp: 40   },
    { name: 'Luxury',      grp: 90   },
    { name: 'Deluxe',      grp: 150  },
    { name: 'Epic',        grp: 250  },
    { name: 'Legendary',   grp: 500  },
    { name: 'Mythical',    grp: 1000 },
    { name: 'Exclusive',   grp: 2000 },
  ],
};

const DEFAULT_INCOMES = [
  { id: 'graded_rp',        name: 'Graded RP',         grp: 1,   category: 'player' },
  { id: 'd_rank',           name: 'D Rank Mission',    grp: 3,   category: 'player' },
  { id: 'c_rank',           name: 'C Rank Mission',    grp: 6,   category: 'player' },
  { id: 'b_rank',           name: 'B Rank Mission',    grp: 12,  category: 'player' },
  { id: 'b_plus_rank',      name: 'B+ Rank Mission',   grp: 24,  category: 'player' },
  { id: 'a_rank',           name: 'A Rank Mission',    grp: 40,  category: 'player' },
  { id: 's_rank',           name: 'S Rank Mission',    grp: 60,  category: 'player' },
  { id: 'events',           name: 'Events',            grp: 90,  category: 'player' },
  { id: 'promotion',        name: 'Promotion Mission', grp: 120, category: 'player' },
  { id: 'story_crafter',    name: 'Story Crafter',     grp: 16,  category: 'staff'  },
  { id: 'grading_staff',    name: 'Grading Staff',     grp: 8,   category: 'staff'  },
  { id: 'submission_staff', name: 'Submission Staff',  grp: 8,   category: 'staff'  },
];

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    connectLambda(event);
    const store = getStore('economy');

    // Read all data in parallel
    const [configRaw, shopRaw, incomesRaw, historyRaw] = await Promise.all([
      store.get('config',  { type: 'json' }).catch(() => null),
      store.get('shop',    { type: 'json' }).catch(() => null),
      store.get('incomes', { type: 'json' }).catch(() => null),
      store.get('history', { type: 'json' }).catch(() => null),
    ]);

    const config  = configRaw  || DEFAULT_CONFIG;
    const shop    = shopRaw    || [];
    const incomes = incomesRaw || DEFAULT_INCOMES;
    const history = historyRaw || [];

    // Calculate derived meta from latest history row
    const latest      = history.length > 0 ? history[history.length - 1] : null;
    const current_aw  = latest?.final_aw  || 0;
    const weekly_change = latest?.pct_change || 0;
    const inequality_cv = latest?.cv || 0;

    // Enrich shop items with calculated prices
    const enrichedShop = shop.map(item => {
      let price_ryo = 0;
      let graded_rp_effort = '';

      if (item.pricing_mode === 'ryo' && item.custom_ryo > 0) {
        // Fixed Ryo price
        price_ryo = Math.round(item.custom_ryo);
        const base = config.master_dial * current_aw;
        graded_rp_effort = base > 0 ? Math.round(price_ryo / base) + ' Graded RP' : '—';
      } else if (item.pricing_mode === 'grp' && item.custom_grp > 0) {
        // Custom Graded RP → convert to Ryo
        price_ryo = Math.round(item.custom_grp * config.master_dial * current_aw);
        graded_rp_effort = item.custom_grp + ' Graded RP';
      } else {
        // Tier-based pricing
        const tier = (config.tiers || DEFAULT_CONFIG.tiers).find(t => t.name === item.tier);
        const tierGRP = tier ? tier.grp : 16;
        price_ryo = Math.round(tierGRP * config.master_dial * current_aw);
        graded_rp_effort = tierGRP + ' Graded RP';
      }

      return { ...item, price_ryo, graded_rp_effort };
    });

    // Enrich income types with Ryo values
    const enrichedIncomes = incomes.map(inc => ({
      ...inc,
      reward_value_ryo: Math.round(inc.grp * config.master_dial * current_aw),
      grp_multiplier: inc.grp + ' Graded RP',
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        meta: {
          current_aw,
          master_dial:    config.master_dial,
          weekly_change,
          inequality_cv,
          player_count:   latest?.player_count || 0,
          last_updated:   latest?.date || null,
          generated_at:   new Date().toISOString(),
        },
        config,
        shop_items:   enrichedShop,
        income_types: enrichedIncomes,
        tiers:        config.tiers || DEFAULT_CONFIG.tiers,
        history,
      }),
    };
  } catch (err) {
    console.error('data function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message, type: err.constructor.name }),
    };
  }
};
