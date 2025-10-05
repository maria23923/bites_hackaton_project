// Get elements
const locationSelector = document.getElementById('locationSelector');
const fetchBtn = document.getElementById('fetchPlantsBtn');
const apiStatus = document.getElementById('apiStatus');
const plantsDataDiv = document.getElementById('plantsData');
const regionTitle = document.getElementById('regionTitle');
const plantsList = document.getElementById('plantsList');

// Static data about plants by region
const regionsPlants = {
  'Americas': [
    'Bee balm (Monarda fistulosa)',
    'White prairie clover (Dalea candida)',
    'Cardinal flower (Lobelia cardinalis)',
    'Salvia leucantha',
    'Lantana',
    'Ice Plant (Delosperma spp.)',
    'Primrose (Primula vulgaris)'
  ],
  'Europe/Africa': [
    'Bluebell',
    'Bugle',
    'Crab apple',
    'Crocus',
    'Flowering cherry',
    'Forget-me-not',
    'Hawthorn',
    'Primrose',
    'Lavender',
    'Hollyhock',
    'Cosmos',
    'Hellebore',
    'Aloe arborescens',
    'Buddleja davidii',
    'Plumbago auriculata',
    'Tecomaria capensis'
  ],
  'Asia/Australia': [
    'Chaenomeles speciosa',
    'Angelica pubescens',
    'Chinese abelia',
    'Bat-faced cuphea',
    'Chaste tree (Vitex agnus-castus)',
    'Salvia',
    'Grevillea',
    'Paper daisies (Xerochrysum)',
    'Eucalyptus',
    'Banksia',
    'Bottlebrush (Callistemon)',
    'Wattle (Acacia)',
    'Waratah (Telopea)'
  ]
};

// Function for geocoding (get lat/lon from location name)
async function geocode(location) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`);
    const data = await response.json();
    if (data.length === 0) {
      throw new Error('Location not found');
    }
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch (error) {
    console.error('Geocoding error:', error);
    apiStatus.textContent = 'Error: Could not find the location.';
    apiStatus.style.color = '#ff0000';
    return null;
  }
}

// Determine region by meridian (lon)
function getRegionByMeridian(lon) {
  if (lon >= -180 && lon < -60) {
    return 'Americas';
  } else if (lon >= -60 && lon < 60) {
    return 'Europe/Africa';
  } else {
    return 'Asia/Australia';
  }
}

// Display list of plants
function showPlants(region, plants, location) {
  regionTitle.textContent = `Dominant pollination plants in ${region} (location: ${location})`;
  plantsList.innerHTML = '';
  plants.forEach(plant => {
    const li = document.createElement('li');
    li.textContent = plant;
    plantsList.appendChild(li);
  });
  plantsDataDiv.style.display = 'block';
}

// Button handler
fetchBtn.addEventListener('click', async () => {
  const location = locationSelector.value;

  if (!location) {
    apiStatus.textContent = 'Select a location from the list';
    apiStatus.style.color = '#ff0000';
    return;
  }

  apiStatus.textContent = 'Loading...';
  apiStatus.style.color = '#333';

  const coords = await geocode(location);
  if (!coords) return;

  const region = getRegionByMeridian(coords.lon);
  const plants = regionsPlants[region] || ['Data not available for this region'];

  showPlants(region, plants, location);

  apiStatus.textContent = 'Data loaded!';
  apiStatus.style.color = '#4caf50';
});
