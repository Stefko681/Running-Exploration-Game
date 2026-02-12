
const https = require('https');

// Mock stitchWaysToPolygons for now or copy it
function stitchWaysToPolygons(ways) {
    if (ways.length === 0) return [];
    // Simplified stitch for testing - just return them as is to see if we get data
    return ways;
}

const OVERPASS_API_URL = "https://overpass-api.de/api/interpreter";

async function fetchDistricts(lat, lng) {
    const radius = 6000;
    const query = `
        [out:json][timeout:25];
        (
          relation["admin_level"="9"]["boundary"="administrative"](around:${radius},${lat},${lng});
          relation["place"="suburb"](around:${radius},${lat},${lng});
          relation["place"="quarter"](around:${radius},${lat},${lng});
          relation["place"="neighbourhood"](around:${radius},${lat},${lng});
        );
        out body;
        >;
        out skel qt;
    `;

    console.log(`Querying radius ${radius} around ${lat}, ${lng}`);

    return new Promise((resolve, reject) => {
        const req = https.request(OVERPASS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write("data=" + encodeURIComponent(query));
        req.end();
    });
}

async function run() {
    try {
        // Sofia coordinates
        const data = await fetchDistricts(42.6977, 23.3219);
        console.log(`Received ${data.elements ? data.elements.length : 0} elements.`);

        const relations = data.elements.filter(e => e.type === 'relation');
        console.log(`Found ${relations.length} relations.`);

        relations.forEach(r => {
            console.log(`- ${r.tags.name} (${r.tags.place || r.tags.admin_level}) - Members: ${r.members.length}`);
        });

    } catch (e) {
        console.error("Error:", e);
    }
}

run();
