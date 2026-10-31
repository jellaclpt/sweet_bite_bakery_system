<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    // Only lets admins through. Always used after auth:sanctum, but checks for a user anyway.
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Only admins can do this.'], 403);
        }

        return $next($request);
    }
}
