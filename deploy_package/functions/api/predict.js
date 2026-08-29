// Cloudflare Pages Function — replaces Python /api/predict endpoint
export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
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

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

// ── Risk Scoring ────────────────────────────────────────────
function calculateRisk(pincode, lat, lon) {
  // Deterministic score from pincode digits
  const digits = pincode.replace(/\D/g, "");
  let seed = 0;
  for (let i = 0; i < digits.length; i++) {
    seed = (seed * 31 + parseInt(digits[i])) % 10000;
  }

  // Combine pincode seed with geographic factors
  const base     = seed % 100;
  const latFactor = Math.abs(Math.sin(lat * 0.1)) * 20;
  const lonFactor = Math.abs(Math.cos(lon * 0.1)) * 15;
  const risk      = Math.min(99, Math.max(1, Math.floor(base * 0.6 + latFactor + lonFactor)));

  return risk;
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

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
}
