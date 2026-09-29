export async function POST(request) {
  const body = await request.text();
  if (body.length > 10000) return new Response(null, {status:413});

  try {
    const upstream = await fetch('https://ethereum-rpc.publicnode.com', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body,
      signal:AbortSignal.timeout(25000)
    });
    return new Response(await upstream.text(), {
      status:upstream.status,
      headers:{'Content-Type':'application/json'}
    });
  } catch {
    return new Response(JSON.stringify({error:'Credit artwork service unavailable.'}), {
      status:502,
      headers:{'Content-Type':'application/json'}
    });
  }
}
