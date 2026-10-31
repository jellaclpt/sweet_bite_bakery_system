<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class BackendBugsTest extends TestCase
{
    use RefreshDatabase;

    private Category $cake;

    protected function setUp(): void
    {
        parent::setUp();
        $this->cake = Category::create(['name' => 'Cake']);
    }

    private function product(string $name = 'Ube Cake', float $price = 180, bool $available = true): Product
    {
        return Product::create(['name' => $name, 'category_id' => $this->cake->id, 'base_price' => $price, 'is_available' => $available]);
    }

    // A time the bakery is open, a couple of days ahead, in Manila time
    private function openSlot(int $hour = 10): string
    {
        return now('Asia/Manila')->addDays(2)->setTime($hour, 0)->format('Y-m-d H:i:s');
    }

    private function orderPayload(array $items, ?string $when = null): array
    {
        return ['items' => $items, 'fulfillment' => 'pickup', 'pickup_time' => $when ?? $this->openSlot()];
    }

    // ---- Orders --------------------------------------------------------------------------

    public function test_deleting_a_product_keeps_it_in_past_orders(): void
    {
        $user = User::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        $p = $this->product();

        $id = $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->orderPayload([['product_id' => $p->id, 'quantity' => 2]]))
            ->assertCreated()->json('order.id');

        $this->actingAs($admin, 'sanctum')->deleteJson("/api/products/{$p->id}")->assertOk();

        $this->actingAs($user, 'sanctum')->getJson("/api/orders/{$id}")
            ->assertOk()
            ->assertJsonCount(1, 'items')
            ->assertJsonPath('items.0.product_name', 'Ube Cake')
            ->assertJsonPath('items.0.product', null);
    }

    public function test_out_of_stock_products_cannot_be_ordered(): void
    {
        $user = User::factory()->create();
        $sold = $this->product('Ensaymada', 40, false);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->orderPayload([['product_id' => $sold->id, 'quantity' => 1]]))
            ->assertUnprocessable()
            ->assertJsonPath('errors.items.0', 'No longer available: Ensaymada. Please remove it from your cart.');

        $this->assertSame(0, Order::count());
    }

    public function test_pickup_time_uses_manila_time_and_opening_hours(): void
    {
        $user = User::factory()->create();
        $p = $this->product();
        $item = [['product_id' => $p->id, 'quantity' => 1]];
        $this->actingAs($user, 'sanctum');

        // An hour ago in Manila. Read as UTC it would look like the future and be accepted.
        $past = now('Asia/Manila')->subHour()->format('Y-m-d H:i:s');
        $this->postJson('/api/orders', $this->orderPayload($item, $past))
            ->assertUnprocessable()->assertJsonValidationErrors('pickup_time');

        $this->postJson('/api/orders', $this->orderPayload($item, $this->openSlot(6)))
            ->assertUnprocessable()
            ->assertJsonPath('errors.pickup_time.0', "We're open 8 AM to 6 PM. Please choose a time in that range.");

        // Delivery follows the same hours
        $this->postJson('/api/orders', ['fulfillment' => 'delivery'] + $this->orderPayload($item, $this->openSlot(21)))
            ->assertUnprocessable();

        $this->postJson('/api/orders', $this->orderPayload($item, $this->openSlot(18)))->assertCreated();
        $this->postJson('/api/orders', ['items' => $item, 'fulfillment' => 'pickup'])
            ->assertUnprocessable()->assertJsonValidationErrors('pickup_time');
    }

    public function test_totals_are_exact_and_deposit_rounds_to_the_centavo(): void
    {
        config(['bakery.deposit_percent' => 50]);
        $user = User::factory()->create();
        $a = $this->product('Pandesal', 0.10);
        $b = $this->product('Cupcake', 55.55);

        $order = $this->actingAs($user, 'sanctum')->postJson('/api/orders', $this->orderPayload([
            ['product_id' => $a->id, 'quantity' => 3],
            ['product_id' => $b->id, 'quantity' => 1],
        ]))->assertCreated()->json('order');

        $this->assertSame('55.85', $order['total']);
        $this->assertSame('27.93', $order['deposit_amount']); // 27.925 rounds up
        $this->assertSame('0.30', $order['items'][0]['total_price']);
    }

    public function test_cart_rejects_duplicates_and_absurd_quantities(): void
    {
        $user = User::factory()->create();
        $p = $this->product();
        $this->actingAs($user, 'sanctum');

        $this->postJson('/api/orders', $this->orderPayload([
            ['product_id' => $p->id, 'quantity' => 1], ['product_id' => $p->id, 'quantity' => 1],
        ]))->assertUnprocessable();

        $this->postJson('/api/orders', $this->orderPayload([['product_id' => $p->id, 'quantity' => 5000]]))
            ->assertUnprocessable();
    }

    // ---- Products --------------------------------------------------------------------------

    public function test_menu_is_not_cut_off_at_ten_products(): void
    {
        foreach (range(1, 15) as $i) {
            $this->product("Item {$i}", 10);
        }

        $this->getJson('/api/products')->assertOk()->assertJsonCount(15, 'data');
        $this->getJson('/api/products?per_page=5')->assertOk()->assertJsonCount(5, 'data')->assertJsonPath('total', 15);
    }

    public function test_search_and_category_filter_ignore_case(): void
    {
        $this->product('Ube Macapuno Cake');
        Product::create(['name' => 'Honey Bread', 'category_id' => Category::create(['name' => 'Bread'])->id, 'base_price' => 20, 'is_available' => true]);

        $this->getJson('/api/products?search=ube')->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Ube Macapuno Cake');
        $this->getJson('/api/products?category=bread')->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Honey Bread');
        $this->getJson('/api/products?search=%')->assertJsonCount(0, 'data');
    }

    public function test_uploaded_images_get_safe_random_names(): void
    {
        Storage::fake('public');
        $admin = User::factory()->create(['role' => 'admin']);

        $url = $this->actingAs($admin, 'sanctum')->post('/api/products', [
            'name' => 'Cake', 'category_id' => $this->cake->id, 'base_price' => 100, 'is_available' => '1',
            'image' => UploadedFile::fake()->image('my cake (final).png'),
        ])->assertCreated()->json('data.image_url');

        $this->assertMatchesRegularExpression('#/storage/products/[A-Za-z0-9]{40}\.png$#', $url);
        Storage::disk('public')->assertExists('products/' . basename($url));
    }

    public function test_replacing_a_product_photo_deletes_the_old_file(): void
    {
        Storage::fake('public');
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin, 'sanctum');
        $fields = ['name' => 'Cake', 'category_id' => $this->cake->id, 'base_price' => 100, 'is_available' => '0'];

        $res = $this->post('/api/products', $fields + ['image' => UploadedFile::fake()->image('a.jpg')])->assertCreated();
        $old = basename($res->json('data.image_url'));
        $id = $res->json('data.id');

        $new = $this->post("/api/products/{$id}", $fields + ['image' => UploadedFile::fake()->image('b.jpg')])
            ->assertOk()->assertJsonPath('data.is_available', false)->json('data.image_url');

        Storage::disk('public')->assertMissing('products/' . $old);
        Storage::disk('public')->assertExists('products/' . basename($new));
    }

    // ---- Accounts --------------------------------------------------------------------------

    public function test_email_case_does_not_create_duplicates_or_block_login(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Carmen', 'username' => 'carmen', 'email' => 'Carmen@Example.com', 'password' => 'secret123', 'password_confirmation' => 'secret123',
        ])->assertCreated()->assertJsonPath('user.email', 'carmen@example.com');

        $this->postJson('/api/register', [
            'name' => 'Again', 'username' => 'carmen2', 'email' => 'CARMEN@example.com', 'password' => 'secret123', 'password_confirmation' => 'secret123',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->postJson('/api/login', ['email' => ' CARMEN@EXAMPLE.COM ', 'password' => 'secret123'])->assertOk();
    }

    public function test_logging_in_is_rate_limited(): void
    {
        User::factory()->create(['email' => 'carmen@example.com', 'password' => Hash::make('right-password')]);

        foreach (range(1, 10) as $i) {
            $this->postJson('/api/login', ['email' => 'carmen@example.com', 'password' => 'wrong'])->assertUnprocessable();
        }

        $this->postJson('/api/login', ['email' => 'carmen@example.com', 'password' => 'right-password'])
            ->assertStatus(429);
    }

    public function test_logout_only_signs_out_this_device(): void
    {
        $user = User::factory()->create();
        $phone = $user->createToken('phone')->plainTextToken;
        $laptop = $user->createToken('laptop')->plainTextToken;

        $this->withToken($phone)->postJson('/api/logout')->assertOk();
        $this->app['auth']->forgetGuards();

        $this->withToken($laptop)->getJson('/api/user')->assertOk();
        $this->assertSame(1, $user->tokens()->count());
    }

    public function test_change_password_checks_the_old_one_and_signs_out_other_devices(): void
    {
        $user = User::factory()->create(['password' => Hash::make('old-password')]);
        $current = $user->createToken('current')->plainTextToken;
        $user->createToken('other-device');

        $this->withToken($current)->putJson('/api/profile/change-password', ['old_password' => 'nope', 'new_password' => 'new-password'])
            ->assertUnprocessable()->assertJsonPath('message', 'Current password is incorrect');

        $this->withToken($current)->putJson('/api/profile/change-password', ['old_password' => 'old-password', 'new_password' => 'new-password'])
            ->assertOk();

        $this->assertTrue(Hash::check('new-password', $user->fresh()->password));
        $this->assertSame(1, $user->tokens()->count());
    }

    public function test_profile_update_can_clear_fields_and_store_a_photo(): void
    {
        Storage::fake('public');
        $user = User::factory()->create(['phone' => '09170000000', 'address' => 'Old St.']);

        // The frontend sends multipart POST with _method=PUT and empty strings for cleared fields
        $res = $this->actingAs($user, 'sanctum')->post('/api/profile/update', [
            '_method' => 'PUT', 'name' => '  Carmen  ', 'phone' => '', 'address' => 'New St.',
            'image' => UploadedFile::fake()->image('me.jpg'),
        ])->assertOk();

        $res->assertJsonPath('user.name', 'Carmen')->assertJsonPath('user.phone', null)->assertJsonPath('user.address', 'New St.');
        Storage::disk('public')->assertExists('profiles/' . basename($res->json('user.image_url')));
    }

    // ---- Admin payments ---------------------------------------------------------------------

    public function test_payment_actions_only_apply_from_the_right_state(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $order = Order::create([
            'user_id' => User::factory()->create()->id, 'subtotal' => 100, 'total' => 100, 'deposit_amount' => 50,
            'status' => 'completed', 'payment_method' => 'cash', 'payment_status' => Order::PAYMENT_PAID, 'amount_paid' => 100,
            'fulfillment' => 'pickup',
        ]);
        $this->actingAs($admin, 'sanctum');

        // A fully paid order can't be pushed back to "deposit paid"
        $this->patchJson("/api/admin/orders/{$order->id}/payment", ['action' => 'confirm_deposit'])->assertUnprocessable();
        $this->patchJson("/api/admin/orders/{$order->id}/payment", ['action' => 'reject_deposit'])->assertUnprocessable();
        $this->assertSame(Order::PAYMENT_PAID, $order->fresh()->payment_status);

        // A cash deposit paid in person can be confirmed without a receipt upload
        $order->update(['payment_status' => Order::PAYMENT_AWAITING_DEPOSIT, 'amount_paid' => 0, 'status' => 'pending']);
        $this->patchJson("/api/admin/orders/{$order->id}/payment", ['action' => 'confirm_deposit'])
            ->assertOk()->assertJsonPath('order.amount_paid', '50.00');

        // Cancelled orders can't take payments
        $order->update(['status' => 'cancelled', 'payment_status' => Order::PAYMENT_AWAITING_DEPOSIT]);
        $this->patchJson("/api/admin/orders/{$order->id}/payment", ['action' => 'mark_paid'])->assertUnprocessable();
    }

    public function test_resubmitting_a_receipt_replaces_the_old_file(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $order = Order::create([
            'user_id' => $user->id, 'subtotal' => 100, 'total' => 100, 'deposit_amount' => 50, 'status' => 'pending',
            'payment_method' => 'cash', 'payment_status' => Order::PAYMENT_AWAITING_DEPOSIT, 'fulfillment' => 'pickup',
        ]);
        $this->actingAs($user, 'sanctum');

        $first = $this->post("/api/orders/{$order->id}/deposit", ['payment_reference' => '111', 'proof' => UploadedFile::fake()->image('a.png')])
            ->assertOk()->json('order.payment_proof_url');
        $second = $this->post("/api/orders/{$order->id}/deposit", ['payment_reference' => '222', 'proof' => UploadedFile::fake()->image('b.png')])
            ->assertOk()->json('order.payment_proof_url');

        Storage::disk('public')->assertMissing('payment_proofs/' . basename($first));
        Storage::disk('public')->assertExists('payment_proofs/' . basename($second));
    }

    // ---- Deploy seeding ----------------------------------------------------------------------

    public function test_live_seeding_never_creates_accounts_with_published_passwords(): void
    {
        $this->app['env'] = 'production';
        config(['bakery.admin_username' => null, 'bakery.admin_email' => null, 'bakery.admin_password' => null]);

        $this->artisan('db:seed', ['--class' => DatabaseSeeder::class, '--force' => true])->assertSuccessful();

        $this->assertSame(0, User::count());
        $this->assertSame(5, Category::count());
    }

    public function test_admin_comes_from_environment_and_leaked_accounts_get_locked(): void
    {
        $this->app['env'] = 'production';
        // What older deploys left on the live database
        User::create(['name' => 'Admin User', 'email' => 'admin@gmail.com', 'password' => Hash::make('admin12345'), 'role' => 'admin']);
        $test = User::create(['name' => 'Test', 'email' => 'test@gmail.com', 'password' => Hash::make('test12345'), 'role' => 'user']);
        $test->createToken('old');

        config(['bakery.admin_username' => 'Owner', 'bakery.admin_email' => 'Owner@SweetBite.ph', 'bakery.admin_password' => 'a-long-new-password']);
        $this->artisan('db:seed', ['--class' => DatabaseSeeder::class, '--force' => true])->assertSuccessful();

        $owner = User::where('email', 'owner@sweetbite.ph')->first();
        $this->assertTrue($owner->isAdmin());
        $this->assertTrue(Hash::check('a-long-new-password', $owner->password));

        $this->assertFalse(Hash::check('admin12345', User::where('email', 'admin@gmail.com')->first()->password));
        $this->assertFalse(Hash::check('test12345', $test->fresh()->password));
        $this->assertSame(0, $test->tokens()->count());

        // Running again on the next deploy changes nothing
        $hash = $owner->password;
        $this->artisan('db:seed', ['--class' => DatabaseSeeder::class, '--force' => true])->assertSuccessful();
        $this->assertSame($hash, $owner->fresh()->password);
    }

    public function test_setting_admin_password_resets_the_existing_admin(): void
    {
        $this->app['env'] = 'production';
        User::create(['name' => 'Admin User', 'email' => 'admin@gmail.com', 'password' => Hash::make('admin12345'), 'role' => 'admin']);

        config(['bakery.admin_email' => 'admin@gmail.com', 'bakery.admin_password' => 'short']);
        $this->artisan('db:seed', ['--class' => DatabaseSeeder::class, '--force' => true])->assertSuccessful();
        $this->assertTrue(Hash::check('admin12345', User::first()->password), 'weak passwords are refused');

        config(['bakery.admin_password' => Str::random(16) . 'Aa1']);
        $this->artisan('db:seed', ['--class' => DatabaseSeeder::class, '--force' => true])->assertSuccessful();
        $this->assertTrue(Hash::check(config('bakery.admin_password'), User::first()->password));
    }

    // ---- CORS ----------------------------------------------------------------------------

    public function test_vercel_previews_and_live_site_can_call_the_api(): void
    {
        foreach ([
            'https://sweet-bite-bakery-system.vercel.app',
            'https://sweet-bite-bakery-system-git-fix-clean-urls-jellas-projects.vercel.app',
        ] as $origin) {
            $this->withHeaders(['Origin' => $origin])->getJson('/api/ping')
                ->assertHeader('Access-Control-Allow-Origin', $origin);
        }

        $this->withHeaders(['Origin' => 'https://evil.example.com'])->getJson('/api/ping')
            ->assertHeaderMissing('Access-Control-Allow-Origin');
    }
}
