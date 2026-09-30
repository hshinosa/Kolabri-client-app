<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * course_students is owned by core-api (Prisma) in production — the BFF
     * only reads it for enrollment guards. Create it solely for the BFF's
     * isolated test database; skip entirely when the real table exists.
     */
    public function up(): void
    {
        if (Schema::hasTable('course_students')) {
            return;
        }

        Schema::create('course_students', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('course_id')->index();
            $table->string('user_id')->index();
            $table->timestamp('enrolled_at')->useCurrent();
        });
    }

    public function down(): void
    {
        if (! app()->environment('testing')) {
            return;
        }

        Schema::dropIfExists('course_students');
    }
};
