<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class NotificationController extends Controller
{
    // GET /notifications/{user_id} (that user only): newest first
    public function index(Request $request, $user_id)
    {
        if ((int) $user_id !== (int) $request->user()->id) {
            abort(403, 'You can only view your own notifications.');
        }

        return response()->json($request->user()->notifications()->latest()->get());
    }

    // PATCH /notifications/{id}/read (only your own; anyone else's looks like it doesn't exist)
    public function markAsRead(Request $request, $id)
    {
        $notification = $request->user()->notifications()->whereKey($id)->first();

        if (!$notification) {
            return response()->json(['message' => 'Notification not found'], 404);
        }

        $notification->markAsRead();

        return response()->json(['message' => 'Notification marked as read']);
    }
}
