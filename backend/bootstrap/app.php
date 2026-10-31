<?php

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            // Slow down password guessing and sign-up spam: 10 tries per minute per IP + email
            RateLimiter::for('auth', function (Request $request) {
                return Limit::perMinute(10)->by(strtolower((string) $request->input('email')).'|'.$request->ip());
            });

            // Receipt uploads: generous for real customers, blocks scripted flooding
            RateLimiter::for('uploads', function (Request $request) {
                return Limit::perMinute(20)->by($request->user()?->id ?: $request->ip());
            });
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'auth' => \App\Http\Middleware\Authenticate::class,
            'admin' => \App\Http\Middleware\AdminMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // The API never answers with an HTML error page or a redirect to a login page:
        // every error under /api is JSON with a "message" (and "errors" for validation).
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson()
        );
    })->create();
