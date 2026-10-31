<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Support\PublicFiles;
use Illuminate\Http\Request;

// Customer side of the pre-order deposit: show where to pay, then accept proof of payment.
class DepositController extends Controller
{
    // GET /payment-settings (public): deposit share and the GCash account to send it to
    public function settings()
    {
        return response()->json([
            'deposit_percent' => (int) config('bakery.deposit_percent'),
            'gcash_name' => config('bakery.gcash_name'),
            'gcash_number' => config('bakery.gcash_number'),
        ]);
    }

    // POST /orders/{id}/deposit (signed in): GCash reference number plus a screenshot of the transfer
    public function submit(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        if ((int) $order->user_id !== (int) $request->user()->id) {
            return response()->json(['message' => 'You can only pay for your own orders.'], 403);
        }

        if (!in_array($order->payment_status, [Order::PAYMENT_AWAITING_DEPOSIT, Order::PAYMENT_DEPOSIT_SUBMITTED], true)) {
            return response()->json(['message' => 'This order is not waiting for a deposit.'], 422);
        }

        if ($order->status === 'cancelled') {
            return response()->json(['message' => 'This order was cancelled.'], 422);
        }

        $request->validate([
            'payment_reference' => 'required|string|max:100',
            'proof' => 'required|image|mimes:jpeg,png,jpg,webp|max:5120',
        ], [
            'proof.uploaded' => 'That photo is too large to upload. Please send a screenshot or a photo under 5 MB.',
            'proof.max' => 'That photo is too large. Please send a screenshot or a photo under 5 MB.',
            'proof.mimes' => 'Please choose a JPG, PNG or WEBP photo.',
            'proof.image' => 'Please choose a JPG, PNG or WEBP photo.',
        ]);

        // Resubmitting replaces the earlier receipt (removed only once the new one is saved)
        $oldProof = $order->payment_proof_url;

        $order->payment_reference = trim($request->payment_reference);
        $order->payment_proof_url = PublicFiles::store($request->file('proof'), 'payment_proofs');
        $order->payment_submitted_at = now();
        $order->payment_status = Order::PAYMENT_DEPOSIT_SUBMITTED;
        $order->save();
        PublicFiles::delete($oldProof);

        return response()->json([
            'message' => 'Payment proof received. We will confirm your deposit shortly.',
            'order' => $order->load('items.product:id,name,image_url'),
        ]);
    }
}
