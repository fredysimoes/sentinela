const fs = require('fs');
const path = require('path');

const CONCELHOS = [
  { slug: 'porto', name: 'Porto' },
  { slug: 'vila-nova-de-gaia', name: 'Vila Nova de Gaia' },
  { slug: 'matosinhos', name: 'Matosinhos' },
  { slug: 'maia', name: 'Maia' },
  { slug: 'gondomar', name: 'Gondomar' },
  { slug: 'valongo', name: 'Valongo' },
  { slug: 'vila-do-conde', name: 'Vila do Conde' },
  { slug: 'povoa-de-varzim', name: 'Póvoa de Varzim' },
  { slug: 'santo-tirso', name: 'Santo Tirso' },
  { slug: 'trofa', name: 'Trofa' },
  { slug: 'paredes', name: 'Paredes' },
  { slug: 'penafiel', name: 'Penafiel' },
  { slug: 'amarante', name: 'Amarante' },
  { slug: 'felgueiras', name: 'Felgueiras' },
  { slug: 'pacos-de-ferreira', name: 'Paços de Ferreira' },
  { slug: 'lousada', name: 'Lousada' },
  { slug: 'marco-de-canaveses', name: 'Marco de Canaveses' },
  { slug: 'baiao', name: 'Baião' },
];

const KNOWN_24H_PHARMACIES = [
  'internacional',
  'sao joao',
  'são joão',
  'hospital sao joao',
  'hospital de são joão',
  'central',
  'monte dos burgos',
  'avenida',
  'boavista',
  'carvalhido',
  'arrabida',
  'arrábida',
  'gaia shopping',
  'mar shopping',
  'norte shopping',
  'aeroporto',
];

async function fetchConcelhoPharmacies(concelho) {
  const url = `https://farmaciaperto.pt/porto/${concelho.slug}/`;
  console.log(`Fetching concelho: ${concelho.name}...`);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'SentinelaApp/1.0' } });
    if (!res.ok) {
      console.warn(`Failed to fetch ${url}: ${res.status}`);
      return [];
    }
    const html = await res.text();
    const regex = new RegExp(`href="(/porto/${concelho.slug}/[^"]+\\.html)"`, 'g');
    const matches = [...html.matchAll(regex)].map((m) => m[1]);
    const uniqueLinks = [...new Set(matches)];
    console.log(`  Found ${uniqueLinks.length} pharmacies in ${concelho.name}`);

    // Fetch individual pharmacy details in chunks of 15
    const CHUNK_SIZE = 15;
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

            const rawName = data.name || '';
            const fullName = rawName.toLowerCase().startsWith('farmácia') || rawName.toLowerCase().startsWith('farmacia')
              ? rawName
              : `Farmácia ${rawName}`;

            const alvara = data.identifier?.value || link.replace(/.*-(\d+)\.html/, '$1');
            const street = data.address?.streetAddress || '';
            const parish = data.address?.addressLocality || '';
            const addressFull = street ? `${street}${parish ? ' (' + parish + ')' : ''}` : parish || concelho.name;

            const nameLower = fullName.toLowerCase();
            const is24h = KNOWN_24H_PHARMACIES.some((k) => nameLower.includes(k));

            return {
              id: `farm-porto-${alvara}`,
              type: 'pharmacy',
              name: fullName,
              address: addressFull,
              city: `${concelho.name}${parish ? ' - ' + parish : ''}`,
              district: 'Porto',
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
                ? 'Aberto 24h todos os dias sem interrupção'
                : 'Seg-Sex: 08:30-20:00 | Sáb: 09:00-13:00 | Dom: Fechado',
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

async function run() {
  const allPharmacies = [];
  const concelhoStats = {};

  for (const concelho of CONCELHOS) {
    const pharmacies = await fetchConcelhoPharmacies(concelho);
    allPharmacies.push(...pharmacies);
    concelhoStats[concelho.name] = pharmacies.length;
  }

  console.log('Finished scraping all concelhos!');
  console.log('Concelho counts:', concelhoStats);
  console.log(`Total pharmacies collected: ${allPharmacies.length}`);

  const outputContent = `import { SafePlace } from '../types';

export const FARMACIAS_DISTRITO_PORTO: SafePlace[] = ${JSON.stringify(allPharmacies, null, 2)};
`;

  const outputPath = path.resolve(__dirname, '../src/data/farmaciasDistritoPorto.ts');
  fs.writeFileSync(outputPath, outputContent, 'utf-8');
  console.log(`Saved ${allPharmacies.length} pharmacies to ${outputPath}`);
}

run();
