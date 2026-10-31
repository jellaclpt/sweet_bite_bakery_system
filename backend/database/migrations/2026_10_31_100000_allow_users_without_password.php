<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Customers who sign up with Google have no password until they choose to set one.
// Existing accounts keep their passwords; nothing is changed for them.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('password')->nullable()->change();
        });
    }

    public function down(): void
    {
        // Can't safely make it required again while Google-only accounts exist
    }
};
