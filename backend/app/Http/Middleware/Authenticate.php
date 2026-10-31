<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    /**
     * This is an API-only backend (the website is a separate React app), so there is no
     * login page to redirect to. Returning null makes a missing or expired token a
     * 401 JSON response instead of a crash looking for a "login" route.
     */
    protected function redirectTo(Request $request): ?string
    {
        return null;
    }
}
