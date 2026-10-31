<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines which origins are allowed to make requests
    | into your application.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie', 'profile/*'],

    'allowed_methods' => ['*'],

    // Add your deployed frontend and common local dev origins below
    'allowed_origins' => [
        'https://sweet-bite-bakery-system.vercel.app',
        // Optional extra frontend address (e.g. a custom domain), set FRONTEND_URL on Render
        ...array_filter([env('FRONTEND_URL')]),
        'http://localhost',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:8000',
    ],

    // Vercel preview deployments, e.g. sweet-bite-bakery-system-git-<branch>-jellas-projects.vercel.app
    'allowed_origins_patterns' => [
        '#^https://sweet-bite-bakery-system-[a-z0-9-]+-jellas-projects\.vercel\.app$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,
];
