<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Amount the customer must send upfront (e.g. 50% of the total)
            $table->decimal('deposit_amount', 10, 2)->default(0)->after('total');
            // Running total the admin has confirmed as received
            $table->decimal('amount_paid', 10, 2)->default(0)->after('deposit_amount');
            // GCash reference number and screenshot submitted by the customer
            $table->string('payment_reference', 100)->nullable()->after('payment_status');
            $table->string('payment_proof_url')->nullable()->after('payment_reference');
            $table->timestamp('payment_submitted_at')->nullable()->after('payment_proof_url');
            $table->timestamp('payment_confirmed_at')->nullable()->after('payment_submitted_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'deposit_amount',
                'amount_paid',
                'payment_reference',
                'payment_proof_url',
                'payment_submitted_at',
                'payment_confirmed_at',
            ]);
        });
    }
};
