<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     * Checks if user has required role.
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = session('user');

        // Mendukung beberapa peran: middleware('role:lecturer,admin')
        if (!$user || !in_array($user['role'], $roles, true)) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Forbidden'], 403);
            }

            // Redirect to appropriate dashboard based on actual role
            if ($user && $user['role'] === 'admin') {
                return redirect()->route('admin.dashboard');
            }

            if ($user && $user['role'] === 'lecturer') {
                return redirect()->route('dashboard');
            }
            
            if ($user && $user['role'] === 'student') {
                return redirect()->route('student.courses.index');
            }

            return redirect()->route('auth.login.index');
        }

        return $next($request);
    }
}
