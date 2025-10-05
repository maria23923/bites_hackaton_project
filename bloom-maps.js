// Seasons and corresponding month indices (0: Jan, 1: Feb, ..., 9: Oct)
const seasons = {
  winter: [0, 1], // Jan-Feb
  spring: [2, 3, 4], // Mar-Apr-May
  summer: [5, 6, 7], // Jun-Jul-Aug
  autumn: [8, 9] // Sep-Oct
};

// Get elements
const locationSelector = document.getElementById('locationSelector');
const seasonSelector = document.getElementById('seasonSelector');
const fetchBtn = document.getElementById('fetchClimateBtn');
const apiStatus = document.getElementById('apiStatus');
const climateDataDiv = document.getElementById('climateData');
const scientificBtn = document.getElementById('scientificBtn');

// Handler for "Scientific Data" button
scientificBtn.addEventListener('click', () => {
  window.location.href = 'scientific-data.html';
});

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

// Fetch climate data from NASA POWER API
async function fetchClimate(lat, lon) {
  try {
    const response = await fetch(`fetch_climate.php?lat=${lat}&lon=${lon}&start=20240101&end=20241004`);
    const data = await response.json();
    
    if (!data.properties || !data.properties.parameter) {
      throw new Error('No data available');
    }

    const params = ['T2M', 'RH2M', 'PRECTOTCORR', 'WS10M'];
    const monthlyData = {};

    params.forEach(param => {
      const daily = Object.values(data.properties.parameter[param] || {});
      const validDaily = daily.filter(v => v !== null && v !== -9999 && !isNaN(v));
      if (validDaily.length === 0) return;

      monthlyData[param] = [];
      const daysPerMonth = Math.floor(validDaily.length / 10);
      for (let i = 0; i < 10; i++) {
        const slice = validDaily.slice(i * daysPerMonth, (i + 1) * daysPerMonth);
        const avg = slice.length > 0 ? slice.reduce((a, b) => a + b, 0) / slice.length : 0;
        monthlyData[param].push(avg);
      }
    });

    return monthlyData;
  } catch (error) {
    console.error('API error:', error);
    apiStatus.textContent = 'API Error: Using demo data';
    apiStatus.style.color = '#ff0000';
    return generateDemoClimate(lat);
  }
}

// Generate demo climate data
function generateDemoClimate(lat) {
  const baseTemp = 15 - Math.abs(lat) / 3;
  const seasonalTemp = [0, 2, 10, 15, 20, 25, 28, 25, 18, 10];
  const rh = [70, 65, 60, 55, 50, 55, 60, 65, 70, 75];
  const precip = [50, 40, 60, 70, 80, 90, 100, 90, 70, 60];
  const wind = [3, 4, 5, 4, 3, 3, 4, 5, 4, 3];

  return {
    T2M: seasonalTemp.map(v => v + baseTemp),
    RH2M: rh,
    PRECTOTCORR: precip,
    WS10M: wind
  };
}

// Calculate seasonal averages
function calculateSeasonAverages(monthlyData, seasonIndices) {
  const params = ['T2M', 'RH2M', 'PRECTOTCORR', 'WS10M'];
  const averages = {};

  params.forEach(param => {
    const values = seasonIndices.map(idx => monthlyData[param][idx]);
    averages[param] = values.reduce((a, b) => a + b, 0) / values.length;
  });

  return averages;
}

// Display data in a table
function showClimateData(averages, location, season) {
  const seasonNames = {
    winter: 'Winter',
    spring: 'Spring',
    summer: 'Summer',
    autumn: 'Autumn'
  };

  const paramNames = {
    T2M: 'Average Temperature (°C)',
    RH2M: 'Average Humidity (%)',
    PRECTOTCORR: 'Average Precipitation (mm/day)',
    WS10M: 'Average Wind Speed (m/s)'
  };

  let tableHtml = `<h3>Climate for ${location} in ${seasonNames[season]}</h3>
    <table id="climateTable">
      <tr><th>Parameter</th><th>Value</th></tr>`;

  Object.keys(averages).forEach(param => {
    tableHtml += `<tr><td>${paramNames[param]}</td><td>${averages[param].toFixed(2)}</td></tr>`;
  });

  tableHtml += '</table>';

  climateDataDiv.innerHTML = tableHtml;
  climateDataDiv.style.display = 'block';
}

// Button handler
fetchBtn.addEventListener('click', async () => {
  const location = locationSelector.value;
  const season = seasonSelector.value;

  if (!location) {
    apiStatus.textContent = 'Select a location from the list';
    apiStatus.style.color = '#ff0000';
    return;
  }

  apiStatus.textContent = 'Loading...';
  apiStatus.style.color = '#333';

  const coords = await geocode(location);
  if (!coords) return;

  const monthlyData = await fetchClimate(coords.lat, coords.lon);
  const seasonIndices = seasons[season];
  const averages = calculateSeasonAverages(monthlyData, seasonIndices);

  showClimateData(averages, location, season);

  apiStatus.textContent = 'Data loaded!';
  apiStatus.style.color = '#4caf50';
});
