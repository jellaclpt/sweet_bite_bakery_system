<?php

// Sweet Bite settings for the pre-order deposit flow.
// Change these in the server's environment variables (e.g. on Render), no code change needed.
return [
    // Share of the order total the customer pays upfront to confirm a pre-order
    'deposit_percent' => (int) env('BAKERY_DEPOSIT_PERCENT', 50),

    // GCash account customers send the deposit to
    'gcash_name' => env('BAKERY_GCASH_NAME', 'Sweet Bite Bakery'),
    'gcash_number' => env('BAKERY_GCASH_NUMBER', '0917 000 0000'),
];
