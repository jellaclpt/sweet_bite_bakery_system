<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;


class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'username',
        'email',
        'google_id',
        'password',
        'phone',
        'address',
        'image_url',
        'role',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'google_id',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    // Sent with the user so the website knows whether to show "Set Password" or "Change Password"
    protected $appends = ['has_password'];

    // False for accounts created with Google that haven't chosen a password yet
    public function getHasPasswordAttribute(): bool
    {
        return !empty($this->attributes['password'] ?? null);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    // Emails are compared in lowercase everywhere (PostgreSQL treats "A@x.com" and "a@x.com" as different)
    protected function email(): \Illuminate\Database\Eloquent\Casts\Attribute
    {
        return \Illuminate\Database\Eloquent\Casts\Attribute::make(
            set: fn ($value) => is_string($value) ? strtolower(trim($value)) : $value,
        );
    }

    // Usernames are stored in lowercase, so "Carmen" and "carmen" are the same account
    protected function username(): \Illuminate\Database\Eloquent\Casts\Attribute
    {
        return \Illuminate\Database\Eloquent\Casts\Attribute::make(
            set: fn ($value) => is_string($value) ? strtolower(trim($value)) : $value,
        );
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
