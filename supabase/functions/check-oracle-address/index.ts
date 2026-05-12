import { privateKeyToAccount } from "https://esm.sh/viem@2.21.55/accounts";

Deno.serve(() => {
  const pkRaw = Deno.env.get("ORACLE_PRIVATE_KEY") ?? "";
  const pk = (pkRaw.startsWith("0x") ? pkRaw : `0x${pkRaw}`) as `0x${string}`;
  try {
    const acct = privateKeyToAccount(pk);
    return new Response(JSON.stringify({ address: acct.address }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
