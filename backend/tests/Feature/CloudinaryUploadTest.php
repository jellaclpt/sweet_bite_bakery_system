<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Support\Cloudinary;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

// Uploads go to Cloudinary when CLOUDINARY_URL is set. Cloudinary's API is faked here;
// the request format and signature follow https://cloudinary.com/documentation/authentication_signatures
class CloudinaryUploadTest extends TestCase
{
    use RefreshDatabase;

    private const SECRET = 'test-secret';
    private int $uploads = 0;
    private bool $cloudinaryDown = false;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        config(['services.cloudinary.url' => 'cloudinary://123456789:' . self::SECRET . '@sweetbite-demo']);

        Http::fake([
            'api.cloudinary.com/v1_1/sweetbite-demo/image/upload' => function (HttpRequest $request) {
                if ($this->cloudinaryDown) {
                    return Http::response(['error' => ['message' => 'Invalid Signature']], 401);
                }
                $this->uploads++;
                $folder = collect($request->data())->firstWhere('name', 'folder')['contents'];
                $id = "{$folder}/img{$this->uploads}";

                return Http::response([
                    'public_id' => $id,
                    'secure_url' => "https://res.cloudinary.com/sweetbite-demo/image/upload/v17000000{$this->uploads}/{$id}.jpg",
                ]);
            },
            'api.cloudinary.com/v1_1/sweetbite-demo/image/destroy' => Http::response(['result' => 'ok']),
        ]);
    }

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    private function productFields(): array
    {
        return ['name' => 'Ube Cake', 'category_id' => Category::create(['name' => 'Cake'])->id, 'base_price' => 180, 'is_available' => '1'];
    }

    public function test_signature_matches_cloudinarys_documented_examples(): void
    {
        $this->assertSame('a21ad0f63beb4de2e5575204b79ab90bffb02c10', Cloudinary::signature(['timestamp' => 1315060510], 'abcd'));

        $this->assertSame('bfd09f95f331f558cbd1320e67aa8d488770583e', Cloudinary::signature([
            'timestamp' => 1315060510,
            'public_id' => 'sample_image',
            'eager' => 'w_400,h_300,c_pad|w_260,h_200,c_crop',
            'api_key' => 'never-signed',
            'file' => 'never-signed',
        ], 'abcd'));
    }

    public function test_product_photo_is_uploaded_signed_and_served_optimized(): void
    {
        $res = $this->actingAs($this->admin(), 'sanctum')
            ->post('/api/products', $this->productFields() + ['image' => UploadedFile::fake()->image('cake.jpg', 2000, 1500)])
            ->assertCreated();

        $this->assertSame(
            'https://res.cloudinary.com/sweetbite-demo/image/upload/f_auto,q_auto/v170000001/sweet-bite/products/img1.jpg',
            $res->json('data.image_url'),
        );

        Http::assertSent(function (HttpRequest $request) {
            if (!str_ends_with($request->url(), '/image/upload')) {
                return false;
            }
            $fields = collect($request->data())->mapWithKeys(fn ($part) => [$part['name'] => $part['contents']]);

            $signed = $fields->only(['folder', 'timestamp', 'transformation'])->all();

            return $request->isMultipart()
                && $fields['folder'] === 'sweet-bite/products'
                && $fields['transformation'] === 'c_limit,h_1600,w_1600'
                && $fields['api_key'] === '123456789'
                && abs((int) $fields['timestamp'] - time()) < 60
                && $fields['signature'] === Cloudinary::signature($signed, self::SECRET)
                && $fields->has('file');
        });

        // Nothing touched the server disk
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_replacing_and_deleting_photos_cleans_up_cloudinary(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin, 'sanctum');
        $fields = $this->productFields();

        $id = $this->post('/api/products', $fields + ['image' => UploadedFile::fake()->image('a.jpg')])->json('data.id');
        $this->post("/api/products/{$id}", $fields + ['image' => UploadedFile::fake()->image('b.jpg')])
            ->assertOk()->assertJsonPath('data.image_url', fn ($url) => str_ends_with($url, '/sweet-bite/products/img2.jpg'));
        $this->deleteJson("/api/products/{$id}")->assertOk();

        $destroyed = Http::recorded(fn (HttpRequest $r) => str_ends_with($r->url(), '/image/destroy'))
            ->map(fn ($pair) => $pair[0]->data())
            ->values();

        $this->assertCount(2, $destroyed);
        $this->assertSame('sweet-bite/products/img1', $destroyed[0]['public_id']); // replaced
        $this->assertSame('sweet-bite/products/img2', $destroyed[1]['public_id']); // deleted with the product
        $this->assertSame(
            Cloudinary::signature(['public_id' => 'sweet-bite/products/img1', 'timestamp' => $destroyed[0]['timestamp'], 'invalidate' => 'true'], self::SECRET),
            $destroyed[0]['signature'],
        );
    }

    public function test_receipts_and_profile_photos_also_go_to_cloudinary(): void
    {
        $user = User::factory()->create(['image_url' => 'https://lh3.googleusercontent.com/a/photo']);
        $order = Order::create([
            'user_id' => $user->id, 'subtotal' => 100, 'total' => 100, 'deposit_amount' => 50, 'status' => 'pending',
            'payment_method' => 'cash', 'payment_status' => Order::PAYMENT_AWAITING_DEPOSIT, 'fulfillment' => 'pickup',
        ]);
        $this->actingAs($user, 'sanctum');

        $this->post("/api/orders/{$order->id}/deposit", ['payment_reference' => '1012', 'proof' => UploadedFile::fake()->image('r.png')])
            ->assertOk()->assertJsonPath('order.payment_proof_url', fn ($u) => str_contains($u, '/sweet-bite/payment_proofs/'));

        $this->post('/api/profile/update', ['_method' => 'PUT', 'name' => 'Carmen', 'image' => UploadedFile::fake()->image('me.jpg')])
            ->assertOk()->assertJsonPath('user.image_url', fn ($u) => str_contains($u, '/sweet-bite/profiles/'));

        // The old Google photo isn't ours, so nothing was sent to be deleted
        Http::assertNotSent(fn (HttpRequest $r) => str_ends_with($r->url(), '/image/destroy'));
    }

    public function test_if_cloudinary_is_down_nothing_is_lost(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin, 'sanctum');
        $fields = $this->productFields();
        $id = $this->post('/api/products', $fields + ['image' => UploadedFile::fake()->image('a.jpg')])->json('data.id');
        $before = Product::find($id)->image_url;

        $this->cloudinaryDown = true;

        // A new product isn't created half-way
        $this->post('/api/products', $fields + ['name' => 'Other', 'image' => UploadedFile::fake()->image('b.jpg')])
            ->assertStatus(502)
            ->assertJsonPath('message', "Couldn't save the image right now. Please try again.");
        $this->assertSame(1, Product::count());

        // An existing product keeps its old photo
        $this->post("/api/products/{$id}", $fields + ['image' => UploadedFile::fake()->image('c.jpg')])->assertStatus(502);
        $this->assertSame($before, Product::find($id)->image_url);
        Http::assertNotSent(fn (HttpRequest $r) => str_ends_with($r->url(), '/image/destroy'));
    }

    public function test_only_images_in_our_own_account_count_as_ours(): void
    {
        $this->assertSame('sweet-bite/products/abc', Cloudinary::publicIdFromUrl(
            'https://res.cloudinary.com/sweetbite-demo/image/upload/f_auto,q_auto/v1712/sweet-bite/products/abc.jpg'
        ));
        $this->assertSame('sweet-bite/products/abc', Cloudinary::publicIdFromUrl(
            'https://res.cloudinary.com/sweetbite-demo/image/upload/v1712/sweet-bite/products/abc.webp'
        ));
        $this->assertNull(Cloudinary::publicIdFromUrl('https://res.cloudinary.com/someone-else/image/upload/v1/x.jpg'));
        $this->assertNull(Cloudinary::publicIdFromUrl('https://sweet-bite.onrender.com/storage/products/abc.jpg'));
    }

    public function test_ping_shows_where_uploads_go_and_bad_settings_fall_back_safely(): void
    {
        $this->getJson('/api/ping')->assertJsonPath('uploads', 'cloudinary');

        // Pasted with the "CLOUDINARY_URL=" prefix still works
        config(['services.cloudinary.url' => 'CLOUDINARY_URL=cloudinary://1:2@sweetbite-demo']);
        $this->getJson('/api/ping')->assertJsonPath('uploads', 'cloudinary');

        foreach ([null, '', 'https://api.cloudinary.com', 'cloudinary://only-key@cloud'] as $bad) {
            config(['services.cloudinary.url' => $bad]);
            $this->getJson('/api/ping')->assertJsonPath('uploads', 'server-disk');
        }
    }
}
