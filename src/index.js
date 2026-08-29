// Cloudflare Worker — handles /api/* routes + serves static frontend assets
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // API: Risk Prediction
    if (url.pathname === "/api/predict" && request.method === "POST") {
      return handlePredict(request);
    }

    // API: Login / Registration
    if (url.pathname === "/api/login" && request.method === "POST") {
      return handleLogin(request);
    }

    // All other routes → serve static frontend assets
    return env.ASSETS.fetch(request);
  }
};

// ── /api/predict ─────────────────────────────────────────────
async function handlePredict(request) {
  try {
    const body = await request.json();
    const { pincode = "000000", state = "Unknown", lat = 0, lon = 0 } = body;

    const risk = calculateRisk(pincode, lat, lon);

    let alert;
    if (risk > 85)      alert = "HIGH RISK ALERT";
    else if (risk > 65) alert = "MODERATE RISK ALERT";
    else if (risk > 35) alert = "LESS RISK ALERT";
    else                alert = "NO RISK";

    return Response.json({
      state,
      risk_percentage: risk,
      alert,
      priorities: getPriorities(alert)
    }, { headers: corsHeaders() });

  } catch (e) {
    return Response.json({ error: "Prediction failed" }, { status: 500, headers: corsHeaders() });
  }
}

// ── /api/login ────────────────────────────────────────────────
async function handleLogin(request) {
  try {
    const body = await request.json();
    const { email = "", password = "", phone = "" } = body;

    if (!email && !phone) {
      return Response.json({ status: "error", message: "Missing credentials" },
        { status: 400, headers: corsHeaders() });
    }

    console.log(`[LOGIN] email=${email} phone=${phone} time=${new Date().toISOString()}`);

    return Response.json(
      { status: "success", message: "Login recorded." },
      { headers: corsHeaders() }
    );

  } catch (e) {
    return Response.json({ status: "error" }, { status: 500, headers: corsHeaders() });
  }
}

// ── Risk Scoring ─────────────────────────────────────────────
function calculateRisk(pincode, lat, lon) {
  const digits = String(pincode).replace(/\D/g, "");
  let seed = 0;
  for (let i = 0; i < digits.length; i++) {
    seed = (seed * 31 + parseInt(digits[i])) % 10000;
  }
  const base     = seed % 100;
  const latFactor = Math.abs(Math.sin((lat || 0) * 0.1)) * 20;
  const lonFactor = Math.abs(Math.cos((lon || 0) * 0.1)) * 15;
  return Math.min(99, Math.max(1, Math.floor(base * 0.6 + latFactor + lonFactor)));
}

function getPriorities(alert) {
  if (alert === "HIGH RISK ALERT") {
    return [
      { level: "Critical", action: "Deploy",   resource: "Ambulance" },
      { level: "Critical", action: "Deploy",   resource: "Rescue Team" },
      { level: "High",     action: "Activate", resource: "Generator" },
      { level: "High",     action: "Dispatch", resource: "Fire Brigade" },
      { level: "High",     action: "Dispatch", resource: "NDRF Unit" }
    ];
  } else if (alert === "MODERATE RISK ALERT") {
    return [
      { level: "Moderate", action: "Standby", resource: "Medical Team" },
      { level: "Moderate", action: "Alert",   resource: "Police Units" },
      { level: "Low",      action: "Prepare", resource: "Shelter Camps" }
    ];
  } else if (alert === "LESS RISK ALERT") {
    return [
      { level: "Low", action: "Monitor", resource: "Local Authorities" },
      { level: "Low", action: "Inform",  resource: "District Collector" }
    ];
  }
  return [];
}

// ── CORS Headers ─────────────────────────────────────────────
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
}
