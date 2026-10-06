<?php

namespace App\Services;

use App\Models\CourseWeek;
use Illuminate\Support\Facades\DB;

class CourseWeekIndexService
{
    public static function renumberForCourse(string $courseId): void
    {
        $weeks = CourseWeek::where('course_id', $courseId)
            ->orderBy('sort_order')
            ->orderBy('created_at')
            ->get();

        DB::transaction(function () use ($weeks) {
            // Dua fase: unique(course_id, week_index) membuat update langsung bisa
            // bentrok saat dua minggu bertukar posisi (temuan E2E reorder 2026-10-06).
            // Fase 1: pindahkan semua ke slot sementara negatif dulu.
            $index = 1;
            foreach ($weeks as $week) {
                if ((int) $week->week_index !== -$index) {
                    $week->update(['week_index' => -$index]);
                }
                $index++;
            }
            // Fase 2: tulis indeks final.
            $index = 1;
            foreach ($weeks as $week) {
                $week->update(['week_index' => $index]);
                $index++;
            }
        });
    }

    public static function nextSortOrder(string $courseId): int
    {
        return ((int) CourseWeek::where('course_id', $courseId)->max('sort_order')) + 1;
    }
}
