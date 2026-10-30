<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;
use App\Notifications\OrderStatusUpdated;
use Carbon\Carbon;


class OrderController extends Controller
{
    // Order lifecycle: pending (awaiting deposit) -> confirmed -> preparing -> ready -> completed.
    // "processing" and "ready for pickup" are kept so older orders stay valid.
    public const STATUSES = [
        'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled',
        'processing', 'ready for pickup',
    ];

    // Place new order
    public function store(Request $request)
    {
        $request->validate([
            'user_id' => 'nullable|exists:users,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'fulfillment' => 'required|in:pickup,delivery',
            'pickup_time' => 'nullable|date|after:now',
            // Method the customer plans to use; the deposit itself is sent via GCash
            'payment_method' => 'nullable|string|in:gcash,cash'
        ]);

        if ($request->fulfillment === 'pickup' && $request->pickup_time) {
            $pickup = \Carbon\Carbon::parse($request->pickup_time);

            // Example bakery hours: 8 AM to 6 PM
            $open = $pickup->copy()->setTime(8, 0);
            $close = $pickup->copy()->setTime(18, 0);

            if ($pickup->lt($open) || $pickup->gt($close)) {
                return response()->json([
                    'message' => 'Pickup time must be within business hours (8 AM – 6 PM).'
                ], 422);
            }
        }


        // Calculate subtotal
        $subtotal = 0;
        foreach ($request->items as $item) {
            $product = Product::findOrFail($item['product_id']);
            $subtotal += $product->base_price * $item['quantity'];
        }

        $total = $subtotal; // (later you can add shipping/discounts)

        // Pre-orders are confirmed with an upfront deposit; the balance is paid at pickup or delivery
        $depositPercent = max(0, min(100, (int) config('bakery.deposit_percent')));
        $deposit = round($total * $depositPercent / 100, 2);

        // Create order
        $order = Order::create([
            'user_id' => $request->user_id,
            'subtotal' => $subtotal,
            'discount' => 0,
            'shipping_fee' => 0,
            'total' => $total,
            'deposit_amount' => $deposit,
            'amount_paid' => 0,
            'status' => 'pending',
            'payment_method' => $request->payment_method ?? 'gcash',
            'payment_status' => $deposit > 0 ? Order::PAYMENT_AWAITING_DEPOSIT : 'unpaid',
            'fulfillment' => $request->fulfillment,
            'pickup_time' => $request->pickup_time
        ]);

        // Attach order items
        foreach ($request->items as $item) {
            $product = Product::find($item['product_id']);

            $order->items()->create([
                'product_id' => $product->id,
                'product_name' => $product->name,
                'unit_price' => $product->base_price,
                'quantity' => $item['quantity'],
                'total_price' => $product->base_price * $item['quantity'],
                'customizations' => $item['customizations'] ?? null
            ]);
        }

        return response()->json([
            'message' => 'Order placed successfully!',
            'order' => $order->load('items')
        ], 201);
    }

    // Show full order details
    public function show($id)
    {
        $order = Order::with('items.product')->findOrFail($id);
        return response()->json($order);
    }

    // Track order status
    public function status($id)
    {
        $order = Order::findOrFail($id);
        return response()->json([
            'order_id' => $order->id,
            'status' => $order->status,
            'payment_status' => $order->payment_status
        ]);
    }

    // ✅ Update order status (admin use + sends notification)
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|string|in:' . implode(',', self::STATUSES)
        ]);

        $order = Order::findOrFail($id);
        $order->status = $request->status;
        $order->save();

        // 🔔 Send notification to user
        $user = User::find($order->user_id);
        if ($user) {
            $user->notify(new OrderStatusUpdated($order));
        }

        return response()->json([
            'message' => 'Order status updated and user notified.',
            'order' => $order
        ]);
    }
    public function scheduled()
    {
        $upcoming = Order::whereNotNull('pickup_time')
            ->where('pickup_time', '>', now())
            ->orderBy('pickup_time', 'asc')
            ->get(['id', 'user_id', 'fulfillment', 'pickup_time', 'status']);

        return response()->json($upcoming);
    }
    public function userOrders($user_id)
    {
        $orders = \App\Models\Order::where('user_id', $user_id)
            ->orderBy('created_at', 'desc')
            ->with('items.product:id,name,image_url')
            ->get();

        return response()->json($orders);
    }


}
