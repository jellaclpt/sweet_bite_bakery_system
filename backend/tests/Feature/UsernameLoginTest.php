<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

// Logging in with a username or an email, and the admin account from ADMIN_USERNAME
class UsernameLoginTest extends TestCase
{
    use RefreshDatabase;

    private function register(array $overrides = [])
    {
        return $this->postJson('/api/register', $overrides + [
            'name' => 'Carmen Laguda', 'username' => 'Carmen_L', 'email' => 'carmen@example.com',
            'password' => 'secret123', 'password_confirmation' => 'secret123',
        ]);
    }

    private function seedAsLive(array $config): void
    {
        $this->app['env'] = 'production';
        config(['bakery.admin_username' => null, 'bakery.admin_email' => null, 'bakery.admin_password' => null]);
        config($config);
        $this->artisan('db:seed', ['--class' => DatabaseSeeder::class, '--force' => true])->assertSuccessful();
    }

    public function test_register_saves_a_lowercase_username(): void
    {
        $this->register()->assertCreated()->assertJsonPath('user.username', 'carmen_l');
    }

    public function test_login_works_with_username_or_email_in_any_case(): void
    {
        $this->register()->assertCreated();

        foreach (['carmen_l', '  CARMEN_L ', 'carmen@example.com', 'Carmen@Example.com'] as $login) {
            $this->postJson('/api/login', ['login' => $login, 'password' => 'secret123'])
                ->assertOk()->assertJsonPath('user.username', 'carmen_l');
        }

        // Older website versions sent the field as "email"
        $this->postJson('/api/login', ['email' => 'carmen_l', 'password' => 'secret123'])->assertOk();
    }

    public function test_wrong_password_gets_one_clear_message(): void
    {
        $this->register()->assertCreated();

        $this->postJson('/api/login', ['login' => 'carmen_l', 'password' => 'nope'])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'The username/email or password is incorrect.');
        $this->postJson('/api/login', ['login' => 'nobody', 'password' => 'nope'])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'The username/email or password is incorrect.');
    }

    public function test_usernames_must_be_unique_and_well_formed(): void
    {
        $this->register()->assertCreated();

        $this->register(['username' => 'CARMEN_L', 'email' => 'other@example.com'])
            ->assertUnprocessable()->assertJsonPath('errors.username.0', 'That username is taken. Please choose another one.');

        foreach (['ab', 'has space', 'me@home', 'émile', str_repeat('a', 31)] as $bad) {
            $this->register(['username' => $bad, 'email' => uniqid() . '@example.com'])
                ->assertUnprocessable()->assertJsonValidationErrors('username');
        }

        $this->register(['username' => null, 'email' => 'x@example.com'])->assertJsonValidationErrors('username');
    }

    public function test_admin_comes_from_admin_username_without_needing_an_email(): void
    {
        $this->seedAsLive(['bakery.admin_username' => 'SweetAdmin', 'bakery.admin_password' => 'a-long-admin-pass']);

        $admin = User::where('username', 'sweetadmin')->first();
        $this->assertTrue($admin->isAdmin());
        $this->assertNull($admin->email);

        $this->postJson('/api/login', ['login' => 'SweetAdmin', 'password' => 'a-long-admin-pass'])
            ->assertOk()->assertJsonPath('user.role', 'admin');
    }

    public function test_switching_from_admin_email_to_admin_username_keeps_the_same_account(): void
    {
        // What an earlier deploy created from ADMIN_EMAIL
        $old = User::create(['name' => 'Owner', 'email' => 'owner@sweetbite.ph', 'password' => Hash::make('a-long-admin-pass'), 'role' => 'admin']);

        $this->seedAsLive([
            'bakery.admin_username' => 'owner', 'bakery.admin_email' => 'owner@sweetbite.ph',
            'bakery.admin_password' => 'a-long-admin-pass',
        ]);

        $this->assertSame(1, User::count());
        $this->assertSame('owner', $old->fresh()->username);
        $this->postJson('/api/login', ['login' => 'owner', 'password' => 'a-long-admin-pass'])->assertOk();
        $this->postJson('/api/login', ['login' => 'owner@sweetbite.ph', 'password' => 'a-long-admin-pass'])->assertOk();
    }

    public function test_admin_username_never_takes_over_a_customer(): void
    {
        $this->register(['username' => 'boss'])->assertCreated();

        $this->seedAsLive(['bakery.admin_username' => 'boss', 'bakery.admin_password' => 'a-long-admin-pass']);

        $customer = User::where('username', 'boss')->first();
        $this->assertFalse($customer->isAdmin());
        $this->assertTrue(Hash::check('secret123', $customer->password));
    }

    public function test_bad_admin_username_is_refused(): void
    {
        $this->seedAsLive(['bakery.admin_username' => 'my admin!', 'bakery.admin_password' => 'a-long-admin-pass']);

        $this->assertSame(0, User::count());
    }

    public function test_accounts_without_a_password_can_set_one_then_log_in(): void
    {
        // Accounts created by the earlier Google sign-in had no password
        $user = User::factory()->create(['username' => 'gina', 'password' => null]);
        $this->assertFalse($user->fresh()->has_password);

        $this->postJson('/api/login', ['login' => 'gina', 'password' => 'anything'])
            ->assertUnprocessable()->assertJsonPath('errors.login.0', fn ($m) => str_contains($m, "doesn't have a password yet"));

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/profile/change-password', ['new_password' => 'my-new-pass'])
            ->assertOk()->assertJsonPath('user.has_password', true);

        $this->app['auth']->forgetGuards();
        $this->postJson('/api/login', ['login' => 'gina', 'password' => 'my-new-pass'])->assertOk();
    }

    public function test_google_sign_in_is_gone_and_secrets_stay_hidden(): void
    {
        $this->postJson('/api/auth/google', ['credential' => 'x'])->assertNotFound();

        $user = User::factory()->create();
        $json = $this->actingAs($user, 'sanctum')->getJson('/api/user')->assertOk()->json();
        $this->assertArrayNotHasKey('password', $json);
        $this->assertArrayNotHasKey('google_id', $json);
        $this->assertArrayHasKey('username', $json);
    }
}
