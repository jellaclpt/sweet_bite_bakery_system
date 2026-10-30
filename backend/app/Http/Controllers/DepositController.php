<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

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
        ]);

        // Same storage approach as product images: public disk, full URL saved on the record
        $file = $request->file('proof');
        $filename = 'order-' . $order->id . '-' . Str::random(10) . '.' . $file->getClientOriginalExtension();
        $file->storeAs('payment_proofs', $filename, 'public');

        $order->payment_reference = $request->payment_reference;
        $order->payment_proof_url = url('storage/payment_proofs/' . $filename);
        $order->payment_submitted_at = now();
        $order->payment_status = Order::PAYMENT_DEPOSIT_SUBMITTED;
        $order->save();

        return response()->json([
            'message' => 'Payment proof received. We will confirm your deposit shortly.',
            'order' => $order->load('items.product:id,name,image_url'),
        ]);
    }
}
