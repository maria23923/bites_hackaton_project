<?php
// Get latitude and longitude from GET parameters
$lat = isset($_GET['lat']) ? floatval($_GET['lat']) : 0; // Get latitude from GET parameter 'lat', convert to number, default 0
$lon = isset($_GET['lon']) ? floatval($_GET['lon']) : 0; // Get longitude from GET parameter 'lon', convert to number, default 0
$startDate = isset($_GET['start']) ? $_GET['start'] : '20240101'; // Get start date from GET parameter 'start', default '20240101'
$endDate = isset($_GET['end']) ? $_GET['end'] : '20241004'; // Get end date from GET parameter 'end', default '20241004'

// Validate coordinates
if ($lat < -90 || $lat > 90 || $lon < -180 || $lon > 180) { // Check if coordinates are within valid range
    http_response_code(400); // Set HTTP response code 400 (Bad Request)
    header('Content-Type: application/json'); // Set response header as JSON
    echo json_encode(['error' => 'Invalid coordinates']); // Return JSON with error message
    exit; // Stop script execution
}

// NASA POWER API URL
$url = "https://power.larc.nasa.gov/api/temporal/daily/point?parameters=NDVI&community=AG&latitude={$lat}&longitude={$lon}&start={$startDate}&end={$endDate}&format=JSON"; 
// Construct URL for NASA POWER API request with NDVI parameter, coordinates, dates, and JSON format

// Execute request via cURL
$ch = curl_init(); // Initialize cURL session
curl_setopt($ch, CURLOPT_URL, $url); // Set URL for request
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); // Configure cURL to return response as a string
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true); // Allow following redirects
curl_setopt($ch, CURLOPT_TIMEOUT, 10); // Set request timeout to 10 seconds
$response = curl_exec($ch); // Execute request and store response
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE); // Get HTTP response code
curl_close($ch); // Close cURL session

// Check response
if ($response === false || $httpCode !== 200) { // Check if request failed or HTTP code is not 200 (OK)
    http_response_code($httpCode ?: 500); // Set HTTP error code (or 500 if code not defined)
    header('Content-Type: application/json'); // Set response header as JSON
    echo json_encode(['error' => 'Failed to fetch data from NASA POWER API']); // Return JSON with error message
    exit; // Stop script execution
}

// Set JSON header
header('Content-Type: application/json'); // Set response header as JSON
echo $response; // Return response from NASA POWER API
?>
