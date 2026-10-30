<?php

use Illuminate\Http\Request;
use App\Http\Middleware\ForceJsonResponse;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DepositController;
use App\Http\Controllers\AdminOrderController;

// Pickup/Deliveries
Route::get('/orders/scheduled', [OrderController::class, 'scheduled']);

Route::middleware([ForceJsonResponse::class])->group(function () {
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{id}', [ProductController::class, 'show']);
    Route::post('/products', [ProductController::class, 'store'])
        ->withoutMiddleware([\App\Http\Middleware\ForceJsonResponse::class]);
    Route::post('/products/{id}', [ProductController::class, 'update']);
    Route::put('/products/{id}', [ProductController::class, 'update']);
    Route::delete('/products/{id}', [ProductController::class, 'destroy']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::get('/orders/{id}', [OrderController::class, 'show']);
    Route::get('/orders/{id}/status', [OrderController::class, 'status']);
    Route::patch('/orders/{id}/status', [OrderController::class, 'updateStatus']);

    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/auth/google', [AuthController::class, 'google']);

    // Where and how much to pay for a pre-order deposit
    Route::get('/payment-settings', [DepositController::class, 'settings']);

    Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
        Route::get('/dashboard', [\App\Http\Controllers\AdminController::class, 'dashboard']);
        Route::get('/orders', [AdminOrderController::class, 'index']);
        Route::patch('/orders/{id}/payment', [AdminOrderController::class, 'updatePayment']);
        Route::patch('/orders/{id}/status', [AdminOrderController::class, 'updateStatus']);
    });

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/user', function (Request $request) {
            return $request->user();
        });

        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

// Deposit proof upload (multipart) - outside ForceJsonResponse, like product uploads
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/orders/{id}/deposit', [DepositController::class, 'submit']);
});

// Profile routes - OUTSIDE the ForceJsonResponse middleware
Route::middleware('auth:sanctum')->group(function () {
    Route::put('/profile/update', [ProfileController::class, 'update']);
    Route::put('/profile/change-password', [ProfileController::class, 'changePassword']);
});

Route::get('/ping', fn() => response()->json(['message' => 'API is working!']));

Route::post('/payments/{order_id}', [PaymentController::class, 'processPayment']);

Route::get('/notifications/{user_id}', [NotificationController::class, 'index']);
Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);

Route::get('/orders/user/{user_id}', [OrderController::class, 'userOrders']);
?>