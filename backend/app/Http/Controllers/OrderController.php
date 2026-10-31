<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    // Order lifecycle: pending (awaiting deposit) -> confirmed -> preparing -> ready -> completed.
    // "processing" and "ready for pickup" are kept so older orders stay valid.
    public const STATUSES = [
        'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled',
        'processing', 'ready for pickup',
    ];

    // POST /orders (signed in). The order always belongs to the signed-in user;
    // any user_id sent by the browser is ignored.
    public function store(Request $request)
    {
        $maxQty = (int) config('bakery.max_quantity');

        $request->validate([
            'items' => 'required|array|min:1|max:50',
            'items.*.product_id' => 'required|integer|distinct|exists:products,id',
            'items.*.quantity' => "required|integer|min:1|max:{$maxQty}",
            'items.*.customizations' => 'nullable|array',
            'fulfillment' => 'required|in:pickup,delivery',
            'pickup_time' => 'required|date_format:Y-m-d H:i:s',
            // How the customer plans to pay the balance; the deposit itself is sent via GCash
            'payment_method' => 'nullable|string|in:gcash,cash',
        ], [
            'items.*.product_id.distinct' => 'The same product is in the cart twice.',
            'pickup_time.required' => 'Please choose a pickup or delivery date and time.',
        ]);

        $schedule = $this->validatedSchedule($request->pickup_time);

        $products = Product::whereIn('id', collect($request->items)->pluck('product_id'))->get()->keyBy('id');

        $unavailable = $products->where('is_available', false)->pluck('name');
        if ($unavailable->isNotEmpty()) {
            throw ValidationException::withMessages([
                'items' => ['No longer available: ' . $unavailable->join(', ') . '. Please remove it from your cart.'],
            ]);
        }

        // Work in centavos so totals never pick up floating-point cents
        $lines = collect($request->items)->map(function ($item) use ($products) {
            $product = $products[$item['product_id']];
            $unitCents = (int) round($product->base_price * 100);

            return [
                'product' => $product,
                'quantity' => (int) $item['quantity'],
                'unit_cents' => $unitCents,
                'total_cents' => $unitCents * (int) $item['quantity'],
                'customizations' => $item['customizations'] ?? null,
            ];
        });

        $totalCents = $lines->sum('total_cents');
        $depositPercent = max(0, min(100, (int) config('bakery.deposit_percent')));
        $depositCents = (int) round($totalCents * $depositPercent / 100);

        $order = DB::transaction(function () use ($request, $lines, $totalCents, $depositCents, $schedule) {
            $order = Order::create([
                'user_id' => $request->user()->id,
                'subtotal' => $totalCents / 100,
                'discount' => 0,
                'shipping_fee' => 0,
                'total' => $totalCents / 100,
                'deposit_amount' => $depositCents / 100,
                'amount_paid' => 0,
                'status' => 'pending',
                'payment_method' => $request->payment_method ?? 'cash',
                'payment_status' => $depositCents > 0 ? Order::PAYMENT_AWAITING_DEPOSIT : 'unpaid',
                'fulfillment' => $request->fulfillment,
                'pickup_time' => $schedule->format('Y-m-d H:i:s'),
            ]);

            foreach ($lines as $line) {
                $order->items()->create([
                    'product_id' => $line['product']->id,
                    'product_name' => $line['product']->name,
                    'unit_price' => $line['unit_cents'] / 100,
                    'quantity' => $line['quantity'],
                    'total_price' => $line['total_cents'] / 100,
                    'customizations' => $line['customizations'],
                ]);
            }

            return $order;
        });

        return response()->json([
            'message' => 'Order placed successfully!',
            'order' => $order->load('items.product:id,name,image_url'),
        ], 201);
    }

    // GET /orders/{id} (owner or admin)
    public function show(Request $request, $id)
    {
        $order = Order::with('items.product:id,name,image_url')->findOrFail($id);
        $this->authorizeOwner($request, $order);

        return response()->json($order);
    }

    // GET /orders/{id}/status (owner or admin)
    public function status(Request $request, $id)
    {
        $order = Order::findOrFail($id);
        $this->authorizeOwner($request, $order);

        return response()->json([
            'order_id' => $order->id,
            'status' => $order->status,
            'payment_status' => $order->payment_status,
        ]);
    }

    // GET /orders/scheduled (admin): upcoming pickups and deliveries, soonest first
    public function scheduled()
    {
        $now = now(config('bakery.timezone'))->format('Y-m-d H:i:s');

        $upcoming = Order::with('user:id,name,phone')
            ->whereNotNull('pickup_time')
            ->where('pickup_time', '>', $now)
            ->where('status', '!=', 'cancelled')
            ->orderBy('pickup_time')
            ->get(['id', 'user_id', 'fulfillment', 'pickup_time', 'status', 'payment_status']);

        return response()->json($upcoming);
    }

    // GET /orders/user/{user_id} (that user, or an admin)
    public function userOrders(Request $request, $user_id)
    {
        if ((int) $user_id !== (int) $request->user()->id && !$request->user()->isAdmin()) {
            abort(403, 'You can only view your own orders.');
        }

        $orders = Order::where('user_id', $user_id)
            ->orderByDesc('created_at')
            ->with('items.product:id,name,image_url')
            ->get();

        return response()->json($orders);
    }

    private function authorizeOwner(Request $request, Order $order): void
    {
        $user = $request->user();

        if ((int) $order->user_id !== (int) $user->id && !$user->isAdmin()) {
            abort(403, 'You can only view your own orders.');
        }
    }

    // The time must be in the future (bakery's local time) and within opening hours
    private function validatedSchedule(string $value): Carbon
    {
        $tz = config('bakery.timezone');
        $open = (int) config('bakery.open_hour');
        $close = (int) config('bakery.close_hour');

        $when = Carbon::createFromFormat('Y-m-d H:i:s', $value, $tz);

        if ($when->lte(now($tz))) {
            throw ValidationException::withMessages([
                'pickup_time' => ['Please choose a date and time in the future.'],
            ]);
        }

        $minutes = $when->hour * 60 + $when->minute;
        if ($minutes < $open * 60 || $minutes > $close * 60) {
            $label = fn (int $h) => Carbon::createFromTime($h)->format('g A');
            throw ValidationException::withMessages([
                'pickup_time' => ["We're open {$label($open)} to {$label($close)}. Please choose a time in that range."],
            ]);
        }

        return $when;
    }
}
