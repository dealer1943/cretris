const CONTRACT = '0x97630aa70ab14ed9883b41dafccbc11349723043';
const cache = new Map();

export function creditSources(level) {
  return [{
    id:100 + ((level - 1) * 100) % 122000,
    row:((level - 1) * 3 + 3) % 8 + 1
  }];
}

function decodeString(hex) {
  const bytes = Uint8Array.from(hex.match(/../g) || [], pair => parseInt(pair,16));
  return new TextDecoder().decode(bytes);
}

async function readCredit(id) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  let response;
  try {
    response = await fetch('/api/credits-rpc', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      signal:controller.signal,
      body:JSON.stringify({jsonrpc:'2.0',id,method:'eth_call',params:[{
        to:CONTRACT,data:'0xc87b56dd'+id.toString(16).padStart(64,'0')
      },'latest']})
    });
  } finally { clearTimeout(timeout); }
  if (!response.ok) throw new Error('Credit artwork service unavailable.');
  const rpc = await response.json();
  if (!rpc.result || rpc.result === '0x' || rpc.error) throw new Error(`Credit #${id} is unavailable.`);
  const payload = rpc.result.slice(2);
  const offset = Number(BigInt('0x'+payload.slice(0,64))) * 2;
  const length = Number(BigInt('0x'+payload.slice(offset,offset+64))) * 2;
  const uri = decodeString(payload.slice(offset+64,offset+64+length));
  const metadataResponse = await fetch(uri);
  if (!metadataResponse.ok) throw new Error(`Credit #${id} metadata unavailable.`);
  const metadata = await metadataResponse.json();
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = metadata.image;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 320;
  const ctx = canvas.getContext('2d', {willReadFrequently:true});
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0,320,320);
  ctx.drawImage(image,0,0,320,320);
  const rows = Array.from({length:8}, (_, y) => Array.from({length:8}, (_, x) => {
    const [r,g,b] = ctx.getImageData(90+x*20,90+y*20,1,1).data;
    return `rgb(${r} ${g} ${b})`;
  }));
  return {id, rows};
}

export function loadCredit(id) {
  if (!cache.has(id)) cache.set(id,readCredit(id).catch(error => {cache.delete(id); throw error;}));
  return cache.get(id);
}

export async function loadLevelSources(level) {
  const refs = creditSources(level);
  const credits = await Promise.all(refs.map(ref => loadCredit(ref.id)));
  return refs.map((ref,index) => ({...ref, colors:credits[index].rows[ref.row-1]}));
}
