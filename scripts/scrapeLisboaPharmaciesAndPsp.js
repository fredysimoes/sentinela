const fs = require('fs');
const path = require('path');

const CONCELHOS_LISBOA = [
  { slug: 'alenquer', name: 'Alenquer' },
  { slug: 'amadora', name: 'Amadora' },
  { slug: 'arruda-dos-vinhos', name: 'Arruda dos Vinhos' },
  { slug: 'azambuja', name: 'Azambuja' },
  { slug: 'cadaval', name: 'Cadaval' },
  { slug: 'cascais', name: 'Cascais' },
  { slug: 'lisboa', name: 'Lisboa' },
  { slug: 'loures', name: 'Loures' },
  { slug: 'lourinha', name: 'Lourinhã' },
  { slug: 'mafra', name: 'Mafra' },
  { slug: 'odivelas', name: 'Odivelas' },
  { slug: 'oeiras', name: 'Oeiras' },
  { slug: 'sintra', name: 'Sintra' },
  { slug: 'sobral-de-monte-agraco', name: 'Sobral de Monte Agraço' },
  { slug: 'torres-vedras', name: 'Torres Vedras' },
  { slug: 'vila-franca-de-xira', name: 'Vila Franca de Xira' },
];

const KNOWN_24H_LISBOA_PHARMACIES = [
  'andrade',
  'barreto',
  'internacional',
  'sacoor',
  'restauradores',
  'santa maria',
  'colombo',
  'vasco da gama',
  'aeroporto',
  '2.ª circular',
  '2a circular',
  'segunda circular',
  'alvalade',
  'sao joao',
  'são joão',
  'cascaishopping',
  'cascais shopping',
  'oeiras parque',
  'amadora-sintra',
  'ubbo',
  'loureshopping',
];

async function fetchConcelhoPharmacies(concelho) {
  const url = `https://farmaciaperto.pt/lisboa/${concelho.slug}/`;
  console.log(`Fetching concelho: ${concelho.name}...`);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'SentinelaApp/1.0' } });
    if (!res.ok) {
      console.warn(`Failed to fetch ${url}: ${res.status}`);
      return [];
    }
    const html = await res.text();
    const regex = new RegExp(`href="(?:https://farmaciaperto\\.pt)?(/lisboa/${concelho.slug}/[^"]+\\.html)"`, 'g');
    const matches = [...html.matchAll(regex)].map((m) => m[1]);
    const uniqueLinks = [...new Set(matches)];
    console.log(`  Found ${uniqueLinks.length} pharmacies in ${concelho.name}`);

    const CHUNK_SIZE = 20;
    const items = [];

    for (let i = 0; i < uniqueLinks.length; i += CHUNK_SIZE) {
      const chunk = uniqueLinks.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Promise.all(
        chunk.map(async (link) => {
          try {
            const pageRes = await fetch(`https://farmaciaperto.pt${link}`, {
              headers: { 'User-Agent': 'SentinelaApp/1.0' },
            });
            if (!pageRes.ok) return null;
            const pageHtml = await pageRes.text();
            const jsonLdMatch = pageHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
            if (!jsonLdMatch) return null;

            const data = JSON.parse(jsonLdMatch[1]);
            if (!data?.geo?.latitude || !data?.geo?.longitude) return null;

            const rawName = (data.name || '').trim();
            const fullName =
              rawName.toLowerCase().startsWith('farmácia') || rawName.toLowerCase().startsWith('farmacia')
                ? rawName
                : `Farmácia ${rawName}`;

            const alvara = data.identifier?.value || link.replace(/.*-(\d+)\.html/, '$1');
            const street = (data.address?.streetAddress || '').replace(/\s+/g, ' ').trim();
            const postal = (data.address?.postalCode || '').trim();
            const locality = (data.address?.addressLocality || concelho.name).trim();

            // Extract Freguesia from the Official INFARMED Table if present
            const fregMatch = pageHtml.match(/<td><strong>Freguesia<\/strong><\/td><td>([^<]+)<\/td>/i);
            const freguesia = fregMatch ? fregMatch[1].trim() : '';

            const postalAndLoc = [postal, locality].filter(Boolean).join(' ');
            const addressFull = street
              ? `${street}${postalAndLoc ? ' (' + postalAndLoc + ')' : ''}${freguesia ? ' - Freguesia: ' + freguesia : ''}`
              : `${postalAndLoc || concelho.name}${freguesia ? ' - Freguesia: ' + freguesia : ''}`;

            const nameLower = fullName.toLowerCase();
            const is24h = KNOWN_24H_LISBOA_PHARMACIES.some((k) => nameLower.includes(k));

            return {
              id: `farm-lisboa-${alvara}`,
              type: 'pharmacy',
              name: fullName,
              address: addressFull,
              city: freguesia && freguesia.toLowerCase() !== concelho.name.toLowerCase()
                ? `${concelho.name} (${freguesia})`
                : concelho.name,
              district: 'Lisboa',
              latitude: Number(data.geo.latitude),
              longitude: Number(data.geo.longitude),
              hours: is24h
                ? { is24h: true }
                : {
                    is24h: false,
                    weekdayOpen: '08:30',
                    weekdayClose: '20:00',
                    saturdayOpen: '09:00',
                    saturdayClose: '13:00',
                  },
              hoursDescription: is24h
                ? 'Aberto 24h todos os dias sem interrupção (Serviço Permanente)'
                : 'Seg-Sex: 08:30-20:00 | Sáb: 09:00-13:00 | Dom: Encerrada',
            };
          } catch (err) {
            return null;
          }
        })
      );
      items.push(...chunkResults.filter(Boolean));
    }

    return items;
  } catch (e) {
    console.error(`Error processing ${concelho.name}:`, e);
    return [];
  }
}

async function fetchPspLisboaStations() {
  console.log('Fetching official PSP Unidades Territoriais from PSP / SGMAI ArcGIS FeatureServer...');
  const arcUrl =
    'https://services5.arcgis.com/j4eW900wJsR0Vv9G/arcgis/rest/services/(PSP)Unidades_Territoriais/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=json';
  const res = await fetch(arcUrl, { headers: { 'User-Agent': 'SentinelaApp/1.0' } });
  const data = await res.json();
  const features = data.features || [];
  console.log(`Total PSP features in Portugal: ${features.length}`);

  const lisboaStations = [];
  const seenIds = new Set();

  for (const feat of features) {
    const attr = feat.attributes || {};
    const geom = feat.geometry || {};
    const distrito = (attr.DISTRITO || '').trim();
    const comando = (attr.COMANDO || '').trim();

    if (
      !distrito.toLowerCase().includes('lisboa') &&
      !comando.toLowerCase().includes('lisboa')
    ) {
      continue;
    }

    const lat = Number(geom.y || attr.y || String(attr.LAT || '').replace(',', '.'));
    const lon = Number(geom.x || attr.x || String(attr.LONG || '').replace(',', '.'));
    if (!lat || !lon || isNaN(lat) || isNaN(lon)) continue;

    let rawDesc = (attr.DESCRICAO || attr.NOME || 'Esquadra da PSP').trim();
    // Clean prefixes like "CM LSB 1DV-" or "CM LSB LRS-" for cleaner reading while keeping full detail
    let cleanName = rawDesc
      .replace(/^CM\s+LSB\s+[A-Z0-9]+\s*-\s*/i, 'PSP - ')
      .replace(/^CM\s+LSB\s*-\s*/i, 'PSP - ')
      .replace(/Esqª/g, 'Esquadra');
    if (!cleanName.toUpperCase().startsWith('PSP')) {
      cleanName = `PSP - ${cleanName}`;
    }

    const morada = (attr.MORADA || '').trim();
    const cp = (attr.CP7 || '').trim();
    const localidade = (attr.LOCALIDADE || attr.CONCELHO || 'Lisboa').trim();
    const concelho = (attr.CONCELHO || localidade || 'Lisboa').trim();
    const phoneRaw = (attr.TELEFONE || '217 654 242').trim();
    const phone = phoneRaw.split('/')[0].trim();

    const slug = `${concelho}-${cleanName}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48);

    const id = `psp-lisboa-${attr.FID || attr.ObjectId || lisboaStations.length + 1}-${slug}`;
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const addressFull = [morada, cp ? `${cp} ${localidade}` : localidade].filter(Boolean).join(' - ');

    lisboaStations.push({
      id,
      type: 'psp',
      name: cleanName,
      address: addressFull,
      city: concelho,
      district: 'Lisboa',
      phone,
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lon.toFixed(6)),
      hoursDescription: 'Atendimento Permanente 24h | Comando Metropolitano de Lisboa (PSP)',
    });
  }

  console.log(`Collected ${lisboaStations.length} official PSP units in Lisboa!`);
  return lisboaStations;
}

async function run() {
  // 1. Scrape all 16 concelhos of Lisboa on farmaciaperto.pt
  const allPharmacies = [];
  const concelhoCounts = {};
  for (const concelho of CONCELHOS_LISBOA) {
    const list = await fetchConcelhoPharmacies(concelho);
    allPharmacies.push(...list);
    concelhoCounts[concelho.name] = list.length;
  }

  console.log('Pharmacy counts by Concelho in Lisboa:', concelhoCounts);
  console.log(`Total Lisboa pharmacies collected: ${allPharmacies.length}`);

  const pharmOutput = `import { SafePlace } from '../types';\n\nexport const FARMACIAS_DISTRITO_LISBOA: SafePlace[] = ${JSON.stringify(allPharmacies, null, 2)};\n`;
  const pharmPath = path.resolve(__dirname, '../src/data/farmaciasDistritoLisboa.ts');
  fs.writeFileSync(pharmPath, pharmOutput, 'utf-8');
  console.log(`Saved ${allPharmacies.length} pharmacies to ${pharmPath}`);

  // 2. Scrape all PSP Lisboa units
  const pspStations = await fetchPspLisboaStations();
  const pspOutput = `import { SafePlace } from '../types';\n\nexport const PSP_DISTRITO_LISBOA: SafePlace[] = ${JSON.stringify(pspStations, null, 2)};\n`;
  const pspPath = path.resolve(__dirname, '../src/data/pspDistritoLisboa.ts');
  fs.writeFileSync(pspPath, pspOutput, 'utf-8');
  console.log(`Saved ${pspStations.length} PSP stations to ${pspPath}`);
}

run();
