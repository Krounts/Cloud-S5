<?php
$credentials = json_decode(file_get_contents(__DIR__ . '/firebase-config.json'), true);
$now = time();
$jwtPayload = [
    'iss' => $credentials['client_email'],
    'sub' => $credentials['client_email'],
    'aud' => 'https://oauth2.googleapis.com/token',
    'iat' => $now,
    'exp' => $now + 3600,
    'scope' => 'https://www.googleapis.com/auth/datastore'
];

function base64UrlEncode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

$header = base64UrlEncode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
$payload = base64UrlEncode(json_encode($jwtPayload));
$signatureInput = $header . '.' . $payload;
openssl_sign($signatureInput, $signature, $credentials['private_key'], OPENSSL_ALGO_SHA256);
$jwt = $signatureInput . '.' . base64UrlEncode($signature);

$ch = curl_init('https://oauth2.googleapis.com/token');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
    'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    'assertion' => $jwt
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$tokenResponse = curl_exec($ch);
$tokenData = json_decode($tokenResponse, true);

if (!isset($tokenData['access_token'])) {
    echo "Error getting token:\n";
    echo $tokenResponse . "\n";
    exit(1);
}

$accessToken = $tokenData['access_token'];

$ch = curl_init('https://firestore.googleapis.com/v1/projects/cloud-s5-antananarivo/databases/(default)/documents/reports');
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $accessToken]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);

echo "Firestore response:\n";
echo $response . "\n";

$data = json_decode($response, true);
if (isset($data['documents'])) {
    echo "\nNumber of documents: " . count($data['documents']) . "\n";
} else {
    echo "\nNo 'documents' field in response - collection might be empty\n";
}
