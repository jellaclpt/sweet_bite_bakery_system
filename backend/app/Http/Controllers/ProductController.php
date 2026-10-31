<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Support\PublicFiles;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    // GET /products?search=&category=&per_page=&page=
    // Public. Returns Laravel pagination: { data: [...], current_page, last_page, total, ... }
    public function index(Request $request)
    {
        $request->validate([
            'per_page' => 'nullable|integer|min:1|max:100',
            'page' => 'nullable|integer|min:1',
        ]);

        $query = Product::with('category')->orderBy('name');

        // Category filter by name, case-insensitive ("cake" matches "Cake")
        $category = trim((string) $request->query('category', ''));
        if ($category !== '' && strtolower($category) !== 'all') {
            $query->whereHas('category', fn ($q) => $q->whereRaw('LOWER(name) = ?', [strtolower($category)]));
        }

        // Name search, case-insensitive on both SQLite and PostgreSQL
        $search = trim((string) $request->query('search', ''));
        if ($search !== '') {
            $like = '%' . addcslashes(strtolower($search), '%_\\') . '%';
            $query->whereRaw('LOWER(name) LIKE ?', [$like]);
        }

        // The whole menu fits on one page by default (it used to stop at 10 products)
        return response()->json($query->paginate((int) $request->query('per_page', 100)));
    }

    // GET /products/{id}
    public function show($id)
    {
        return response()->json(Product::with('category')->findOrFail($id));
    }

    // POST /products (admin, multipart)
    public function store(Request $request)
    {
        $validated = $request->validate($this->rules());

        $product = Product::create([
            'name' => trim($validated['name']),
            'category_id' => $validated['category_id'],
            'base_price' => $validated['base_price'],
            'is_available' => $request->boolean('is_available'),
            'description' => $validated['description'] ?? null,
            'image_url' => $request->hasFile('image') ? PublicFiles::store($request->file('image'), 'products') : null,
        ]);

        return response()->json([
            'message' => 'Product created successfully',
            'data' => $product->load('category'),
        ], 201);
    }

    // POST or PUT /products/{id} (admin, multipart). Send delete_image=1 to remove the photo.
    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);
        $validated = $request->validate($this->rules());

        if ($request->hasFile('image')) {
            PublicFiles::delete($product->image_url);
            $product->image_url = PublicFiles::store($request->file('image'), 'products');
        } elseif ($request->boolean('delete_image')) {
            PublicFiles::delete($product->image_url);
            $product->image_url = null;
        }

        $product->name = trim($validated['name']);
        $product->category_id = $validated['category_id'];
        $product->base_price = $validated['base_price'];
        $product->is_available = $request->boolean('is_available');
        $product->description = $validated['description'] ?? null;
        $product->save();

        return response()->json([
            'message' => 'Product updated successfully',
            'data' => $product->fresh('category'),
        ]);
    }

    // DELETE /products/{id} (admin). Past orders keep the item's name and price.
    public function destroy($id)
    {
        $product = Product::findOrFail($id);

        PublicFiles::delete($product->image_url);
        $product->delete();

        return response()->json(['message' => 'Product deleted successfully']);
    }

    private function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'category_id' => 'required|integer|exists:categories,id',
            'base_price' => 'required|numeric|min:0|max:1000000',
            'is_available' => 'required|boolean',
            'description' => 'nullable|string|max:2000',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'delete_image' => 'nullable|boolean',
        ];
    }
}
