<?php
// Get latitude and longitude from GET parameters
$lat = isset($_GET['lat']) ? floatval($_GET['lat']) : 0;
$lon = isset($_GET['lon']) ? floatval($_GET['lon']) : 0;
$startDate = isset($_GET['start']) ? $_GET['start'] : '20240101';
$endDate = isset($_GET['end']) ? $_GET['end'] : '20241004';

// Validate coordinates
if ($lat < -90 || $lat > 90 || $lon < -180 || $lon > 180) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Invalid coordinates']);
    exit;
}

// NASA POWER API URL with climate parameters
$params = 'T2M,RH2M,PRECTOTCORR,WS10M'; // Temperature, humidity, precipitation, wind
$url = "https://power.larc.nasa.gov/api/temporal/daily/point?parameters={$params}&community=AG&latitude={$lat}&longitude={$lon}&start={$startDate}&end={$endDate}&format=JSON";

// Execute request via cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Check response
if ($response === false || $httpCode !== 200) {
    http_response_code($httpCode ?: 500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Failed to fetch data from NASA POWER API']);
    exit;
}

// Set JSON header and return response
header('Content-Type: application/json');
echo $response;
?>
