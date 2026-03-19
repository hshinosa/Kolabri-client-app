<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class JwtAuthMiddleware
{
    /**
     * Handle an incoming request.
     * Checks if user has valid JWT session.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!session('jwt') || !session('user')) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }
            
            return redirect()->route('auth.login.index')->with('error', 'Please login to continue');
        }

        // Share user data with all views
        $request->merge(['auth_user' => session('user')]);

        return $next($request);
    }
}
