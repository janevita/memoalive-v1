// ─────────────────────────────────────────────────────────────────────────────
// Memoalive — Core Types
// ─────────────────────────────────────────────────────────────────────────────

// ── Enums ─────────────────────────────────────────────────────────────────────

export type Genre =
  | 'adventure'
  | 'drama'
  | 'comedy'
  | 'romance'
  | 'coming-of-age'
  | 'documentary'

export type MediaType = 'photo' | 'video' | 'voice' | 'text'

export type GroupRole = 'owner' | 'admin' | 'member'

// MEvent = Memoalive Event (avoids conflict with DOM Event)

export type Visibility = 'group' | 'public'

export type ReactionType =
  | 'heart'
  | 'moved'
  | 'proud'
  | 'funny'
  | 'favourite'

// ── User ──────────────────────────────────────────────────────────────────────

export type Relationship =
  | 'mother' | 'father' | 'grandmother' | 'grandfather'
  | 'sister' | 'brother' | 'aunt' | 'uncle' | 'cousin'
  | 'daughter' | 'son' | 'granddaughter' | 'grandson'
  | 'partner' | 'friend' | 'other'

export interface FaceRef {
  url: string
  label?: string
  uploadedAt: string
}

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  bio?: string
  nickname?: string
  relationship?: string
  birthYear?: number
  hometown?: string
  faceRefs: FaceRef[]
  createdAt: string
  updatedAt: string
}

export interface UserProfile extends User {
  groupCount: number
  memoryCount: number
}

// ── Group People (non-registered family/friends) ──────────────────────────────

export interface GroupPerson {
  id: string
  groupId: string
  createdBy: string
  name: string
  nickname?: string
  relationship?: string
  birthYear?: number
  hometown?: string
  bio?: string
  avatarUrl?: string
  faceRefs: FaceRef[]
  profileId?: string          // Linked registered user (if they sign up)
  createdAt: string
  updatedAt: string
}

// ── Memory Tags ────────────────────────────────────────────────────────────────

export interface MemoryTag {
  id: string
  memoryId: string
  // One of these is set:
  profileId?: string
  groupPersonId?: string
  taggedBy: string
  isAiSuggested: boolean
  confirmedAt?: string
  createdAt: string
  // Resolved display info:
  name: string
  avatarUrl?: string
}

// ── Event ─────────────────────────────────────────────────────────────────────

export interface MEvent {
  id: string
  name: string
  description?: string
  coverUrl?: string
  inviteCode: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

export interface EventWithParticipants extends MEvent {
  members: EventParticipant[]
  memoryCount: number
  recentMemories: Memory[]
}

export interface EventParticipant {
  userId: string
  groupId: string
  role: GroupRole
  joinedAt: string
  user: Pick<User, 'id' | 'name' | 'avatarUrl'>
}

// Legacy aliases — kept for any remaining internal usage
/** @deprecated Use MEvent */
export type Group = MEvent
/** @deprecated Use EventParticipant */
export type GroupMember = EventParticipant
/** @deprecated Use EventWithParticipants */
export type GroupWithMembers = EventWithParticipants

// ── Memory ────────────────────────────────────────────────────────────────────

export interface Album {
  id: string
  groupId: string
  title: string
  description?: string
  coverUrl?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface AlbumWithPreview extends Album {
  memoryCount: number
  coverPhotos: string[]      // First few photo URLs for the mosaic thumbnail
}

export interface Memory {
  id: string
  groupId: string
  albumId?: string           // Optional — memory can belong to a group album
  authorId: string
  title: string
  content?: string           // Rich text / story body
  genre: Genre
  mediaType: MediaType
  location?: string
  takenAt?: string           // When the moment happened (not when it was posted)
  createdAt: string
  updatedAt: string
  isPublished: boolean
  visibility: Visibility
}

export interface MemoryWithDetails extends Memory {
  author: Pick<User, 'id' | 'name' | 'avatarUrl'>
  media: MediaItem[]
  cast: CastMember[]         // People tagged in this memory
  reactions: ReactionSummary[]
  commentCount: number
}

// ── Media ─────────────────────────────────────────────────────────────────────

export interface MediaItem {
  id: string
  memoryId: string
  url: string
  thumbnailUrl?: string
  type: MediaType
  caption?: string
  order: number
  durationSeconds?: number   // For video / voice
  transcription?: string     // AI-generated (voice memories)
  createdAt: string
}

// ── Cast ──────────────────────────────────────────────────────────────────────

export interface CastMember {
  userId: string
  memoryId: string
  taggedByUserId: string
  user: Pick<User, 'id' | 'name' | 'avatarUrl'>
}

// ── Reactions ─────────────────────────────────────────────────────────────────

export interface Reaction {
  id: string
  memoryId: string
  userId: string
  type: ReactionType
  createdAt: string
}

export interface ReactionSummary {
  type: ReactionType
  count: number
  hasReacted: boolean        // Whether current user has reacted with this type
}

// ── Comments ──────────────────────────────────────────────────────────────────

export interface Comment {
  id: string
  memoryId: string
  authorId: string
  content: string
  createdAt: string
  updatedAt: string
  author: Pick<User, 'id' | 'name' | 'avatarUrl'>
}

// ── Scrapbook ─────────────────────────────────────────────────────────────────

export interface Scrapbook {
  id:           string
  ownerId:      string
  title:        string
  description?: string
  coverUrl?:    string
  template:     string      // ScrapbookTemplateId — stored as text in DB
  shareToken:   string
  isShared:     boolean
  createdAt:    string
  updatedAt:    string
}

// ── Canvas element style ───────────────────────────────────────────────────────

export interface ElementStyle {
  fontSize?:        number    // px in 1200×848 canvas space
  color?:           string    // CSS color
  fontFamily?:      string
  fontWeight?:      string
  fontStyle?:       string
  textAlign?:       'left' | 'center' | 'right'
  backgroundColor?: string
  opacity?:         number
  // Photo-specific
  frameStyle?:      string    // 'none' | 'polaroid' | 'shadow' | 'vintage' | 'tape' | 'stamp' | 'dark'
}

// ── Canvas elements (positioned in 1200×848 logical pixel space) ──────────────

export interface CanvasElement {
  id:        string
  pageId:    string
  type:      'photo' | 'text' | 'sticker'
  content:   string          // photo URL | text string | emoji
  x:         number          // left edge in canvas px
  y:         number          // top edge in canvas px
  width:     number          // canvas px
  height:    number          // canvas px
  rotation:  number          // degrees
  zIndex:    number
  style:     ElementStyle
  createdAt: string
}

// ── Scrapbook pages ───────────────────────────────────────────────────────────

export interface ScrapbookPage {
  id:          string
  scrapbookId: string
  pageNumber:  number
  createdAt:   string
  elements:    CanvasElement[]
}

// ── Comments ──────────────────────────────────────────────────────────────────

export interface ScrapbookComment {
  id:           string
  scrapbookId:  string
  authorId?:    string
  authorName:   string
  content:      string
  createdAt:    string
}

// ── Scrapbook with full canvas data ──────────────────────────────────────────

export interface ScrapbookWithPages extends Scrapbook {
  pages:    ScrapbookPage[]
  comments: ScrapbookComment[]
}

// ── Legacy flat item list ─────────────────────────────────────────────────────

export interface ScrapbookItem {
  id:              string
  scrapbookId:     string
  url:             string
  caption?:        string
  sortOrder:       number
  sourceMemoryId?: string
  sourceEventId?:  string
  createdAt:       string
}

export interface ScrapbookWithItems extends Scrapbook {
  items: ScrapbookItem[]
}

// ── Scrapbook photo picker ─────────────────────────────────────────────────────

export interface PickablePhoto {
  url:            string
  thumbnailUrl?:  string
  eventId:        string
  eventName:      string
  memoryId:       string
  memoryTitle:    string
  takenAt?:       string
}

// ── Search ────────────────────────────────────────────────────────────────────

export interface SearchFilters {
  query?: string
  genre?: Genre
  personId?: string
  location?: string
  yearFrom?: number
  yearTo?: number
  groupId?: string
}

export interface SearchResult {
  memories: MemoryWithDetails[]
  total: number
  hasMore: boolean
}

// ── Invites ───────────────────────────────────────────────────────────────────

export interface EventInvite {
  eventId: string
  eventName: string
  invitedBy: Pick<User, 'id' | 'name' | 'avatarUrl'>
  token: string
  expiresAt: string
}

/** @deprecated Use EventInvite */
export type GroupInvite = EventInvite

// ── API Response wrappers ─────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T
  error: null
}

export interface ApiError {
  data: null
  error: {
    message: string
    code?: string
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ── Form schemas (used with Zod in components) ────────────────────────────────

export interface CreateEventForm {
  name: string
  description?: string
}

/** @deprecated Use CreateEventForm */
export type CreateGroupForm = CreateEventForm

export interface CreateMemoryForm {
  groupId: string
  title: string
  content?: string
  genre: Genre
  location?: string
  takenAt?: string
  castUserIds?: string[]
}

export interface LoginForm {
  email: string
  password: string
}

export interface SignupForm {
  name: string
  email: string
  password: string
}

// ── Journals ──────────────────────────────────────────────────────────────────

export type JournalBlockType = 'heading' | 'paragraph' | 'image' | 'quote' | 'divider'

export interface JournalBlockStyle {
  fontSize?:   number
  bold?:       boolean
  italic?:     boolean
  align?:      'left' | 'center' | 'right'
  color?:      string
}

export interface JournalBlock {
  id:         string
  chapterId:  string
  blockOrder: number
  blockType:  JournalBlockType
  content:    string
  imageUrl?:  string
  style:      JournalBlockStyle
  createdAt:  string
  updatedAt:  string
}

export interface JournalChapter {
  id:            string
  journalId:     string
  chapterNumber: number
  title:         string
  createdAt:     string
  blocks:        JournalBlock[]
}

export interface Journal {
  id:          string
  eventId:     string
  createdBy:   string
  subjectName: string
  subjectId?:  string
  title:       string
  coverColor:  string
  coverStyle:  string
  year:        number
  isPublic:    boolean
  createdAt:   string
  updatedAt:   string
}

export interface JournalWithChapters extends Journal {
  chapters: JournalChapter[]
}
