<?php

use App\Http\Controllers\AiChatController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CourseController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\GoalController;
use App\Http\Controllers\GroupController;
use App\Http\Controllers\ReflectionController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

/*
|--------------------------------------------------------------------------
| Auth Routes (Guest Only)
|--------------------------------------------------------------------------
*/

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('auth.login.index');
    Route::post('/login', [AuthController::class, 'login'])->name('auth.login.post');
    Route::get('/register', [AuthController::class, 'showRegister'])->name('auth.register.index');
    Route::post('/register', [AuthController::class, 'register'])->name('auth.register.post');
});

/*
|--------------------------------------------------------------------------
| Protected Routes (Auth Required)
|--------------------------------------------------------------------------
*/

Route::middleware('auth.jwt')->group(function () {
    // Logout
    Route::post('/logout', [AuthController::class, 'logout'])->name('auth.logout');

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    /*
    |--------------------------------------------------------------------------
    | Lecturer Routes
    |--------------------------------------------------------------------------
    */
    Route::middleware('role:lecturer')->prefix('lecturer')->name('lecturer.')->group(function () {
        // Courses
        Route::get('/courses', [CourseController::class, 'index'])->name('courses.index');
        Route::get('/courses/create', [CourseController::class, 'create'])->name('courses.create');
        Route::post('/courses', [CourseController::class, 'store'])->name('courses.store');
        Route::get('/courses/{course}', [CourseController::class, 'show'])->name('courses.show');

        // Knowledge Base Upload
        Route::post('/courses/{course}/knowledge-base', [CourseController::class, 'uploadKnowledgeBase'])
            ->name('courses.knowledge-base.store');

        // Groups
        Route::get('/courses/{course}/groups', [GroupController::class, 'index'])->name('groups.index');
        Route::post('/courses/{course}/groups', [GroupController::class, 'store'])->name('groups.store');
        Route::delete('/courses/{course}/groups/{group}', [GroupController::class, 'destroy'])->name('groups.destroy');
        Route::post('/courses/{course}/groups/{group}/members', [GroupController::class, 'addMembers'])
            ->name('groups.members.store');
        Route::post('/groups/{group}/chat-spaces', [GroupController::class, 'storeChatSpace'])->name('groups.chat-spaces.store');

        // Analytics Dashboard
        Route::get('/courses/{course}/analytics', [AnalyticsController::class, 'courseIndex'])->name('analytics.index');
        Route::get('/courses/{course}/analytics/groups/{group}', [AnalyticsController::class, 'groupShow'])->name('analytics.group');
        Route::get('/courses/{course}/analytics/export', [AnalyticsController::class, 'export'])->name('analytics.export');
        Route::get('/courses/{course}/analytics/live', [AnalyticsController::class, 'liveStats'])->name('analytics.live');
    });

    /*
    |--------------------------------------------------------------------------
    | Student Routes
    |--------------------------------------------------------------------------
    */
    Route::middleware('role:student')->prefix('student')->name('student.')->group(function () {
        // Courses
        Route::get('/courses', [CourseController::class, 'enrolled'])->name('courses.index');
        Route::post('/courses/join', [CourseController::class, 'join'])->name('courses.join');
        Route::get('/courses/{course}', [CourseController::class, 'showStudent'])->name('courses.show');

        // Groups
        Route::get('/courses/{course}/groups', [GroupController::class, 'studentIndex'])->name('groups.index');
        Route::post('/courses/{course}/groups', [GroupController::class, 'store'])->name('groups.store');
        Route::post('/groups/join', [GroupController::class, 'join'])->name('groups.join');
        Route::post('/groups/{group}/invite', [GroupController::class, 'inviteMembers'])->name('groups.invite');
        Route::post('/groups/{group}/chat-spaces', [GroupController::class, 'storeChatSpace'])->name('groups.chat-spaces.store');

        // Goals - now per chat space
        Route::get('/courses/{course}/chat-spaces/{chatSpace}/goal', [GoalController::class, 'create'])->name('goals.create');
        Route::post('/goals', [GoalController::class, 'store'])->name('goals.store');

        // Chat Spaces (list of sessions)
        Route::get('/courses/{course}/chat-spaces', [CourseController::class, 'chatSpaces'])->name('courses.chat-spaces');
        
        // Chat (specific chat space)
        Route::get('/courses/{course}/chat', [CourseController::class, 'chat'])->name('courses.chat.index');
        Route::get('/courses/{course}/chat/{chatSpace}', [CourseController::class, 'chatRoom'])->name('courses.chat.room');

        // Reflections
        Route::get('/reflections', [ReflectionController::class, 'index'])->name('reflections.index');
        Route::post('/reflections', [ReflectionController::class, 'store'])->name('reflections.store');

        // AI Chat
        Route::get('/ai-chat', [AiChatController::class, 'index'])->name('ai-chat.index');
        Route::post('/ai-chat', [AiChatController::class, 'store'])->name('ai-chat.store');
        Route::get('/ai-chat/{chat}', [AiChatController::class, 'show'])->name('ai-chat.show');
        Route::patch('/ai-chat/{chat}', [AiChatController::class, 'update'])->name('ai-chat.update');
        Route::delete('/ai-chat/{chat}', [AiChatController::class, 'destroy'])->name('ai-chat.destroy');
        Route::post('/ai-chat/{chat}/messages', [AiChatController::class, 'sendMessage'])->name('ai-chat.messages.store');
    });
});
