/**
 * SOAP Profit Hunter — email capture worker
 * Deploy to Cloudflare Workers. Set these secrets via wrangler:
 *   wrangler secret put GHL_API_KEY
 *   wrangler secret put GHL_LOCATION_ID
 *
 * Routes: POST /api/capture  (CORS-enabled, called from soap-ai.com/profit-hunter)
 */

const GHL_BASE = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';

const ALLOWED_ORIGINS = [
  'https://soap-ai.com',
  'https://www.soap-ai.com',
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const corsHeaders = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('Bad request', { status: 400, headers: corsHeaders });
    }

    const { email, industry, revenue, worstP, totalLo, totalHi, industryLabel, revenueLabel, disqualified } = body;

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return new Response('Invalid email', { status: 400, headers: corsHeaders });
    }

    const tags = [
      'profit-hunter',
      `industry:${industry || 'unknown'}`,
      `revenue:${revenue || 'unknown'}`,
      `worst-p:${(worstP || 'unknown').toLowerCase()}`,
      disqualified ? 'dq:under-threshold' : 'qualified',
    ];

    const contactPayload = {
      locationId: env.GHL_LOCATION_ID,
      email,
      tags,
      customFields: [
        { key: 'profit_leak_lo',       field_value: String(totalLo || 0) },
        { key: 'profit_leak_hi',       field_value: String(totalHi || 0) },
        { key: 'industry_label',       field_value: industryLabel || '' },
        { key: 'revenue_label',        field_value: revenueLabel || '' },
        { key: 'worst_p',              field_value: worstP || '' },
        { key: 'calculator_source',    field_value: 'profit-hunter' },
      ],
      source: 'public api',
    };

    try {
      const res = await fetch(`${GHL_BASE}/contacts/upsert`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GHL_API_KEY}`,
          'Version': GHL_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactPayload),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error('GHL upsert failed:', res.status, err);
        return new Response('Upstream error', { status: 502, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (err) {
      console.error('Worker error:', err);
      return new Response('Internal error', { status: 500, headers: corsHeaders });
    }
  },
};
