<?php

use App\Http\Controllers\AiChatController;
use App\Http\Controllers\AiChatSearchController;
use App\Http\Controllers\AISettingsController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\EmailVerificationController;
use App\Http\Controllers\ForgotPasswordController;
use App\Http\Controllers\GoogleAuthController;
use App\Http\Controllers\ChatUploadController;
use App\Http\Controllers\Student\MessageController;
use App\Http\Controllers\Student\MessageSearchController;
use App\Http\Controllers\Student\PinnedMessageController;
use App\Http\Controllers\CoreApiProxyController;
use App\Http\Controllers\CourseController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\GoalController;
use App\Http\Controllers\StudentCourseController;
use App\Http\Controllers\GroupController;
use App\Http\Controllers\GroupMemberController;
use App\Http\Controllers\GroupMemberManagementController;
use App\Http\Controllers\MasterDataController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ReflectionController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\Student\StudentCourseWeeksController;
use App\Http\Controllers\Student\StudentPreReadController;
use App\Http\Controllers\Student\StudentSessionMaterialsController;
use App\Http\Controllers\Student\ProfileAvatarController;
use App\Http\Controllers\Student\ProfileController;
use App\Http\Controllers\Student\ProfilePreferenceController;
use App\Http\Controllers\Student\ProfileStatsController;
use App\Http\Controllers\Student\StudentAttendanceController;
use App\Http\Controllers\Student\GlobalSearchController as StudentGlobalSearchController;
use App\Http\Controllers\UserManagementController;
use App\Http\Controllers\Lecturer\LecturerAktivitasController;
use App\Http\Controllers\Lecturer\LecturerAttendanceController;
use App\Http\Controllers\Lecturer\LecturerCourseWeeksController;
use App\Http\Controllers\Lecturer\LecturerMaterialsController;
use App\Http\Controllers\Lecturer\LecturerSessionInsightController;
use App\Http\Controllers\Lecturer\GlobalSearchController as LecturerGlobalSearchController;
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
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login')->name('auth.login.post');
    Route::get('/register', [AuthController::class, 'showRegister'])->name('auth.register.index');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:register')->name('auth.register.post');
    Route::get('/forgot-password', [ForgotPasswordController::class, 'showForgotPassword'])->name('auth.forgot-password.index');
    Route::post('/forgot-password', [ForgotPasswordController::class, 'sendResetLink'])->middleware('throttle:forgot-password')->name('auth.forgot-password.post');
    Route::get('/reset-password', [ForgotPasswordController::class, 'showResetPassword'])->name('auth.reset-password.index');
    Route::post('/reset-password', [ForgotPasswordController::class, 'resetPassword'])->name('auth.reset-password.post');
    Route::get('/auth/google', [GoogleAuthController::class, 'redirectToGoogle'])->name('auth.google.redirect');
    Route::get('/auth/google/callback', [GoogleAuthController::class, 'handleCallback'])->name('auth.google.callback');
});

Route::get('/email/verify', [EmailVerificationController::class, 'showNotice'])->name('auth.verify-email.notice');
Route::get('/email/verify/{token}', [EmailVerificationController::class, 'verify'])->name('auth.verify-email.verify');
Route::post('/email/verify/resend', [EmailVerificationController::class, 'resend'])->middleware('throttle:6,1')->name('auth.verify-email.resend');

/*
|--------------------------------------------------------------------------
| Protected Routes (Auth Required)
|--------------------------------------------------------------------------
*/

Route::middleware('auth.jwt')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('auth.logout');
    Route::get('/api/auth/token', [AuthController::class, 'getToken'])->name('auth.token');
    Route::get('/api/auth/refresh-token', [AuthController::class, 'refreshToken'])->name('auth.refresh-token');
    
    Route::get('/api/notifications', [NotificationController::class, 'index'])->name('api.notifications.index');
    Route::post('/api/notifications/{id}/read', [NotificationController::class, 'markRead'])->name('api.notifications.read');
    Route::post('/api/notifications/read-all', [NotificationController::class, 'markAllRead'])->name('api.notifications.read-all');
    
    Route::post('/api/chat/upload', [ChatUploadController::class, 'store'])
        ->middleware(['assert.chat.membership', 'throttle:30,5'])
        ->name('chat.upload');

    // Chat Message Edit/Delete
    Route::patch('/api/chat/messages/{messageId}/edit', [MessageController::class, 'edit'])
        ->middleware('assert.chat.membership')
        ->name('chat.messages.edit');
    Route::delete('/api/chat/messages/{messageId}', [MessageController::class, 'destroy'])
        ->middleware('assert.chat.membership')
        ->name('chat.messages.delete');
    Route::get('/api/chat/messages/{messageId}/audit', [MessageController::class, 'audit'])
        ->middleware('assert.chat.membership')
        ->name('chat.messages.audit');

    // Chat Message Search
    Route::get('/api/chat/messages/search', [MessageSearchController::class, 'index'])
        ->middleware('assert.chat.membership')
        ->name('chat.messages.search');

    // Chat Message Pin/Unpin
    Route::post('/api/chat/messages/{messageId}/pin', [PinnedMessageController::class, 'store'])
        ->middleware('assert.chat.membership')
        ->name('chat.messages.pin');
    Route::delete('/api/chat/messages/{messageId}/pin', [PinnedMessageController::class, 'destroy'])
        ->middleware('assert.chat.membership')
        ->name('chat.messages.unpin');
    Route::get('/api/chat/messages/pinned', [PinnedMessageController::class, 'index'])
        ->middleware('assert.chat.membership')
        ->name('chat.messages.pinned');

    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Settings
    Route::get('/settings', [SettingsController::class, 'index'])->name('settings.index');
    Route::put('/settings/profile', [SettingsController::class, 'updateProfile'])->name('settings.profile.update');
    Route::put('/settings/password', [SettingsController::class, 'updatePassword'])->name('settings.password.update');
    Route::put('/settings/preferences', [SettingsController::class, 'updatePreferences'])->name('settings.preferences.update');

    Route::get('/api/lecturer/discussion-health', [CoreApiProxyController::class, 'discussionHealth'])->name('api.lecturer.discussion-health');

    // plan-vs-diskusi: Future Works / research surface — route removed from product UI scope.

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
            Route::get('/export', [UserManagementController::class, 'exportData'])
                ->middleware('throttle:10,1')
                ->name('export');
            Route::get('/{id}', [UserManagementController::class, 'show'])->name('show');
            Route::post('/', [UserManagementController::class, 'store'])->name('store');
            Route::put('/{id}', [UserManagementController::class, 'update'])->name('update');
            Route::delete('/{id}', [UserManagementController::class, 'destroy'])->name('destroy');
            Route::post('/{id}/reset-password', [UserManagementController::class, 'resetPassword'])->name('reset-password');
            Route::post('/{id}/toggle-status', [UserManagementController::class, 'toggleStatus'])->name('toggle-status');
        });

        Route::prefix('master-data')->name('master-data.')->group(function () {
            Route::get('/', [MasterDataController::class, 'index'])->name('index');
            Route::get('/archived', [MasterDataController::class, 'index'])->name('archived');
            Route::get('/export', [MasterDataController::class, 'exportData'])
                ->middleware('throttle:10,1')
                ->name('export');
            Route::post('/bulk-activate', [MasterDataController::class, 'bulkActivate'])->name('bulk-activate');
            Route::post('/bulk-deactivate', [MasterDataController::class, 'bulkDeactivate'])->name('bulk-deactivate');
            Route::post('/bulk-import', [MasterDataController::class, 'bulkImport'])->name('bulk-import');
            Route::get('/{id}', [MasterDataController::class, 'show'])->name('show');
            Route::post('/', [MasterDataController::class, 'store'])->name('store');
            Route::post('/{id}/clone', [MasterDataController::class, 'clone'])->name('clone');
            Route::post('/{id}/archive', [MasterDataController::class, 'archive'])->name('archive');
            Route::post('/{id}/restore', [MasterDataController::class, 'restore'])->name('restore');
            Route::delete('/{id}/permanent', [MasterDataController::class, 'permanentDelete'])->name('permanent');
            Route::put('/{id}', [MasterDataController::class, 'update'])->name('update');
            Route::delete('/{id}', [MasterDataController::class, 'destroy'])->name('destroy');
        });

        // course-templates: Future Works — removed from product scope (no admin template library in UC-inti).

        Route::prefix('ai-settings')->name('ai-settings.')->group(function () {
            Route::get('/', [AISettingsController::class, 'index'])->name('index');
            Route::get('/embedding-config', [AISettingsController::class, 'getEmbeddingConfig'])->name('embedding-config.get');
            Route::put('/embedding-config', [AISettingsController::class, 'updateEmbeddingConfig'])->name('embedding-config.update');
            Route::put('/fallback-order', [AISettingsController::class, 'updateFallbackOrder'])->name('fallback-order');
            Route::get('/{provider}/models', [AISettingsController::class, 'getModels'])->name('models');
            Route::get('/{id}', [AISettingsController::class, 'show'])->name('show');
            Route::post('/', [AISettingsController::class, 'store'])->name('store');
            Route::put('/{id}', [AISettingsController::class, 'update'])->name('update');
            Route::delete('/{id}', [AISettingsController::class, 'destroy'])->name('destroy');
            Route::post('/{id}/test', [AISettingsController::class, 'test'])->name('test');
            Route::post('/{id}/activate', [AISettingsController::class, 'activate'])->name('activate');
        });

        Route::get('/usage-stats', [AISettingsController::class, 'usageStats'])->name('usage-stats');
        Route::get('/usage-report/{userId}/{month}/{year}', [AISettingsController::class, 'usageReport'])->name('usage-report');
    });

    /*
    |--------------------------------------------------------------------------
    | Lecturer Routes
    |--------------------------------------------------------------------------
    */
    Route::middleware('role:lecturer')->prefix('lecturer')->name('lecturer.')->group(function () {
        // Global Search
        Route::get('/search', [LecturerGlobalSearchController::class, 'search'])->name('search');

        // Courses
        Route::get('/courses', [CourseController::class, 'index'])->name('courses.index');
        Route::get('/courses/create', [CourseController::class, 'create'])->name('courses.create');
        Route::post('/courses', [CourseController::class, 'store'])->name('courses.store');
        Route::get('/courses/{course}', [CourseController::class, 'show'])->name('courses.show');
        Route::put('/courses/{course}', [CourseController::class, 'update'])->name('courses.update');
        Route::post('/courses/bulk-archive', [CourseController::class, 'bulkArchive'])->name('courses.bulk-archive');

        // Knowledge Base
        Route::get('/courses/{course}/knowledge-base', [CourseController::class, 'knowledgeBaseIndex'])
            ->name('courses.knowledge-base.index');
        Route::post('/courses/{course}/knowledge-base', [CourseController::class, 'uploadKnowledgeBase'])
            ->name('courses.knowledge-base.store');

        // Groups
        Route::get('/courses/{course}/groups', [GroupController::class, 'index'])->name('groups.index');
        Route::post('/courses/{course}/groups', [GroupController::class, 'store'])->name('groups.store');
        Route::delete('/courses/{course}/groups/{group}', [GroupController::class, 'destroy'])->name('groups.destroy');
        Route::post('/courses/{course}/groups/{group}/members', [GroupController::class, 'addMembers'])
            ->name('groups.members.store');
        Route::post('/groups/{group}/session-discussions', [GroupController::class, 'storeSessionDiscussion'])->name('groups.session-discussions.store');

        // Analytics Dashboard
        Route::get('/analytics', [AnalyticsController::class, 'overview'])->name('analytics.overview');
        Route::get('/courses/{course}/analytics', [AnalyticsController::class, 'courseIndex'])->name('analytics.index');
        Route::get('/courses/{course}/analytics/groups/{group}', [AnalyticsController::class, 'groupShow'])->name('analytics.group');
        Route::get('/courses/{course}/analytics/export', [AnalyticsController::class, 'export'])->name('analytics.export');
        Route::get('/courses/{course}/analytics/live', [AnalyticsController::class, 'liveStats'])->name('analytics.live');
        Route::get('/courses/{course}/analytics/trends', [AnalyticsController::class, 'trends'])->name('analytics.trends');
        Route::get('/courses/{course}/analytics/detail', [AnalyticsController::class, 'detail'])->name('analytics.detail');
        Route::get('/courses/{course}/analytics/students', [AnalyticsController::class, 'studentBreakdown'])->name('analytics.students');
        Route::get('/courses/{course}/analytics/students/{student}', [AnalyticsController::class, 'studentDetail'])->name('analytics.student-detail');
        Route::get('/courses/{course}/analytics/export-section', [AnalyticsController::class, 'exportSection'])->name('analytics.export-section');
        Route::post('/courses/{course}/analytics/share', [AnalyticsController::class, 'generateShareLink'])->name('analytics.share');
        Route::get('/courses/{course}/analytics/benchmark', [AnalyticsController::class, 'benchmark'])->name('analytics.benchmark');
        Route::get('/analytics/comparison', [AnalyticsController::class, 'comparison'])->name('analytics.comparison');

        // Radar Chart Page
        Route::get('/radar-chart', function () {
            return Inertia::render('lecturer/RadarChartPage');
        })->name('radar-chart');

        // Aktivitas Diskusi
        Route::get('/courses/{course}/aktivitas', [LecturerAktivitasController::class, 'index'])
            ->name('courses.aktivitas.index');
        Route::get('/courses/{course}/aktivitas/export', [LecturerAktivitasController::class, 'export'])
            ->name('courses.aktivitas.export');

        // Attendance
        Route::get('/courses/{course}/attendance', [LecturerAttendanceController::class, 'index'])
            ->name('courses.attendance.index');
        Route::get('/courses/{course}/attendance/sessions/{sessionId}', [LecturerAttendanceController::class, 'showSession'])
            ->name('courses.attendance.sessions.show');
        Route::put('/courses/{course}/attendance/sessions/{sessionId}/override', [LecturerAttendanceController::class, 'override'])
            ->name('courses.attendance.sessions.override');
        Route::delete('/courses/{course}/attendance/sessions/{sessionId}', [LecturerAttendanceController::class, 'destroySession'])
            ->name('courses.attendance.sessions.destroy');
        Route::post('/courses/{course}/attendance/bulk-close', [LecturerAttendanceController::class, 'bulkClose'])
            ->name('courses.attendance.bulk-close');
        Route::get('/courses/{course}/attendance/summary', [LecturerAttendanceController::class, 'summary'])
            ->name('courses.attendance.summary');
        Route::get('/courses/{course}/attendance/export', [LecturerAttendanceController::class, 'export'])
            ->name('courses.attendance.export');
        Route::post('/courses/{course}/attendance/close-single', [LecturerAttendanceController::class, 'closeSingle'])
            ->name('courses.attendance.close-single');

        // Sesi diskusi — ringkasan AI + analisis per sesi (tab "Sesi & Analisis")
        Route::get('/courses/{course}/sessions', [LecturerSessionInsightController::class, 'index'])
            ->name('courses.sessions.index');
        Route::get('/courses/{course}/sessions/{sessionDiscussion}/detail', [LecturerSessionInsightController::class, 'detail'])
            ->name('courses.sessions.detail');

        Route::get('/courses/{course}/materials-hub', [\App\Http\Controllers\Lecturer\LecturerMaterialsHubController::class, 'show'])
            ->name('courses.materials-hub.show');

        // Materials
        Route::get('/courses/{course}/materials', [LecturerMaterialsController::class, 'index'])
            ->name('courses.materials.index');
        Route::post('/courses/{course}/materials', [LecturerMaterialsController::class, 'store'])
            ->name('courses.materials.store');
        Route::put('/courses/{course}/materials/{materialId}', [LecturerMaterialsController::class, 'update'])
            ->name('courses.materials.update');
        Route::delete('/courses/{course}/materials/{materialId}', [LecturerMaterialsController::class, 'destroy'])
            ->name('courses.materials.destroy');
        Route::post('/courses/{course}/materials/{materialId}/reindex', [LecturerMaterialsController::class, 'reindex'])
            ->name('courses.materials.reindex');
        Route::post('/courses/{course}/materials/{materialId}/view', [LecturerMaterialsController::class, 'recordView'])
            ->name('courses.materials.view');
        Route::get('/courses/{course}/materials/{materialId}/stats', [LecturerMaterialsController::class, 'viewStats'])
            ->name('courses.materials.stats');

        // Course weeks (official syllabus weeks)
        Route::get('/courses/{course}/weeks', [LecturerCourseWeeksController::class, 'index'])
            ->name('courses.weeks.index');
        Route::post('/courses/{course}/weeks', [LecturerCourseWeeksController::class, 'store'])
            ->name('courses.weeks.store');
        Route::put('/courses/{course}/weeks/{weekId}', [LecturerCourseWeeksController::class, 'update'])
            ->name('courses.weeks.update');
        Route::delete('/courses/{course}/weeks/{weekId}', [LecturerCourseWeeksController::class, 'destroy'])
            ->name('courses.weeks.destroy');
        Route::post('/courses/{course}/weeks/reorder', [LecturerCourseWeeksController::class, 'reorderWeeks'])
            ->name('courses.weeks.reorder');
        Route::post('/courses/{course}/weeks/{weekId}/materials', [LecturerCourseWeeksController::class, 'assignMaterial'])
            ->name('courses.weeks.materials.assign');
        Route::delete('/courses/{course}/weeks/{weekId}/materials/{materialId}', [LecturerCourseWeeksController::class, 'unassignMaterial'])
            ->name('courses.weeks.materials.unassign');
        Route::post('/courses/{course}/weeks/{weekId}/materials/reorder', [LecturerCourseWeeksController::class, 'reorderWeekMaterials'])
            ->name('courses.weeks.materials.reorder');

    });

    // Public shared report access (no auth required)
    Route::get('/analytics/shared/{token}', [AnalyticsController::class, 'accessShared'])->name('analytics.shared');

    /*
    |--------------------------------------------------------------------------
    | Student Routes
    |--------------------------------------------------------------------------
    */
    Route::middleware(['role:student', 'assert.enrolled'])->prefix('student')->name('student.')->group(function () {
        // Global Search
        Route::get('/search', [StudentGlobalSearchController::class, 'search'])->name('search');

        // Courses
        Route::get('/courses', [StudentCourseController::class, 'enrolled'])->name('courses.index');
        Route::get('/courses-data', [StudentCourseController::class, 'index'])->name('courses.data');
        Route::post('/courses/join', [StudentCourseController::class, 'join'])->name('courses.join');
        Route::get('/courses/{course}', [StudentCourseController::class, 'showStudent'])->name('courses.show');
        Route::post('/courses/{course}/reading-recommendations', [StudentCourseController::class, 'readingRecommendations'])->name('courses.reading-recommendations');
        Route::get('/courses/{course}/attendance', [StudentAttendanceController::class, 'index'])->name('courses.attendance');

        // Groups (redirect to unified course detail page)
        Route::get('/courses/{course}/groups', fn($course) => redirect()->route('student.courses.show', $course))->name('groups.index');
        Route::post('/courses/{course}/groups', [GroupController::class, 'store'])->name('groups.store');
        Route::post('/groups/join', [GroupController::class, 'join'])->name('groups.join');
        Route::post('/groups/{group}/invite', [GroupController::class, 'inviteMembers'])->name('groups.invite');
        Route::post('/groups/{group}/session-discussions', [GroupController::class, 'storeSessionDiscussion'])->name('groups.session-discussions.store');

        // Group Detail Page
        Route::get('/groups/{group}', [GroupController::class, 'showStudent'])->name('groups.show');

        // Group Members
        Route::patch('/groups/{group}/members/{member}', [GroupMemberManagementController::class, 'updateRole'])->name('groups.members.update-role');
        Route::delete('/groups/{group}/members/{member}', [GroupMemberManagementController::class, 'destroy'])->name('groups.members.destroy');


        // Leave Group
        Route::post('/groups/{group}/leave', [GroupMemberManagementController::class, 'leave'])->name('groups.leave');

        Route::get('/courses/{course}/session-discussions/{sessionDiscussion}/pre-read', [StudentPreReadController::class, 'show'])
            ->name('session-discussions.pre-read.show');
        Route::post('/courses/{course}/session-discussions/{sessionDiscussion}/pre-read/complete', [StudentPreReadController::class, 'complete'])
            ->name('session-discussions.pre-read.complete');

        // Goals - now per sesi diskusi
        Route::get('/courses/{course}/session-discussions/{sessionDiscussion}/goal', [GoalController::class, 'create'])->name('goals.create');
        Route::post('/goals', [GoalController::class, 'store'])->name('goals.store');

        // Sesi Diskusi (redirect to unified course detail page)
        Route::get('/courses/{course}/weeks', [StudentCourseWeeksController::class, 'index'])->name('courses.weeks.index');
        Route::get('/courses/{course}/session-discussions', fn($course) => redirect()->route('student.courses.show', $course))->name('courses.session-discussions');

        Route::get('/courses/{course}/chat', [StudentCourseController::class, 'chat'])->name('courses.chat.index');
        Route::get('/courses/{course}/chat/{sessionDiscussion}', [StudentCourseController::class, 'chatRoom'])->name('courses.chat.room');

        Route::get('/courses/{course}/session-discussions/{sessionDiscussion}/materials', [StudentSessionMaterialsController::class, 'indexByCourse'])
            ->name('session-discussions.materials.by-course');
        Route::get('/groups/{group}/session-discussions/{sessionDiscussion}/materials', [StudentSessionMaterialsController::class, 'index'])
            ->name('session-discussions.materials.index');
        Route::get('/courses/{course}/materials/{materialId}/stream', [StudentSessionMaterialsController::class, 'stream'])
            ->name('courses.materials.stream');

        // BFF proxy routes for session-discussion close/reflection/summary
        Route::post('/courses/{course}/session-discussions/{sessionDiscussion}/close', [StudentCourseController::class, 'closeSession'])
            ->middleware('throttle:10,5')
            ->name('session-discussions.close');
        Route::post('/courses/{course}/session-discussions/{sessionDiscussion}/reflection', [StudentCourseController::class, 'submitReflection'])
            ->middleware('throttle:10,5')
            ->name('session-discussions.reflection');
        Route::get('/courses/{course}/session-discussions/{sessionDiscussion}/summary', [StudentCourseController::class, 'sessionDiscussionSummary'])->name('session-discussions.summary');
        Route::post('/courses/{course}/session-discussions/{sessionDiscussion}/regenerate-summary', [StudentCourseController::class, 'regenerateSummary'])
            ->middleware('throttle:10,5')
            ->name('session-discussions.regenerate-summary');

        // Reflections (submit + history only; templates/tags/analytics = Future Works / out of scope)
        Route::get('/reflections', [ReflectionController::class, 'index'])->name('reflections.index');
        Route::post('/reflections', [ReflectionController::class, 'store'])->name('reflections.store');

        // AI Chat (personal; no dedicated templates page, bookmarks, or saved-materials)
        Route::get('/ai-chat', [AiChatController::class, 'index'])->name('ai-chat.index');
        Route::post('/ai-chat', [AiChatController::class, 'store'])->name('ai-chat.store');
        Route::get('/ai-chat/search', [AiChatSearchController::class, 'index'])->name('ai-chat.search');
        Route::get('/ai-chat/{chat}', [AiChatController::class, 'show'])->name('ai-chat.show');
        Route::get('/ai-chat/{chat}/messages', [AiChatController::class, 'messages'])->name('ai-chat.messages.index');
        Route::patch('/ai-chat/{chat}', [AiChatController::class, 'update'])->name('ai-chat.update');
        Route::delete('/ai-chat/{chat}', [AiChatController::class, 'destroy'])->name('ai-chat.destroy');
        Route::post('/ai-chat/{chat}/messages', [AiChatController::class, 'sendMessage'])->name('ai-chat.messages.store');
        Route::post('/ai-chat/{chat}/messages/stream', [AiChatController::class, 'streamMessage'])->name('ai-chat.messages.stream');

        // Profile
        Route::get('/profile', [ProfileController::class, 'index'])->name('profile.index');
        Route::put('/profile', [ProfileController::class, 'updateProfile'])->name('profile.update');
        Route::post('/profile/avatar', [ProfileAvatarController::class, 'store'])->name('profile.avatar.store');
        Route::delete('/profile/avatar', [ProfileAvatarController::class, 'destroy'])->name('profile.avatar.destroy');
        Route::get('/profile/stats', [ProfileStatsController::class, 'index'])->name('profile.stats');
        Route::get('/profile/preferences', [ProfilePreferenceController::class, 'index'])->name('profile.preferences.index');
        Route::patch('/profile/preferences', [ProfilePreferenceController::class, 'update'])->name('profile.preferences.update');
    });
});
