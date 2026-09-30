<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Enrollment rows owned by core-api (shared PostgreSQL).
 * Read-mostly: the BFF only checks existence for access control.
 */
class CourseStudent extends Model
{
    protected $table = 'course_students';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = ['id', 'course_id', 'user_id', 'enrolled_at'];
}
