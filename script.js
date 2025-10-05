// Initialize the map
const map = L.map('map').setView([0, 0], 2); // Creates a Leaflet map with initial coordinates [0,0] and zoom 2 (global view)
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { // Adds a tile layer from OpenStreetMap
  maxZoom: 10, // Maximum zoom level
  attribution: '© OpenStreetMap' // Map data attribution
}).addTo(map); // Adds the tile layer to the map

// Get interface elements
const latInput = document.getElementById('latInput'); // Latitude input field
const lonInput = document.getElementById('lonInput'); // Longitude input field
const locationNameInput = document.getElementById('locationName'); // Location name input field
const addBtn = document.getElementById('addBtn'); // Button to add a location
const apiStatus = document.getElementById('apiStatus'); // Element to display API status
const exportBtn = document.getElementById('exportBtn'); // Button to export data
let allLocations = JSON.parse(localStorage.getItem('ndviLocations')) || []; // Load saved locations from localStorage or initialize empty array
let currentData = { dates: [], points: [] }; // Object to store current data (dates and points)

// Global handler for deleting locations (event delegation)
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('delete-btn')) { // Checks if delete button was clicked
    const index = parseInt(e.target.dataset.index); // Gets the location index from data attribute
    allLocations.splice(index, 1); // Removes the location from array
    localStorage.setItem('ndviLocations', JSON.stringify(allLocations)); // Updates localStorage
    updateMapAndChart(); // Updates map and chart
    apiStatus.textContent = 'Location removed!'; // Removal message
    apiStatus.style.color = '#4caf50'; // Green color for success
  }
});

// Determine marker color for NDVI
function getMarkerColor(ndvi) { // Determines marker color based on NDVI value
  if (ndvi < 0.3) return 'red'; // Red for low NDVI (<0.3)
  if (ndvi < 0.6) return 'yellow'; // Yellow for medium NDVI (0.3–0.6)
  return 'green'; // Green for high NDVI (≥0.6)
}

// Generate demo NDVI data (in case of API error)
function generateDemoNdvi(lat) { // Generates demo NDVI based on latitude
  const base = Math.min(1, Math.max(0.1, 0.8 - (Math.abs(lat - 45) / 30))); // Base NDVI depending on distance from 45°
  const seasonal = [0.2, 0.25, 0.4, 0.6, 0.8, 0.85, 0.8, 0.7, 0.5, 0.3]; // Seasonal NDVI for 10 months
  return seasonal.map(v => Math.min(1, Math.max(0, v * base * (lat > 0 ? 1 : 0.9)))); // Normalize NDVI for N/S hemisphere
}

// Fetch NDVI from NASA POWER API
async function fetchNdvi(lat, lon) { // Async function to fetch NDVI data from API
  try {
    const response = await fetch(`fetch_ndvi.php?lat=${lat}&lon=${lon}&start=20240101&end=20241004`); // API request
    const data = await response.json(); // Parse JSON
    
    if (!data.properties || !data.properties.parameter || !data.properties.parameter.NDVI) { // Check for NDVI data
      throw new Error('No NDVI data'); // Throw error if missing
    }

    const ndviDaily = Object.values(data.properties.parameter.NDVI); // Daily NDVI values
    const validNdvi = ndviDaily.filter(v => v !== null && v !== -9999 && !isNaN(v)); // Filter invalid values
    if (validNdvi.length === 0) { // Check for valid data
      throw new Error('All NDVI values invalid'); // Throw error if none valid
    }

    // Monthly averages (10 months: Jan–Oct 2024)
    const ndviMonthly = [];
    const daysPerMonth = Math.floor(validNdvi.length / 10); // Approx. 27-30 days per month
    for (let i = 0; i < 10; i++) {
      const slice = validNdvi.slice(i * daysPerMonth, (i + 1) * daysPerMonth);
      const avg = slice.length > 0 ? slice.reduce((a, b) => a + b, 0) / slice.length : 0;
      ndviMonthly.push(Math.min(1, Math.max(0, avg))); // Normalize 0..1
    }
    return ndviMonthly;
  } catch (error) {
    console.error('API Error:', error); // Log error
    apiStatus.textContent = 'API error: Using demo NDVI data'; // Display error message
    apiStatus.style.color = '#ff0000'; // Red color
    return generateDemoNdvi(lat); // Return demo data
  }
}

function updateMapAndChart() { // Update map and chart
  currentData.points = allLocations; // Update current points

  map.eachLayer(layer => {
    if (layer instanceof L.CircleMarker) map.removeLayer(layer); // Remove previous markers
  });

  currentData.points.forEach((point, index) => { // Add markers
    const latestNdvi = point.ndvi[point.ndvi.length - 1]; // Latest NDVI
    L.circleMarker([point.lat, point.lon], {
      radius: 6,
      fillColor: getMarkerColor(latestNdvi),
      color: '#333',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.7
    })
    .addTo(map)
    .bindPopup(` 
      <b>${point.name}</b><br>
      NDVI: ${latestNdvi.toFixed(2)}<br>
      <em>Bloom peak: ${latestNdvi > 0.6 ? 'Summer (NDVI >0.6)' : 'Spring'}</em><br>
      <button class="delete-btn" data-index="${index}">Delete</button>
    `)
    .on('click', () => showChart(point.ndvi, currentData.dates, point.name));
  });

  if (currentData.points.length > 0) {
    map.setView([currentData.points[currentData.points.length - 1].lat, currentData.points[currentData.points.length - 1].lon], 5);
    showChart(currentData.points[0].ndvi, currentData.dates, currentData.points[0].name);
  } else {
    map.setView([0, 0], 2);
    if (window.ndviChartInstance) window.ndviChartInstance.destroy();
  }
}

addBtn.addEventListener('click', async () => { // Click handler for "Add location"
  const lat = parseFloat(latInput.value);
  const lon = parseFloat(lonInput.value);
  let name = locationNameInput.value || 'New location';

  // Validate coordinates
  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    apiStatus.textContent = 'Error: Enter valid coordinates (lat: -90..90, lon: -180..180)';
    apiStatus.style.color = '#ff0000';
    return;
  }

  // Replace "Russia" mentions
  if (name.match(/russia|Russia|Росія|росія/i)) {
    name = 'russia';
  }

  const ndvi = await fetchNdvi(lat, lon);
  const dates = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
  const newPoint = { name, lat, lon, ndvi };
  allLocations.push(newPoint);
  localStorage.setItem('ndviLocations', JSON.stringify(allLocations));
  currentData.dates = dates;
  updateMapAndChart();
  latInput.value = ''; lonInput.value = ''; locationNameInput.value = '';
  apiStatus.textContent = 'Location added!';
  apiStatus.style.color = '#4caf50';
});

function showChart(ndviValues, dates, locationName) { // Display NDVI chart
  const ctx = document.getElementById("ndviChart").getContext("2d");
  if (window.ndviChartInstance) {
    window.ndviChartInstance.destroy();
  }
  
  window.ndviChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: dates,
      datasets: [{
        label: `NDVI (${locationName})`,
        data: ndviValues,
        borderColor: "#333",
        backgroundColor: "rgba(51, 51, 51, 0.1)",
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { min: 0, max: 1, title: { display: true, text: 'NDVI' } },
        x: { title: { display: true, text: 'Date' } }
      },
      plugins: { legend: { display: false }, tooltip: { enabled: true } }
    }
  });
}

function exportToCSV() { // Export data to CSV
  if (currentData.points.length === 0) return alert('Add locations');
  let csv = 'Location,Lat,Lon,Date,NDVI\n';
  currentData.points.forEach(point => {
    point.ndvi.forEach((value, index) => {
      csv += `"${point.name}",${point.lat},${point.lon},"${currentData.dates[index]}",${value.toFixed(4)}\n`;
    });
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'nasa_ndvi.csv';
  a.click();
  window.URL.revokeObjectURL(url);
}

// Initial load
updateMapAndChart(); // Update map and chart on page load

// Export button handler
exportBtn.addEventListener('click', exportToCSV);
