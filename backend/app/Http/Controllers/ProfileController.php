<?php

namespace App\Http\Controllers;

use App\Support\PublicFiles;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ProfileController extends Controller
{
    // PUT /profile/update (multipart: name, phone, address, image)
    public function update(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
        ]);

        $user->name = trim($validated['name']);

        // Only touch fields the form actually sent; an empty field clears the value
        if ($request->exists('phone')) {
            $user->phone = $validated['phone'] ?? null;
        }
        if ($request->exists('address')) {
            $user->address = $validated['address'] ?? null;
        }

        if ($request->hasFile('image')) {
            PublicFiles::delete($user->image_url);
            $user->image_url = PublicFiles::store($request->file('image'), 'profiles');
        }

        $user->save();

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user->fresh(),
        ]);
    }

    // PUT /profile/change-password { old_password, new_password }
    public function changePassword(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'old_password' => 'required|string',
            'new_password' => 'required|string|min:6|max:255|different:old_password',
        ], [
            'new_password.different' => 'Your new password must be different from the current one.',
        ]);

        if (!Hash::check($request->old_password, $user->password)) {
            return response()->json([
                'message' => 'Current password is incorrect',
                'errors' => ['old_password' => ['Current password is incorrect']],
            ], 422);
        }

        $user->password = Hash::make($request->new_password);
        $user->save();

        // Sign out every other device that might know the old password
        $current = $user->currentAccessToken();
        $user->tokens()
            ->when($current instanceof \Laravel\Sanctum\PersonalAccessToken, fn ($q) => $q->whereKeyNot($current->id))
            ->delete();

        return response()->json(['message' => 'Password changed successfully']);
    }
}
