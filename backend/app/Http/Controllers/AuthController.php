<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    // Usernames: 3 to 30 characters, lowercase letters, numbers, dot and underscore.
    // No "@", so the login box can tell a username from an email.
    public const USERNAME_RULE = 'regex:/^[a-z0-9._]{3,30}$/';

    // POST /register { name, username, email, phone, address, password, password_confirmation }
    public function register(Request $request)
    {
        $this->normalize($request, ['email', 'username']);

        $request->validate([
            'name' => 'required|string|max:255',
            'username' => ['required', 'string', self::USERNAME_RULE, function ($attribute, $value, $fail) {
                if (self::findByUsername($value)) {
                    $fail('That username is taken. Please choose another one.');
                }
            }],
            'email' => ['required', 'string', 'email', 'max:255', function ($attribute, $value, $fail) {
                if (self::findByEmail($value)) {
                    $fail('An account with this email already exists. Try logging in instead.');
                }
            }],
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            'password' => 'required|string|min:6|confirmed',
        ], [
            'username.regex' => 'Usernames are 3 to 30 characters: letters, numbers, dots and underscores only.',
        ]);

        $user = User::create([
            'name' => trim($request->name),
            'username' => $request->username,
            'email' => $request->email,
            'phone' => $request->phone,
            'address' => $request->address,
            'password' => Hash::make($request->password),
            'role' => 'user',
        ]);

        return response()->json([
            'message' => 'User registered successfully',
            'user' => $user,
            'token' => $user->createToken('auth_token')->plainTextToken,
        ], 201);
    }

    // POST /login { login, password }. "login" is a username or an email.
    // (Older versions of the website sent "email"; that still works.)
    public function login(Request $request)
    {
        if (!$request->filled('login') && $request->filled('email')) {
            $request->merge(['login' => $request->input('email')]);
        }
        $this->normalize($request, ['login']);

        $request->validate([
            'login' => 'required|string|max:255',
            'password' => 'required|string',
        ], [
            'login.required' => 'Please enter your username or email.',
        ]);

        try {
            $user = self::findByLogin($request->login);

            if ($user && !$user->has_password) {
                throw ValidationException::withMessages([
                    'login' => ["This account doesn't have a password yet. Please contact the bakery to set one."],
                ]);
            }

            if (!$user || !Hash::check($request->password, $user->password)) {
                throw ValidationException::withMessages([
                    'login' => ['The username/email or password is incorrect.'],
                ]);
            }

            return response()->json([
                'message' => 'Login successful',
                'user' => $user,
                'token' => $user->createToken('auth_token')->plainTextToken,
            ]);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Login error: ' . $e->getMessage());

            return response()->json(['message' => 'An error occurred during login. Please try again.'], 500);
        }
    }

    // POST /logout: sign out this device only; other devices stay signed in
    public function logout(Request $request)
    {
        $token = $request->user()?->currentAccessToken();
        if ($token instanceof \Laravel\Sanctum\PersonalAccessToken) {
            $token->delete();
        }

        return response()->json(['message' => 'Logged out successfully']);
    }

    // Anything with "@" is treated as an email, everything else as a username
    public static function findByLogin(string $login): ?User
    {
        return str_contains($login, '@') ? self::findByEmail($login) : self::findByUsername($login);
    }

    // Matched ignoring case, including accounts saved before values were lowercased
    public static function findByEmail(string $email): ?User
    {
        return User::whereRaw('LOWER(email) = ?', [strtolower(trim($email))])->first();
    }

    public static function findByUsername(string $username): ?User
    {
        return User::whereRaw('LOWER(username) = ?', [strtolower(trim($username))])->first();
    }

    private function normalize(Request $request, array $fields): void
    {
        foreach ($fields as $field) {
            if (is_string($request->input($field))) {
                $request->merge([$field => strtolower(trim($request->input($field)))]);
            }
        }
    }
}
