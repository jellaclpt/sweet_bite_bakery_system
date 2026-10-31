<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

// Customers who sign up with Google can add a password later and then log in either way
class GooglePasswordTest extends TestCase
{
    use RefreshDatabase;

    private function signUpWithGoogle(string $email = 'carmen@example.com'): array
    {
        config(['services.google.client_id' => 'test-client.apps.googleusercontent.com']);
        Http::fake(['oauth2.googleapis.com/*' => Http::response([
            'iss' => 'https://accounts.google.com', 'aud' => 'test-client.apps.googleusercontent.com',
            'sub' => 'google-123', 'email' => $email, 'email_verified' => 'true', 'name' => 'Carmen',
        ])]);

        return $this->postJson('/api/auth/google', ['credential' => 'id-token'])->assertCreated()->json();
    }

    public function test_google_sign_up_has_no_password_until_one_is_set(): void
    {
        $res = $this->signUpWithGoogle();

        $this->assertFalse($res['user']['has_password']);
        $this->assertNull(User::first()->getRawOriginal('password'));

        // Trying the email form explains what to do instead of "wrong password"
        $this->postJson('/api/login', ['email' => 'carmen@example.com', 'password' => 'anything'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.email.0', fn ($m) => str_contains($m, 'Continue with Google'));
    }

    public function test_google_user_sets_a_password_without_a_current_one_then_logs_in_with_email(): void
    {
        $token = $this->signUpWithGoogle()['token'];

        $this->withToken($token)->getJson('/api/user')->assertJsonPath('has_password', false);

        $this->withToken($token)
            ->putJson('/api/profile/change-password', ['new_password' => 'my-new-pass'])
            ->assertOk()
            ->assertJsonPath('user.has_password', true)
            ->assertJsonPath('message', 'Password set. You can now also log in with your email.');

        $this->app['auth']->forgetGuards();
        $this->postJson('/api/login', ['email' => 'carmen@example.com', 'password' => 'my-new-pass'])->assertOk();

        // Google sign-in still works for the same account
        $this->postJson('/api/auth/google', ['credential' => 'id-token'])->assertOk()->assertJsonPath('user.has_password', true);
    }

    public function test_once_set_changing_it_needs_the_current_password(): void
    {
        $token = $this->signUpWithGoogle()['token'];
        $this->withToken($token)->putJson('/api/profile/change-password', ['new_password' => 'first-pass'])->assertOk();

        $this->withToken($token)->putJson('/api/profile/change-password', ['new_password' => 'second-pass'])
            ->assertUnprocessable()->assertJsonValidationErrors('old_password');

        $this->withToken($token)->putJson('/api/profile/change-password', ['old_password' => 'wrong', 'new_password' => 'second-pass'])
            ->assertUnprocessable();

        $this->assertTrue(Hash::check('first-pass', User::first()->password));
    }

    public function test_regular_accounts_still_need_their_current_password(): void
    {
        $user = User::factory()->create(['password' => Hash::make('old-password')]);

        $this->actingAs($user, 'sanctum')->getJson('/api/user')->assertJsonPath('has_password', true);
        $this->actingAs($user, 'sanctum')
            ->putJson('/api/profile/change-password', ['new_password' => 'new-password'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.old_password.0', 'Please enter your current password.');

        $this->assertTrue(Hash::check('old-password', $user->fresh()->password));
    }

    public function test_linking_google_to_an_email_account_keeps_its_password(): void
    {
        User::factory()->create(['email' => 'carmen@example.com', 'password' => Hash::make('email-pass')]);

        config(['services.google.client_id' => 'test-client.apps.googleusercontent.com']);
        Http::fake(['oauth2.googleapis.com/*' => Http::response([
            'iss' => 'accounts.google.com', 'aud' => 'test-client.apps.googleusercontent.com',
            'sub' => 'google-123', 'email' => 'carmen@example.com', 'email_verified' => true,
        ])]);

        $this->postJson('/api/auth/google', ['credential' => 'id-token'])->assertOk()->assertJsonPath('user.has_password', true);
        $this->postJson('/api/login', ['email' => 'carmen@example.com', 'password' => 'email-pass'])->assertOk();
    }

    public function test_the_password_is_never_sent_to_the_browser(): void
    {
        $user = User::factory()->create();

        $json = $this->actingAs($user, 'sanctum')->getJson('/api/user')->assertOk()->json();

        $this->assertArrayNotHasKey('password', $json);
        $this->assertArrayNotHasKey('google_id', $json);
    }
}
