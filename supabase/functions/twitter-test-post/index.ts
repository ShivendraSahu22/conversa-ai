// Verifies saved X OAuth1 credentials by posting a short test tweet,
// then deleting it so nothing stays on the user's timeline.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function percentEncode(s: string) {
  return encodeURIComponent(s).replace(
    /[!*'()]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

async function hmacSha1(key: string, msg: string) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function oauth1Header(
  method: string,
  url: string,
  creds: {
    consumer_key: string;
    consumer_secret: string;
    access_token: string;
    access_token_secret: string;
  },
) {
  const oauth: Record<string, string> = {
    oauth_consumer_key: creds.consumer_key,
    oauth_nonce: crypto.randomUUID().replace(/-/g, ""),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: creds.access_token,
    oauth_version: "1.0",
  };
  const paramStr = Object.keys(oauth)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(oauth[k])}`)
    .join("&");
  const base = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(paramStr)}`;
  const signingKey = `${percentEncode(creds.consumer_secret)}&${percentEncode(
    creds.access_token_secret,
  )}`;
  const signature = await hmacSha1(signingKey, base);
  oauth.oauth_signature = signature;
  return (
    "OAuth " +
    Object.keys(oauth)
      .sort()
      .map((k) => `${percentEncode(k)}="${percentEncode(oauth[k])}"`)
      .join(", ")
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: creds, error: credsErr } = await supabase
      .from("twitter_credentials")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (credsErr || !creds) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "No saved X credentials found. Save them first.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const text = `Techbook connection test ${new Date().toISOString()} — auto-deleting.`;
    const createUrl = "https://api.x.com/2/tweets";
    const createAuth = await oauth1Header("POST", createUrl, creds);

    const createRes = await fetch(createUrl, {
      method: "POST",
      headers: {
        Authorization: createAuth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });
    const createBody = await createRes.json().catch(() => ({}));

    if (!createRes.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          step: "create",
          status: createRes.status,
          error:
            createBody?.detail ||
            createBody?.title ||
            JSON.stringify(createBody),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const tweetId = createBody?.data?.id as string | undefined;
    let deleted = false;
    let deleteError: string | null = null;

    if (tweetId) {
      const delUrl = `https://api.x.com/2/tweets/${tweetId}`;
      const delAuth = await oauth1Header("DELETE", delUrl, creds);
      const delRes = await fetch(delUrl, {
        method: "DELETE",
        headers: { Authorization: delAuth },
      });
      const delBody = await delRes.json().catch(() => ({}));
      deleted = !!delBody?.data?.deleted;
      if (!deleted) deleteError = JSON.stringify(delBody);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        tweet_id: tweetId,
        deleted,
        delete_error: deleteError,
        screen_name: creds.screen_name ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
