<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

// Runs on every deploy (docker-entrypoint.sh), so everything here must be safe to repeat.
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([CategorySeeder::class]);

        $this->seedAdmin();

        // Demo accounts with simple passwords only on a developer's own machine, never on the live site
        if (app()->environment('local')) {
            $this->seedDemoAccounts();
        }
    }

    // The admin account comes from environment variables, so no password is written in the code.
    // Setting ADMIN_PASSWORD (for a new or existing ADMIN_EMAIL) also resets that account's password,
    // which is how to change the admin password on Render.
    private function seedAdmin(): void
    {
        $email = strtolower(trim((string) config('bakery.admin_email')));
        $password = (string) config('bakery.admin_password');

        if ($email === '' || $password === '') {
            $this->command?->warn('ADMIN_EMAIL / ADMIN_PASSWORD not set: no admin account created or updated.');

            return;
        }

        if (strlen($password) < 10) {
            $this->command?->error('ADMIN_PASSWORD must be at least 10 characters: admin account not updated.');

            return;
        }

        $admin = User::firstOrNew(['email' => $email]);

        // Only re-hash when it actually changed, so existing sign-ins aren't affected on every restart
        if (!$admin->exists || !Hash::check($password, $admin->password)) {
            $admin->password = Hash::make($password);
        }

        $admin->name = $admin->name ?: 'Sweet Bite Admin';
        $admin->role = 'admin';
        $admin->email_verified_at = $admin->email_verified_at ?: now();
        $admin->save();

        $this->lockLeakedDemoAccounts($admin->email);
    }

    // Older versions of this file created these two accounts on the live site with passwords
    // that are visible on GitHub. Once a real admin exists, any of them still using the
    // published password gets a random one, so nobody can sign in with it.
    private function lockLeakedDemoAccounts(string $keepEmail): void
    {
        if (app()->environment('local')) {
            return;
        }

        $leaked = ['admin@gmail.com' => 'admin12345', 'test@gmail.com' => 'test12345'];

        foreach ($leaked as $email => $publishedPassword) {
            if ($email === $keepEmail) {
                continue; // just given the new ADMIN_PASSWORD above
            }

            $user = User::where('email', $email)->first();

            if ($user && Hash::check($publishedPassword, $user->password)) {
                $user->forceFill(['password' => Hash::make(\Illuminate\Support\Str::random(40))])->save();
                $user->tokens()->delete();
                $this->command?->warn("Locked {$email}: it still used a password published on GitHub.");
            }
        }
    }

    private function seedDemoAccounts(): void
    {
        User::firstOrCreate(['email' => 'admin@gmail.com'], [
            'name' => 'Admin User',
            'password' => Hash::make('admin12345'),
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);

        User::firstOrCreate(['email' => 'test@gmail.com'], [
            'name' => 'Test Customer',
            'password' => Hash::make('test12345'),
            'role' => 'user',
            'phone' => '0987654321',
            'address' => '123 Customer Street',
            'email_verified_at' => now(),
        ]);
    }
}
