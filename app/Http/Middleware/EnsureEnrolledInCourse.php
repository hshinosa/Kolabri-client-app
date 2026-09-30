<?php

namespace App\Http\Middleware;

use App\Models\CourseStudent;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEnrolledInCourse
{
    /**
     * Guard student routes scoped to a {course} parameter: the session user
     * must hold a course_students row for that course, otherwise 404.
     *
     * Closes IDOR on material streaming, syllabus weeks, pre-read and other
     * course-scoped endpoints (local DB reads skip the core-api checks).
     */
    public function handle(Request $request, Closure $next): Response
    {
        $course = $request->route()->parameter('course');
        $userId = session('user')['id'] ?? null;

        if (is_string($course) && $course !== '' && is_string($userId)) {
            $enrolled = CourseStudent::query()
                ->where('course_id', $course)
                ->where('user_id', $userId)
                ->exists();

            if (! $enrolled) {
                abort(404);
            }
        }

        return $next($request);
    }
}
