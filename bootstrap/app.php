<?php

use App\Http\Middleware\EnsureEnrolledInCourse;
use App\Http\Middleware\GuestMiddleware;
use App\Http\Middleware\AssertChatMembership;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\JwtAuthMiddleware;
use App\Http\Middleware\RememberMeMiddleware;
use App\Http\Middleware\RoleMiddleware;
use App\Http\Middleware\RequestIdMiddleware;
use App\Http\Middleware\TrustProxies;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->use([TrustProxies::class, RequestIdMiddleware::class]);

        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            RememberMeMiddleware::class,
        ]);

        $middleware->validateCsrfTokens(except: [
            'student/ai-chat',
            'student/ai-chat/*',
            'student/ai-chat/*/*',
            'student/ai-chat/*/*/*',
            'student/ai-chat/*/*/*/*',
            'lecturer/courses/*/attendance/*',
            'lecturer/courses/*/attendance/*/*',
        ]);

        $middleware->alias([
            'assert.chat.membership' => AssertChatMembership::class,
            'assert.enrolled' => EnsureEnrolledInCourse::class,
            'auth.jwt' => JwtAuthMiddleware::class,
            'role' => RoleMiddleware::class,
            'guest' => GuestMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
