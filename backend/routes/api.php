<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AdminOrderController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DepositController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProfileController;
use App\Http\Middleware\ForceJsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
| Sweet Bite API
|
| Three levels of access:
|   public          - browsing the menu, signing in
|   auth:sanctum    - a signed-in customer (or admin), only ever sees their own data
|   admin           - managing products and orders
|
| Every route answers in JSON (see bootstrap/app.php).
*/

Route::middleware(ForceJsonResponse::class)->group(function () {

    // ---------------------------------------------------------------- public
    Route::get('/ping', fn () => response()->json(['message' => 'API is working!']));

    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{id}', [ProductController::class, 'show'])->whereNumber('id');
    Route::get('/payment-settings', [DepositController::class, 'settings']);

    Route::middleware('throttle:auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/auth/google', [AuthController::class, 'google']);
    });

    // ---------------------------------------------------------------- signed in
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/user', fn (Request $request) => $request->user());
        Route::post('/logout', [AuthController::class, 'logout']);

        // The frontend sends multipart forms as POST with _method=PUT, which Laravel treats as PUT
        Route::put('/profile/update', [ProfileController::class, 'update']);
        Route::put('/profile/change-password', [ProfileController::class, 'changePassword']);

        Route::post('/orders', [OrderController::class, 'store']);
        Route::get('/orders/user/{user_id}', [OrderController::class, 'userOrders'])->whereNumber('user_id');
        Route::get('/orders/{id}', [OrderController::class, 'show'])->whereNumber('id');
        Route::get('/orders/{id}/status', [OrderController::class, 'status'])->whereNumber('id');
        Route::post('/orders/{id}/deposit', [DepositController::class, 'submit'])
            ->whereNumber('id')
            ->middleware('throttle:uploads');

        Route::get('/notifications/{user_id}', [NotificationController::class, 'index'])->whereNumber('user_id');
        Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);

        // ------------------------------------------------------------ admin only
        Route::middleware('admin')->group(function () {
            Route::post('/products', [ProductController::class, 'store']);
            Route::post('/products/{id}', [ProductController::class, 'update'])->whereNumber('id');
            Route::put('/products/{id}', [ProductController::class, 'update'])->whereNumber('id');
            Route::delete('/products/{id}', [ProductController::class, 'destroy'])->whereNumber('id');

            Route::get('/orders/scheduled', [OrderController::class, 'scheduled']);
            // Older status endpoint, kept for compatibility; the admin Orders page uses /admin/orders/{id}/status
            Route::patch('/orders/{id}/status', [AdminOrderController::class, 'updateStatus'])->whereNumber('id');

            Route::prefix('admin')->group(function () {
                Route::get('/dashboard', [AdminController::class, 'dashboard']);
                Route::get('/orders', [AdminOrderController::class, 'index']);
                Route::patch('/orders/{id}/payment', [AdminOrderController::class, 'updatePayment'])->whereNumber('id');
                Route::patch('/orders/{id}/status', [AdminOrderController::class, 'updateStatus'])->whereNumber('id');
            });
        });
    });
});
