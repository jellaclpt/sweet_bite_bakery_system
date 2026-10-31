<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Notifications\OrderStatusUpdated;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// Who may call what. Every write and every personal record must be protected.
class SecurityTest extends TestCase
{
    use RefreshDatabase;

    private User $customer;
    private User $other;
    private User $admin;
    private Product $product;
    private Order $order;

    protected function setUp(): void
    {
        parent::setUp();
        $this->customer = User::factory()->create(['role' => 'user']);
        $this->other = User::factory()->create(['role' => 'user']);
        $this->admin = User::factory()->create(['role' => 'admin']);

        $cat = Category::create(['name' => 'Cake']);
        $this->product = Product::create(['name' => 'Ube Cake', 'category_id' => $cat->id, 'base_price' => 180, 'is_available' => true]);

        $this->order = Order::create([
            'user_id' => $this->customer->id, 'subtotal' => 180, 'total' => 180, 'deposit_amount' => 90,
            'status' => 'pending', 'payment_method' => 'cash', 'payment_status' => Order::PAYMENT_AWAITING_DEPOSIT,
            'fulfillment' => 'pickup', 'pickup_time' => '2030-01-10 10:00:00',
        ]);
    }

    private function productPayload(): array
    {
        return ['name' => 'Hacked', 'category_id' => $this->product->category_id, 'base_price' => 1, 'is_available' => '1'];
    }

    // ---- Products: anyone may read, only admins may change -------------------------------

    public function test_guests_and_customers_cannot_create_update_or_delete_products(): void
    {
        $this->postJson('/api/products', $this->productPayload())->assertUnauthorized();
        $this->postJson("/api/products/{$this->product->id}", $this->productPayload())->assertUnauthorized();
        $this->deleteJson("/api/products/{$this->product->id}")->assertUnauthorized();

        $this->actingAs($this->customer, 'sanctum');
        $this->postJson('/api/products', $this->productPayload())->assertForbidden();
        $this->putJson("/api/products/{$this->product->id}", $this->productPayload())->assertForbidden();
        $this->deleteJson("/api/products/{$this->product->id}")->assertForbidden();

        $this->assertDatabaseHas('products', ['id' => $this->product->id, 'name' => 'Ube Cake']);
        $this->assertSame(1, Product::count());
    }

    public function test_admin_can_manage_products_and_anyone_can_browse(): void
    {
        $this->getJson('/api/products')->assertOk()->assertJsonPath('data.0.name', 'Ube Cake');

        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/products', $this->productPayload())->assertCreated();
        $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/products/{$this->product->id}")->assertOk();
    }

    // ---- Orders --------------------------------------------------------------------------

    public function test_placing_an_order_requires_login_and_uses_the_logged_in_user(): void
    {
        $payload = [
            'user_id' => $this->other->id, // trying to place it as someone else
            'items' => [['product_id' => $this->product->id, 'quantity' => 1]],
            'fulfillment' => 'pickup',
            'pickup_time' => now('Asia/Manila')->addDays(2)->setTime(10, 0)->format('Y-m-d H:i:s'),
        ];

        $this->postJson('/api/orders', $payload)->assertUnauthorized();

        $res = $this->actingAs($this->customer, 'sanctum')->postJson('/api/orders', $payload)->assertCreated();
        $this->assertSame($this->customer->id, Order::find($res->json('order.id'))->user_id);
    }

    public function test_customers_only_see_their_own_orders(): void
    {
        $id = $this->order->id;

        $this->getJson("/api/orders/{$id}")->assertUnauthorized();
        $this->getJson("/api/orders/user/{$this->customer->id}")->assertUnauthorized();

        $this->actingAs($this->other, 'sanctum');
        $this->getJson("/api/orders/{$id}")->assertForbidden();
        $this->getJson("/api/orders/{$id}/status")->assertForbidden();
        $this->getJson("/api/orders/user/{$this->customer->id}")->assertForbidden();

        $this->actingAs($this->customer, 'sanctum');
        $this->getJson("/api/orders/{$id}")->assertOk();
        $this->getJson("/api/orders/user/{$this->customer->id}")->assertOk()->assertJsonCount(1);

        $this->actingAs($this->admin, 'sanctum')->getJson("/api/orders/{$id}")->assertOk();
    }

    public function test_only_admins_can_change_order_status_or_see_the_schedule(): void
    {
        $this->patchJson("/api/orders/{$this->order->id}/status", ['status' => 'completed'])->assertUnauthorized();
        $this->getJson('/api/orders/scheduled')->assertUnauthorized();

        $this->actingAs($this->customer, 'sanctum');
        $this->patchJson("/api/orders/{$this->order->id}/status", ['status' => 'completed'])->assertForbidden();
        $this->getJson('/api/orders/scheduled')->assertForbidden();

        $this->assertSame('pending', $this->order->fresh()->status);

        $this->actingAs($this->admin, 'sanctum')->getJson('/api/orders/scheduled')->assertOk();
    }

    public function test_nobody_can_mark_an_order_paid_without_the_admin_flow(): void
    {
        // The old /payments/{id} route marked any order "paid" with no login at all
        $this->postJson("/api/payments/{$this->order->id}", ['payment_method' => 'gcash']);
        $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/payments/{$this->order->id}", ['payment_method' => 'gcash']);

        $this->assertSame(Order::PAYMENT_AWAITING_DEPOSIT, $this->order->fresh()->payment_status);
    }

    // ---- Notifications --------------------------------------------------------------------

    public function test_notifications_are_private(): void
    {
        $this->customer->notify(new OrderStatusUpdated($this->order));
        $note = $this->customer->notifications()->first();

        $this->getJson("/api/notifications/{$this->customer->id}")->assertUnauthorized();

        $this->actingAs($this->other, 'sanctum');
        $this->getJson("/api/notifications/{$this->customer->id}")->assertForbidden();
        $this->patchJson("/api/notifications/{$note->id}/read")->assertNotFound();
        $this->assertNull($note->fresh()->read_at);

        $this->actingAs($this->customer, 'sanctum');
        $this->getJson("/api/notifications/{$this->customer->id}")->assertOk()->assertJsonCount(1);
        $this->patchJson("/api/notifications/{$note->id}/read")->assertOk();
        $this->assertNotNull($note->fresh()->read_at);
    }

    // ---- Errors are JSON, never HTML or a crash -------------------------------------------

    public function test_api_errors_come_back_as_json_even_without_an_accept_header(): void
    {
        // Profile routes sit outside the JSON middleware; without a token they used to 500
        $this->put('/api/profile/update', ['name' => 'x'])
            ->assertUnauthorized()
            ->assertJsonStructure(['message']);

        $this->actingAs($this->customer, 'sanctum');
        $this->get('/api/orders/999999')->assertNotFound()->assertJsonStructure(['message']);
    }
}
