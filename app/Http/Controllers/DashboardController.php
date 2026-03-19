<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Illuminate\Http\RedirectResponse;

class DashboardController extends Controller
{
    /**
     * Main Dashboard - Redirects based on user role
     */
    public function index(Request $request): InertiaResponse|RedirectResponse
    {
        $user = session('user');

        if (!$user) {
            return redirect()->route('auth.login');
        }

        // Render role-specific dashboard
        if ($user['role'] === 'lecturer') {
            return Inertia::render('lecturer/dashboard');
        }

        return Inertia::render('student/dashboard');
    }
}
