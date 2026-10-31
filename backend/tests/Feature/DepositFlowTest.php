<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DepositFlowTest extends TestCase
{
    use RefreshDatabase;

    private function makeProduct(float $price = 180): Product
    {
        $category = Category::create(['name' => 'Cake']);

        return Product::create([
            'name' => 'Ube Macapuno Cake',
            'category_id' => $category->id,
            'base_price' => $price,
            'is_available' => true,
        ]);
    }

    private function placeOrder(User $user, Product $product, int $qty = 2): Order
    {
        $res = $this->actingAs($user, 'sanctum')->postJson('/api/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => $qty]],
            'fulfillment' => 'delivery',
            'pickup_time' => now('Asia/Manila')->addDays(2)->setTime(10, 0)->format('Y-m-d H:i:s'),
            'payment_method' => 'gcash',
        ]);
        $res->assertCreated();

        return Order::findOrFail($res->json('order.id'));
    }

    public function test_new_order_requires_a_50_percent_deposit(): void
    {
        config(['bakery.deposit_percent' => 50]);
        $order = $this->placeOrder(User::factory()->create(), $this->makeProduct(180), 2);

        $this->assertEquals(360, (float) $order->total);
        $this->assertEquals(180, (float) $order->deposit_amount);
        $this->assertEquals(Order::PAYMENT_AWAITING_DEPOSIT, $order->payment_status);
        $this->assertSame('360.00', $order->balance_due);
    }

    public function test_payment_settings_are_public(): void
    {
        config(['bakery.deposit_percent' => 30, 'bakery.gcash_number' => '0917 123 4567']);

        $this->getJson('/api/payment-settings')
            ->assertOk()
            ->assertJson(['deposit_percent' => 30, 'gcash_number' => '0917 123 4567']);
    }

    public function test_customer_submits_proof_and_admin_confirms_then_marks_paid(): void
    {
        Storage::fake('public');
        $customer = User::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        $order = $this->placeOrder($customer, $this->makeProduct(180), 2);

        // Customer uploads GCash proof
        $this->actingAs($customer, 'sanctum')
            ->post("/api/orders/{$order->id}/deposit", [
                'payment_reference' => '1234567890123',
                'proof' => UploadedFile::fake()->image('gcash.jpg'),
            ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('order.payment_status', Order::PAYMENT_DEPOSIT_SUBMITTED);

        $order->refresh();
        $this->assertNotNull($order->payment_proof_url);
        Storage::disk('public')->assertExists('payment_proofs/' . basename($order->payment_proof_url));

        // Admin sees it and confirms the deposit
        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/orders')
            ->assertOk()
            ->assertJsonPath('0.id', $order->id)
            ->assertJsonPath('0.user.name', $customer->name);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$order->id}/payment", ['action' => 'confirm_deposit'])
            ->assertOk()
            ->assertJsonPath('order.payment_status', Order::PAYMENT_DEPOSIT_PAID)
            ->assertJsonPath('order.status', 'confirmed')
            ->assertJsonPath('order.balance_due', '180.00');

        // Balance collected on delivery
        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$order->id}/payment", ['action' => 'mark_paid'])
            ->assertOk()
            ->assertJsonPath('order.payment_status', Order::PAYMENT_PAID)
            ->assertJsonPath('order.balance_due', '0.00');

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'ready'])
            ->assertOk()
            ->assertJsonPath('order.status', 'ready');
    }

    public function test_rejected_proof_returns_order_to_awaiting_deposit(): void
    {
        Storage::fake('public');
        $customer = User::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        $order = $this->placeOrder($customer, $this->makeProduct());

        $this->actingAs($customer, 'sanctum')->post("/api/orders/{$order->id}/deposit", [
            'payment_reference' => 'WRONG',
            'proof' => UploadedFile::fake()->image('gcash.png'),
        ], ['Accept' => 'application/json'])->assertOk();

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$order->id}/payment", ['action' => 'reject_deposit'])
            ->assertJsonPath('order.payment_status', Order::PAYMENT_AWAITING_DEPOSIT);
    }

    public function test_customer_cannot_pay_for_someone_elses_order(): void
    {
        Storage::fake('public');
        $order = $this->placeOrder(User::factory()->create(), $this->makeProduct());

        $this->actingAs(User::factory()->create(), 'sanctum')
            ->post("/api/orders/{$order->id}/deposit", [
                'payment_reference' => '123',
                'proof' => UploadedFile::fake()->image('gcash.jpg'),
            ], ['Accept' => 'application/json'])
            ->assertForbidden();
    }

    public function test_non_admin_cannot_use_admin_order_endpoints(): void
    {
        $customer = User::factory()->create();
        $order = $this->placeOrder($customer, $this->makeProduct());

        $this->actingAs($customer, 'sanctum')->getJson('/api/admin/orders')->assertForbidden();
        $this->actingAs($customer, 'sanctum')
            ->patchJson("/api/admin/orders/{$order->id}/payment", ['action' => 'mark_paid'])
            ->assertForbidden();
    }
}
