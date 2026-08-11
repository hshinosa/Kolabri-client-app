<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Columns already exist when Core API (Prisma) owns attendance tables.
        $recordsExist = Schema::hasColumn('attendance_records', 'student_name');
        $sessionsExist = Schema::hasColumn('attendance_sessions', 'total_students');
        if ($recordsExist && $sessionsExist) {
            return;
        }

        // attendance_records: add student_name, student_email
        if (! $recordsExist) {
            Schema::table('attendance_records', function (Blueprint $table) {
                $table->string('student_name')->nullable()->after('student_id');
                $table->string('student_email')->nullable()->after('student_name');
            });
        }

        // attendance_sessions: add stat columns
        if (! $sessionsExist) {
            Schema::table('attendance_sessions', function (Blueprint $table) {
                $table->integer('total_students')->default(0)->after('attendance_method');
                $table->integer('present_count')->default(0)->after('total_students');
                $table->integer('absent_count')->default(0)->after('present_count');
                $table->integer('excused_count')->default(0)->after('absent_count');
                $table->integer('marked_count')->default(0)->after('excused_count');
                $table->decimal('attendance_rate', 5, 2)->default(0)->after('marked_count');
            });
        }
    }

    public function down(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->dropColumn(['student_name', 'student_email']);
        });

        Schema::table('attendance_sessions', function (Blueprint $table) {
            $table->dropColumn(['total_students', 'present_count', 'absent_count', 'excused_count', 'marked_count', 'attendance_rate']);
        });
    }
};
