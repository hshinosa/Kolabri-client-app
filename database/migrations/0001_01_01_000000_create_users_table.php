<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * NOTE: The 'users' table is managed by CoRegula Core API (Prisma/Node.js).
     * Laravel skips creating it to avoid conflicts with the existing schema.
     * Core API users table has: uuid id, email, password, name, role (enum), googleId, avatarUrl, isActive
     */
    public function up(): void
    {
        // Skip creating 'users' table - already exists from CoRegula Core API
        // Schema::create('users', function (Blueprint $table) {
        //     $table->id();
        //     $table->string('name');
        //     $table->string('email')->unique();
        //     $table->timestamp('email_verified_at')->nullable();
        //     $table->string('password');
        //     $table->rememberToken();
        //     $table->timestamps();
        // });

        // Create password_reset_tokens table only if it doesn't exist
        if (!Schema::hasTable('password_reset_tokens')) {
            Schema::create('password_reset_tokens', function (Blueprint $table) {
                $table->string('email')->primary();
                $table->string('token');
                $table->timestamp('created_at')->nullable();
            });
        }

        // Create sessions table only if it doesn't exist
        if (!Schema::hasTable('sessions')) {
            Schema::create('sessions', function (Blueprint $table) {
                $table->string('id')->primary();
                $table->foreignId('user_id')->nullable()->index();
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->longText('payload');
                $table->integer('last_activity')->index();
            });
        }
    }

    /**
     * Reverse the migrations.
     *
     * NOTE: We don't drop 'users' table here because it's managed by Core API.
     * Only Laravel-managed tables are dropped.
     */
    public function down(): void
    {
        // Do NOT drop 'users' table - it's managed by CoRegula Core API
        // Schema::dropIfExists('users');

        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
