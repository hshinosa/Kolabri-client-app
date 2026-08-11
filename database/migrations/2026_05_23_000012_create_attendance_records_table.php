<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Attendance tables are owned by Kolabri Core API (Prisma); skip creation if present.
        if (Schema::hasTable('attendance_sessions') && Schema::hasTable('attendance_records')) {
            return;
        }

        if (!Schema::hasTable('attendance_sessions')) {
            Schema::create('attendance_sessions', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('course_id')->index();
                $table->string('title');
                $table->date('session_date');
                $table->integer('session_number')->nullable();
                $table->text('notes')->nullable();
                $table->uuid('created_by')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('attendance_records')) {
            Schema::create('attendance_records', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('session_id');
                $table->uuid('student_id');
                $table->enum('status', ['present', 'absent', 'late', 'excused'])->default('absent');
                $table->text('notes')->nullable();
                $table->timestamp('marked_at')->nullable();
                $table->uuid('marked_by')->nullable();
                $table->timestamps();

                $table->foreign('session_id')->references('id')->on('attendance_sessions')->cascadeOnDelete();
                $table->unique(['session_id', 'student_id']);
                $table->index(['student_id', 'session_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_records');
        Schema::dropIfExists('attendance_sessions');
    }
};
