<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Customers and admins can log in with a username (or their email).
// Existing accounts get a username made from their email, e.g. carmen.laguda@gmail.com
// becomes "carmen.laguda" (with a number added if that's already taken).
// Email becomes optional so the admin account doesn't need one.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username', 30)->nullable()->after('name');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('email')->nullable()->change();
        });

        $taken = [];
        foreach (DB::table('users')->orderBy('id')->get(['id', 'email', 'name']) as $user) {
            $base = strtolower(strstr((string) $user->email, '@', true) ?: (string) $user->name);
            $base = substr(trim(preg_replace('/[^a-z0-9._]+/', '', $base), '.'), 0, 24);
            if (strlen($base) < 3) {
                $base = 'user' . $user->id;
            }

            $username = $base;
            for ($n = 2; isset($taken[$username]); $n++) {
                $username = $base . $n;
            }
            $taken[$username] = true;

            DB::table('users')->where('id', $user->id)->update(['username' => $username]);
        }

        Schema::table('users', function (Blueprint $table) {
            $table->unique('username');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['username']);
            $table->dropColumn('username');
        });
    }
};
