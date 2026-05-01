<?php

use App\Http\Controllers\AiChatController;
use App\Http\Controllers\AISettingsController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CourseController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\GoalController;
use App\Http\Controllers\GroupController;
use App\Http\Controllers\MasterDataController;
use App\Http\Controllers\ReflectionController;
use App\Http\Controllers\UserManagementController;
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

Route::get('/csrf-token', function () {
    return response()->json(['token' => csrf_token()]);
})->name('csrf.token');

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
    Route::post('/logout', [AuthController::class, 'logout'])->name('auth.logout');
    Route::get('/api/auth/token', [AuthController::class, 'getToken'])->name('auth.token');

    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    /*
    |--------------------------------------------------------------------------
    | Admin Routes
    |--------------------------------------------------------------------------
    */
    Route::middleware('role:admin')->prefix('admin')->name('admin.')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'admin'])->name('dashboard');
        Route::get('/audit-log', [AuditLogController::class, 'index'])->name('audit-log.page');
        Route::get('/audit-logs', [AuditLogController::class, 'index'])->name('audit-log.index');
        Route::get('/audit-logs/entity/{entityType}/{entityId}', [AuditLogController::class, 'entityHistory'])->name('audit-log.entity');

        Route::prefix('users')->name('users.')->group(function () {
            Route::get('/', [UserManagementController::class, 'index'])->name('index');
            Route::post('/bulk-delete', [UserManagementController::class, 'bulkDelete'])->name('bulk-delete');
            Route::post('/bulk-role-change', [UserManagementController::class, 'bulkRoleChange'])->name('bulk-role-change');
            Route::post('/bulk-import', [UserManagementController::class, 'bulkImport'])->name('bulk-import');
            Route::get('/{id}', [UserManagementController::class, 'show'])->name('show');
            Route::post('/', [UserManagementController::class, 'store'])->name('store');
            Route::put('/{id}', [UserManagementController::class, 'update'])->name('update');
            Route::delete('/{id}', [UserManagementController::class, 'destroy'])->name('destroy');
            Route::post('/{id}/reset-password', [UserManagementController::class, 'resetPassword'])->name('reset-password');
        });

        Route::prefix('master-data')->name('master-data.')->group(function () {
            Route::get('/', [MasterDataController::class, 'index'])->name('index');
            Route::get('/archived', [MasterDataController::class, 'index'])->name('archived');
            Route::post('/bulk-activate', [MasterDataController::class, 'bulkActivate'])->name('bulk-activate');
            Route::post('/bulk-deactivate', [MasterDataController::class, 'bulkDeactivate'])->name('bulk-deactivate');
            Route::post('/bulk-import', [MasterDataController::class, 'bulkImport'])->name('bulk-import');
            Route::get('/{id}', [MasterDataController::class, 'show'])->name('show');
            Route::post('/', [MasterDataController::class, 'store'])->name('store');
            Route::post('/{id}/clone', [MasterDataController::class, 'clone'])->name('clone');
            Route::post('/from-template/{templateId}', [MasterDataController::class, 'createFromTemplate'])->name('from-template');
            Route::post('/{id}/archive', [MasterDataController::class, 'archive'])->name('archive');
            Route::post('/{id}/restore', [MasterDataController::class, 'restore'])->name('restore');
            Route::delete('/{id}/permanent', [MasterDataController::class, 'permanentDelete'])->name('permanent');
            Route::put('/{id}', [MasterDataController::class, 'update'])->name('update');
            Route::delete('/{id}', [MasterDataController::class, 'destroy'])->name('destroy');
        });

        Route::prefix('course-templates')->name('course-templates.')->group(function () {
            Route::get('/', [MasterDataController::class, 'templatesPage'])->name('page');
            Route::post('/', [MasterDataController::class, 'storeTemplate'])->name('store');
            Route::get('/list', [MasterDataController::class, 'listTemplates'])->name('index');
            Route::get('/{id}', [MasterDataController::class, 'showTemplate'])->name('show');
            Route::delete('/{id}', [MasterDataController::class, 'destroyTemplate'])->name('destroy');
        });

        Route::get('/templates', [MasterDataController::class, 'templatesPage'])->name('templates');

        Route::prefix('ai-settings')->name('ai-settings.')->group(function () {
            Route::get('/', [AISettingsController::class, 'index'])->name('index');
            Route::get('/{id}', [AISettingsController::class, 'show'])->name('show');
            Route::post('/', [AISettingsController::class, 'store'])->name('store');
            Route::put('/{id}', [AISettingsController::class, 'update'])->name('update');
            Route::delete('/{id}', [AISettingsController::class, 'destroy'])->name('destroy');
            Route::post('/{id}/test', [AISettingsController::class, 'test'])->name('test');
            Route::post('/{id}/activate', [AISettingsController::class, 'activate'])->name('activate');
            Route::put('/fallback-order', [AISettingsController::class, 'updateFallbackOrder'])->name('fallback-order');
        });

        Route::get('/usage-stats', [AISettingsController::class, 'usageStats'])->name('usage-stats');
        Route::get('/usage-report/{userId}/{month}/{year}', [AISettingsController::class, 'usageReport'])->name('usage-report');
        Route::get('/ai-comparison', [AISettingsController::class, 'comparisonPage'])->name('ai-comparison.index');
        Route::post('/ai-compare', [AISettingsController::class, 'compare'])->name('ai-compare');
    });

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
        Route::get('/ai-chat/{chat}/messages', [AiChatController::class, 'messages'])->name('ai-chat.messages.index');
        Route::patch('/ai-chat/{chat}', [AiChatController::class, 'update'])->name('ai-chat.update');
        Route::delete('/ai-chat/{chat}', [AiChatController::class, 'destroy'])->name('ai-chat.destroy');
        Route::post('/ai-chat/{chat}/messages', [AiChatController::class, 'sendMessage'])->name('ai-chat.messages.store');
        Route::post('/ai-chat/{chat}/messages/stream', [AiChatController::class, 'streamMessage'])->name('ai-chat.messages.stream');
    });
});
