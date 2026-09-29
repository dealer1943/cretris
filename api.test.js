import test from 'node:test';
import assert from 'node:assert/strict';
import {POST} from './api/credits-rpc.js';

test('Vercel Credit proxy forwards RPC responses', async () => {
  const originalFetch = globalThis.fetch;
  let forwarded;
  globalThis.fetch = async (url, options) => {
    forwarded = {url, options};
    return new Response('{"jsonrpc":"2.0","result":"0x1234"}', {status:200});
  };
  try {
    const request = new Request('https://cretris.example/api/credits-rpc', {
      method:'POST', body:'{"method":"eth_call"}'
    });
    const response = await POST(request);
    assert.equal(response.status,200);
    assert.equal(forwarded.url,'https://ethereum-rpc.publicnode.com');
    assert.equal(forwarded.options.body,'{"method":"eth_call"}');
    assert.equal((await response.json()).result,'0x1234');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Vercel Credit proxy rejects oversized requests', async () => {
  const response = await POST(new Request('https://cretris.example/api/credits-rpc', {
    method:'POST', body:'x'.repeat(10001)
  }));
  assert.equal(response.status,413);
});
