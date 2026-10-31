<?php

// Sweet Bite settings. Change these in the server's environment variables (e.g. on Render),
// no code change needed.
return [
    // Share of the order total the customer pays upfront to confirm a pre-order
    'deposit_percent' => (int) env('BAKERY_DEPOSIT_PERCENT', 50),

    // GCash account customers send the deposit to
    'gcash_name' => env('BAKERY_GCASH_NAME', 'Sweet Bite Bakery'),
    'gcash_number' => env('BAKERY_GCASH_NUMBER', '0917 000 0000'),

    // Pickup and delivery times are the bakery's local time. The frontend sends them
    // without a timezone (e.g. "2026-11-05 13:30:00"), so they're read as this zone.
    'timezone' => env('BAKERY_TIMEZONE', 'Asia/Manila'),

    // Hours customers can schedule a pickup or delivery (24-hour clock, inclusive)
    'open_hour' => (int) env('BAKERY_OPEN_HOUR', 8),
    'close_hour' => (int) env('BAKERY_CLOSE_HOUR', 18),

    // Admin account created or updated on every deploy (see DatabaseSeeder).
    // On Render set ADMIN_USERNAME and ADMIN_PASSWORD; ADMIN_EMAIL is optional.
    'admin_username' => env('ADMIN_USERNAME'),
    'admin_email' => env('ADMIN_EMAIL'),
    'admin_password' => env('ADMIN_PASSWORD'),

    // Most of one item a single order can ask for
    'max_quantity' => (int) env('BAKERY_MAX_QUANTITY', 100),
];
