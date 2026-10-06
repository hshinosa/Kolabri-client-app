<?php

namespace App\Http\Controllers;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Log;

class GroupMemberManagementController extends Controller
{

    public function destroy(string $group, string $member)
    {
        try {
            $response = $this->apiRequest()->delete(
                $this->apiUrl() . "/api/groups/{$group}/members/{$member}"
            );

            return $this->proxyResponse($response);
        } catch (ConnectionException $e) {
            Log::error('Member removal failed', [
                'group' => $group,
                'member' => $member,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Gagal menghapus anggota',
            ], 500);
        } catch (RequestException $e) {
            Log::error('Member removal failed', [
                'group' => $group,
                'member' => $member,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Gagal menghapus anggota',
            ], 500);
        }
    }

    public function leave(string $group)
    {
        try {
            $response = $this->apiRequest()->post(
                $this->apiUrl() . "/api/groups/{$group}/leave"
            );

            return $this->proxyResponse($response);
        } catch (ConnectionException $e) {
            Log::error('Leave group failed', [
                'group' => $group,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Gagal keluar dari grup',
            ], 500);
        } catch (RequestException $e) {
            Log::error('Leave group failed', [
                'group' => $group,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Gagal keluar dari grup',
            ], 500);
        }
    }
}
