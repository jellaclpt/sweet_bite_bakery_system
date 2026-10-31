<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    /**
     * Get all categories
     * Auto-creates default categories if none exist
     */
    public function index()
    {
        // The seeder adds the default categories on deploy; this only fills an empty table
        // (e.g. a fresh database) instead of writing to the database on every request.
        if (!Category::exists()) {
            foreach (['Cake', 'Bread', 'Pastry', 'Cupcake', 'Cookies'] as $name) {
                Category::firstOrCreate(['name' => $name]);
            }
        }

        return response()->json(Category::orderBy('name')->get());
    }
}
