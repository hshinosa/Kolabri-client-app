<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
    /**
     * API Base URL for Express Backend
     */
    protected function apiUrl(): string
    {
        return config('services.api.base_url', 'http://localhost:3000');
    }

    /**
     * Show Login Page
     */
    public function showLogin(): Response
    {
        return Inertia::render('auth/login');
    }

    /**
     * Handle Login Request
     * Laravel acts as BFF - proxies to Express API, stores JWT in session
     */
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|min:6',
        ]);

        try {
            $response = Http::post($this->apiUrl() . '/api/auth/login', [
                'email' => $validated['email'],
                'password' => $validated['password'],
            ]);

            if ($response->successful()) {
                $data = $response->json('data');

                // Store JWT in HTTP-only session (secure)
                session([
                    'jwt' => $data['token'],
                    'user' => $data['user'],
                ]);

                // Redirect based on role
                $redirectRoute = $data['user']['role'] === 'lecturer' 
                    ? 'lecturer.courses.index' 
                    : 'student.courses.index';

                return redirect()->route($redirectRoute)->with('success', 'Welcome back!');
            }

            return back()->withErrors([
                'email' => $response->json('message', 'Invalid credentials'),
            ]);
        } catch (\Exception $e) {
            Log::error('Login failed', ['error' => $e->getMessage()]);
            
            return back()->withErrors([
                'email' => 'Unable to connect to authentication service',
            ]);
        }
    }

    /**
     * Show Register Page
     */
    public function showRegister(): Response
    {
        return Inertia::render('auth/register');
    }

    /**
     * Handle Register Request
     */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|min:2|max:255',
            'email' => 'required|email|max:255',
            'password' => 'required|min:8|confirmed',
            'role' => 'required|in:lecturer,student',
        ]);

        try {
            $response = Http::post($this->apiUrl() . '/api/auth/register', [
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $validated['password'],
                'role' => $validated['role'],
            ]);

            if ($response->successful()) {
                $data = $response->json('data');

                // Store JWT in session
                session([
                    'jwt' => $data['token'],
                    'user' => $data['user'],
                ]);

                // Redirect based on role
                $redirectRoute = $data['user']['role'] === 'lecturer' 
                    ? 'lecturer.courses.index' 
                    : 'student.courses.index';

                return redirect()->route($redirectRoute)->with('success', 'Account created successfully!');
            }

            // Handle validation errors from API
            if ($response->status() === 422 || $response->status() === 400 || $response->status() === 409) {
                $errorBody = $response->json('error');
                if (isset($errorBody['details'])) {
                    return back()->withErrors($errorBody['details']);
                }
                return back()->withErrors([
                    'email' => $errorBody['message'] ?? 'Registration failed',
                ]);
            }

            return back()->withErrors([
                'email' => 'An unexpected error occurred during registration',
            ]);
        } catch (\Exception $e) {
            Log::error('Registration failed', ['error' => $e->getMessage()]);
            
            return back()->withErrors([
                'email' => 'Unable to connect to authentication service',
            ]);
        }
    }

    /**
     * Handle Logout
     */
    public function logout(Request $request)
    {
        // Clear session
        session()->forget(['jwt', 'user']);
        session()->invalidate();
        session()->regenerateToken();

        return redirect()->route('auth.login.index')->with('success', 'Logged out successfully');
    }
}
