<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

$raw = file_get_contents('php://input') ?: '';
$data = json_decode($raw, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'bad_json'], JSON_UNESCAPED_UNICODE);
    exit;
}

$fields = is_array($data['fields'] ?? null) ? $data['fields'] : [];

$name = trim((string)($fields['name'] ?? ''));
$phone = trim((string)($fields['phone'] ?? ''));
$message = trim((string)($fields['message'] ?? ''));
$page = trim((string)($data['page'] ?? ''));
$title = trim((string)($data['title'] ?? ''));

if ($phone === '') {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'phone_required'], JSON_UNESCAPED_UNICODE);
    exit;
}

$to = 'dsgakpp-msk@yandex.ru';
$subject = 'transmission-remont: новая заявка';

$body = "Новая заявка с сайта transmission-remont\n\n";
$body .= "Имя: " . ($name !== '' ? $name : 'не указано') . "\n";
$body .= "Телефон: " . $phone . "\n";
$body .= "Сообщение: " . ($message !== '' ? $message : '-') . "\n\n";
$body .= "Страница: " . ($title !== '' ? $title : '-') . "\n";
$body .= "URL: " . ($page !== '' ? $page : '-') . "\n";
$body .= "Дата: " . date('Y-m-d H:i:s') . "\n";

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'From: transmission-remont <no-reply@' . ($_SERVER['HTTP_HOST'] ?? 'transmission-mos.ru') . '>',
    'Reply-To: ' . $to,
];

$sent = function_exists('mail') && mail($to, $subject, $body, implode("\r\n", $headers));

if (!$sent) {
    http_response_code(502);
    echo json_encode([
        'ok' => false,
        'error' => 'mail_failed',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
