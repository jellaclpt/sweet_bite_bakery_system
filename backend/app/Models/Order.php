<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'subtotal', 'discount', 'shipping_fee', 'total',
        'deposit_amount', 'amount_paid',
        'status', 'payment_method', 'payment_status', 'fulfillment', 'pickup_time',
        'payment_reference', 'payment_proof_url', 'payment_submitted_at', 'payment_confirmed_at',
    ];

    // Payment statuses used by the deposit flow
    public const PAYMENT_AWAITING_DEPOSIT = 'awaiting_deposit';   // order placed, nothing sent yet
    public const PAYMENT_DEPOSIT_SUBMITTED = 'deposit_submitted'; // customer sent GCash proof
    public const PAYMENT_DEPOSIT_PAID = 'deposit_paid';           // admin confirmed the deposit
    public const PAYMENT_PAID = 'paid';                           // balance settled too

    // Money always comes back as a string with 2 decimals ("55.85"), whether the
    // order was just created or loaded from the database
    protected $casts = [
        'subtotal' => 'decimal:2',
        'discount' => 'decimal:2',
        'shipping_fee' => 'decimal:2',
        'total' => 'decimal:2',
        'deposit_amount' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'payment_submitted_at' => 'datetime',
        'payment_confirmed_at' => 'datetime',
    ];

    protected $appends = ['balance_due'];

    // What the customer still owes at pickup or delivery
    public function getBalanceDueAttribute(): string
    {
        return number_format(max(0, (float) $this->total - (float) $this->amount_paid), 2, '.', '');
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
