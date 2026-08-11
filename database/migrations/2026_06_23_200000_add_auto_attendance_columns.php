<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Columns already exist when Core API (Prisma) owns attendance tables.
        if (Schema::hasColumn('attendance_sessions', 'session_discussion_id')) {
            return;
        }

        Schema::table('attendance_sessions', function (Blueprint $table) {
            $table->uuid('session_discussion_id')->nullable()->unique()->after('course_id');
            $table->uuid('week_id')->nullable()->index()->after('session_discussion_id');
            $table->uuid('group_id')->nullable()->index()->after('week_id');
            $table->boolean('auto_generated')->default(false)->after('session_number');
            $table->enum('attendance_method', ['auto', 'manual'])->default('auto')->after('auto_generated');
        });

        // Update attendance_records: remove 'late' from enum (auto-attendance only uses present/absent/excused)
        // Keep 'late' in DB for backward compat with existing data, but UI won't use it
    }

    public function down(): void
    {
        Schema::table('attendance_sessions', function (Blueprint $table) {
            $table->dropColumn(['session_discussion_id', 'week_id', 'group_id', 'auto_generated', 'attendance_method']);
        });
    }
};
