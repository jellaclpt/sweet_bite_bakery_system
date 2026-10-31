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

    // The admin account comes from environment variables, so no password is written in the code:
    // ADMIN_USERNAME and ADMIN_PASSWORD (ADMIN_EMAIL optional). Changing ADMIN_PASSWORD and
    // redeploying also resets the admin password.
    private function seedAdmin(): void
    {
        $username = strtolower(trim((string) config('bakery.admin_username')));
        $email = strtolower(trim((string) config('bakery.admin_email')));
        $password = (string) config('bakery.admin_password');

        if ($username === '' && $email !== '') {
            // Older setups only had ADMIN_EMAIL: keep them working with a username from the email
            $username = substr(preg_replace('/[^a-z0-9._]+/', '', strstr($email, '@', true) ?: $email), 0, 30);
        }

        if ($username === '' || $password === '') {
            $this->command?->warn('ADMIN_USERNAME / ADMIN_PASSWORD not set: no admin account created or updated.');

            return;
        }

        if (!preg_match('/^[a-z0-9._]{3,30}$/', $username)) {
            $this->command?->error('ADMIN_USERNAME must be 3 to 30 characters (letters, numbers, dots, underscores): admin account not updated.');

            return;
        }

        if (strlen($password) < 10) {
            $this->command?->error('ADMIN_PASSWORD must be at least 10 characters: admin account not updated.');

            return;
        }

        // Find the admin by username, or by email (an admin created before usernames existed)
        $byUsername = \App\Http\Controllers\AuthController::findByUsername($username);
        $byEmail = $email !== '' ? \App\Http\Controllers\AuthController::findByEmail($email) : null;

        // Never take over a customer's account just because the username matches
        if ($byUsername && !$byUsername->isAdmin() && (!$byEmail || $byEmail->id !== $byUsername->id)) {
            $this->command?->error("ADMIN_USERNAME \"{$username}\" already belongs to a customer: choose another username. Admin account not updated.");

            return;
        }

        $admin = $byUsername ?? $byEmail ?? new User();

        $admin->username = $username;
        if ($email !== '') {
            if ($byEmail && $admin->exists && $byEmail->id !== $admin->id) {
                $this->command?->warn("ADMIN_EMAIL {$email} is used by another account, so it wasn't added to the admin.");
            } else {
                $admin->email = $email;
            }
        }

        // Only re-hash when it actually changed, so existing sign-ins aren't affected on every restart
        if (!$admin->exists || !Hash::check($password, $admin->password)) {
            $admin->password = Hash::make($password);
        }

        $admin->name = $admin->name ?: 'Sweet Bite Admin';
        $admin->role = 'admin';
        $admin->email_verified_at = $admin->email_verified_at ?: now();
        $admin->save();

        $this->lockLeakedDemoAccounts((string) $admin->email);
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
            'username' => 'admin',
            'password' => Hash::make('admin12345'),
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);

        User::firstOrCreate(['email' => 'test@gmail.com'], [
            'name' => 'Test Customer',
            'username' => 'testcustomer',
            'password' => Hash::make('test12345'),
            'role' => 'user',
            'phone' => '0987654321',
            'address' => '123 Customer Street',
            'email_verified_at' => now(),
        ]);
    }
}
