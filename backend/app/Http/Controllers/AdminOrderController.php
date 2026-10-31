<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\User;
use App\Notifications\OrderStatusUpdated;
use Illuminate\Http\Request;

// Admin view of all pre-orders: check deposits, confirm payments and move orders along.
class AdminOrderController extends Controller
{
    // GET /admin/orders
    public function index(Request $request)
    {
        $query = Order::with(['items.product:id,name,image_url', 'user:id,name,email,phone,address'])
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }

        return response()->json($query->get());
    }

    // PATCH /admin/orders/{id}/payment
    // confirm_deposit: deposit received, order confirmed
    // reject_deposit:  proof doesn't match, customer must resubmit
    // mark_paid:       balance collected at pickup or delivery
    public function updatePayment(Request $request, $id)
    {
        $request->validate([
            'action' => 'required|in:confirm_deposit,reject_deposit,mark_paid',
        ]);

        $order = Order::findOrFail($id);

        // Which payment states each action may start from. Anything else is a mistake
        // (e.g. confirming a deposit twice, or moving a fully paid order backwards).
        $allowedFrom = [
            // awaiting_deposit too: the customer may have paid the deposit in person
            'confirm_deposit' => [Order::PAYMENT_AWAITING_DEPOSIT, Order::PAYMENT_DEPOSIT_SUBMITTED],
            'reject_deposit' => [Order::PAYMENT_DEPOSIT_SUBMITTED],
            'mark_paid' => [Order::PAYMENT_AWAITING_DEPOSIT, Order::PAYMENT_DEPOSIT_SUBMITTED, Order::PAYMENT_DEPOSIT_PAID, 'unpaid'],
        ];

        if (!in_array($order->payment_status, $allowedFrom[$request->action], true)) {
            return response()->json([
                'message' => "This order's payment is already \"" . str_replace('_', ' ', $order->payment_status) . '", so that action does not apply.',
            ], 422);
        }

        if ($order->status === 'cancelled' && $request->action !== 'reject_deposit') {
            return response()->json(['message' => 'This order was cancelled.'], 422);
        }

        switch ($request->action) {
            case 'confirm_deposit':
                $order->payment_status = Order::PAYMENT_DEPOSIT_PAID;
                $order->amount_paid = max((float) $order->amount_paid, (float) $order->deposit_amount);
                $order->payment_confirmed_at = now();
                if ($order->status === 'pending') {
                    $order->status = 'confirmed';
                }
                break;

            case 'reject_deposit':
                // Keep the receipt and reference so the admin can still see what was sent
                $order->payment_status = Order::PAYMENT_AWAITING_DEPOSIT;
                $order->payment_submitted_at = null;
                break;

            case 'mark_paid':
                $order->payment_status = Order::PAYMENT_PAID;
                $order->amount_paid = $order->total;
                $order->payment_confirmed_at = $order->payment_confirmed_at ?? now();
                break;
        }

        $order->save();
        $this->notifyCustomer($order);

        return response()->json([
            'message' => 'Payment updated.',
            'order' => $order->load(['items.product:id,name,image_url', 'user:id,name,email,phone,address']),
        ]);
    }

    // PATCH /admin/orders/{id}/status
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|string|in:' . implode(',', OrderController::STATUSES),
        ]);

        $order = Order::findOrFail($id);
        $order->status = $request->status;
        $order->save();
        $this->notifyCustomer($order);

        return response()->json([
            'message' => 'Order status updated.',
            'order' => $order->load(['items.product:id,name,image_url', 'user:id,name,email,phone,address']),
        ]);
    }

    private function notifyCustomer(Order $order): void
    {
        $user = User::find($order->user_id);
        if ($user) {
            try {
                $user->notify(new OrderStatusUpdated($order));
            } catch (\Throwable $e) {
                // A failed notification shouldn't block the admin's update
                report($e);
            }
        }
    }
}
