<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    // REGISTER
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|unique:users',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
            'password' => 'required|string|min:6|confirmed',
            // 'role' is not accepted from public registration
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'address' => $request->address,
            'password' => Hash::make($request->password),
            'role' => 'user' // Default role
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'User registered successfully',
            'user' => $user,
            'token' => $token
        ], 201);
    }

    // LOGIN
    public function login(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|string|email',
                'password' => 'required|string'
            ]);

            $user = User::where('email', $request->email)->first();

            if (!$user || !Hash::check($request->password, $user->password)) {
                throw ValidationException::withMessages([
                    'email' => ['The provided credentials are incorrect.']
                ]);
            }

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'message' => 'Login successful',
                'user' => $user,
                'token' => $token
            ]);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Login error: ' . $e->getMessage());
            return response()->json([
                'message' => 'An error occurred during login. Please try again.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    // SIGN IN / SIGN UP WITH GOOGLE
    // The frontend sends the ID token ("credential") from Google's sign-in button.
    // We verify it with Google, then log in the matching user or create a new customer.
    public function google(Request $request)
    {
        $request->validate(['credential' => 'required|string']);

        $clientId = config('services.google.client_id');
        if (!$clientId) {
            return response()->json(['message' => 'Google sign-in is not set up on the server yet.'], 503);
        }

        $response = Http::timeout(10)->get('https://oauth2.googleapis.com/tokeninfo', [
            'id_token' => $request->credential,
        ]);

        $info = $response->json();
        $validIssuer = in_array($info['iss'] ?? '', ['accounts.google.com', 'https://accounts.google.com'], true);
        $verified = filter_var($info['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN);

        if (!$response->ok() || ($info['aud'] ?? null) !== $clientId || !$validIssuer || !$verified || empty($info['email'])) {
            return response()->json(['message' => 'Google sign-in failed. Please try again.'], 401);
        }

        $user = User::where('google_id', $info['sub'])->first()
            ?? User::where('email', $info['email'])->first();

        $isNew = false;
        if (!$user) {
            $isNew = true;
            $user = User::create([
                'name' => $info['name'] ?? Str::before($info['email'], '@'),
                'email' => $info['email'],
                'google_id' => $info['sub'],
                'image_url' => $info['picture'] ?? null,
                // Google users sign in without a password; a random one keeps the column filled
                'password' => Hash::make(Str::random(40)),
                'role' => 'user',
            ]);
        } elseif (!$user->google_id) {
            // Existing email account: link it to Google so either method works
            $user->google_id = $info['sub'];
            if (!$user->image_url && !empty($info['picture'])) {
                $user->image_url = $info['picture'];
            }
            $user->save();
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => $isNew ? 'Account created with Google' : 'Login successful',
            'user' => $user,
            'token' => $token,
            'is_new' => $isNew,
        ], $isNew ? 201 : 200);
    }

    // LOGOUT
    public function logout(Request $request)
    {
        // Delete all tokens for the authenticated user
        if ($request->user()) {
            $request->user()->tokens()->delete();
        }

        return response()->json([
            'message' => 'Logged out successfully'
        ]);
    }
}
