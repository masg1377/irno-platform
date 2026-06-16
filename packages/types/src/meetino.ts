import type {
  MeetinoMeetingSourceType,
  MeetinoMeetingStatus,
  MeetinoParticipantType,
} from './enums.js'

// ── Meetino Meeting Reference ─────────────────────────────────

export interface MeetinoMeetingReferenceDto {
  id: string
  sourceType: MeetinoMeetingSourceType
  sourceId: string
  meetinoMeetingId: string | null
  meetinoSlug: string | null
  title: string
  joinUrl: string
  hostUrl: string | null
  status: MeetinoMeetingStatus
  startsAt: string | null
  endsAt: string | null
  createdById: string
  lastSyncedAt: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

// ── Meetino Attendance Record ─────────────────────────────────

export interface MeetinoAttendanceRecordDto {
  id: string
  referenceId: string
  meetinoParticipantId: string | null
  userId: string | null
  studentId: string | null
  displayName: string
  participantType: MeetinoParticipantType
  joinedAt: string | null
  leftAt: string | null
  durationSeconds: number | null
  wasGuest: boolean
  createdAt: string
}

// ── Integration Status ────────────────────────────────────────

export interface MeetinoIntegrationStatusDto {
  enabled: boolean
  webUrlConfigured: boolean
  apiUrlConfigured: boolean
  apiKeyConfigured: boolean
  lastCheck: string | null
  connectionOk: boolean | null
}

// ── Request / Response shapes ─────────────────────────────────

export interface AttachMeetinoMeetingDto {
  title?: string
  startsAt?: string
  manualJoinUrl?: string
  createInMeetino: boolean
}

export interface UpdateMeetinoReferenceDto {
  title?: string
  joinUrl?: string
  status?: MeetinoMeetingStatus
  startsAt?: string
  endsAt?: string
}

export interface MeetinoSyncResultDto {
  synced: boolean
  message: string
  attendanceCount: number
  lastSyncedAt: string | null
}

export interface MeetinoConnectionTestDto {
  ok: boolean
  message: string
  latencyMs: number | null
}
