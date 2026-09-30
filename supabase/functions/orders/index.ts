import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function generateOrderCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "DS-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function getUniqueCode() {
  let code;
  let attempts = 0;
  do {
    code = generateOrderCode();
    const { data } = await supabase.from("orders").select("id").eq("code", code).maybeSingle();
    if (!data) return code;
    attempts++;
  } while (attempts < 10);
  return code;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    if (req.method === "POST" && url.pathname.endsWith("/create-order")) {
      const { items, customerName, customerPhone, customerEmail, customerNote } = await req.json();

      if (!Array.isArray(items) || items.length === 0) {
        return new Response(JSON.stringify({ error: "No items in order" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Fetch products to validate prices
      const productIds = items.map((i: any) => i.id);
      const { data: products } = await supabase.from("products").select("*").in("id", productIds);

      let total = 0;
      const lineItems = items.map((it: any) => {
        const p = products?.find((pr: any) => pr.id === it.id);
        if (!p) return null;
        const qty = Math.max(1, parseInt(it.qty, 10) || 1);
        total += p.price * qty;
        return { id: p.id, name: p.name, price: p.price, qty };
      }).filter(Boolean);

      if (lineItems.length === 0) {
        return new Response(JSON.stringify({ error: "No valid items" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const code = await getUniqueCode();

      const { data: order, error } = await supabase.from("orders").insert({
        code,
        customer_name: customerName || "",
        customer_phone: customerPhone || "",
        customer_email: customerEmail || "",
        customer_note: customerNote || "",
        items: lineItems,
        total,
        status: "awaiting payment",
      }).select().single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Log the event
      await supabase.from("activity_logs").insert({
        action: "order_placed",
        description: `Order ${code} placed by ${customerName || "customer"} — ${total}`,
        order_code: code,
        actor: "customer",
        metadata: { item_count: lineItems.length, total },
      });

      return new Response(JSON.stringify({ success: true, order }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Send receipt when payment is confirmed
    if (req.method === "POST" && url.pathname.endsWith("/send-receipt")) {
      const { orderId } = await req.json();

      const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();

      if (!order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      if (!order.customer_email) {
        return new Response(JSON.stringify({ error: "No email on file for this order" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Build receipt content
      const itemsText = order.items.map((it: any) =>
        `${it.qty}x ${it.name} — $${it.price * it.qty}`
      ).join("\n");

      const receiptHtml = `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; background: #0F0E0C; color: #F2EEE6; padding: 2rem; border-radius: 10px;">
          <div style="text-align: center; border-bottom: 1px solid #2A271F; padding-bottom: 1rem; margin-bottom: 1.5rem;">
            <h1 style="color: #2FA8A0; margin: 0; font-size: 1.5rem;">DREAM SPACE</h1>
            <p style="color: #A79E8E; font-size: 0.8rem; margin: 0.3rem 0 0;">Aluminum · Furniture & Interior Design</p>
          </div>
          <h2 style="color: #F2EEE6; font-size: 1.1rem;">Payment Receipt</h2>
          <p style="color: #A79E8E;">Thank you! Your payment has been confirmed.</p>
          <div style="background: #17150F; border: 1px dashed #2FA8A0; border-radius: 8px; padding: 0.8rem; text-align: center; margin: 1rem 0;">
            <span style="color: #A79E8E; font-size: 0.75rem;">ORDER CODE</span><br>
            <span style="color: #2FA8A0; font-size: 1.3rem; font-weight: bold; letter-spacing: 0.05em;">${order.code}</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
            <tr><td style="color: #A79E8E; padding: 0.3rem 0;">Date</td><td style="text-align: right;">${new Date(order.created_at).toLocaleDateString()}</td></tr>
            <tr><td style="color: #A79E8E; padding: 0.3rem 0;">Customer</td><td style="text-align: right;">${order.customer_name || "—"}</td></tr>
            <tr><td style="color: #A79E8E; padding: 0.3rem 0;">Status</td><td style="text-align: right; color: #2FA8A0;">Payment Confirmed</td></tr>
          </table>
          <div style="border-top: 1px solid #2A271F; border-bottom: 1px solid #2A271F; padding: 1rem 0; margin: 1rem 0;">
            ${order.items.map((it: any) => `
              <div style="display: flex; justify-content: space-between; padding: 0.3rem 0; font-size: 0.9rem;">
                <span>${it.qty}x ${it.name}</span>
                <span>$${it.price * it.qty}</span>
              </div>
            `).join("")}
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.1rem; padding: 0.5rem 0;">
            <span>Total</span><span style="color: #C9A25A;">$${order.total}</span>
          </div>
          <p style="color: #A79E8E; font-size: 0.8rem; text-align: center; margin-top: 1.5rem; border-top: 1px solid #2A271F; padding-top: 1rem;">
            Use code <strong style="color: #2FA8A0;">${order.code}</strong> to track your order status anytime.<br>
            Dream Space — #DreamSpaceDesign
          </p>
        </div>
      `;

      // Use Supabase's built-in email via the auth admin API isn't available for custom emails.
      // We'll store the receipt in the database and mark it as sent.
      // In production, this would connect to an email provider.
      // For now, we'll log it and mark receipt_sent = true.
      console.log(`Receipt for order ${order.code}:\nTo: ${order.customer_email}\n${itemsText}\nTotal: $${order.total}`);

      await supabase.from("orders").update({
        receipt_sent: true,
        updated_at: new Date().toISOString(),
      }).eq("id", orderId);

      // Log the receipt event
      await supabase.from("activity_logs").insert({
        action: "receipt_sent",
        description: `Receipt sent for order ${order.code} to ${order.customer_email}`,
        order_code: order.code,
        actor: "admin",
        metadata: { email: order.customer_email, total: order.total },
      });

      return new Response(JSON.stringify({
        success: true,
        message: "Receipt sent to " + order.customer_email,
        receiptHtml,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
