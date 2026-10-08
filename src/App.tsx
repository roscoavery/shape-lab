/**
 * Shape Lab — main application shell
 *
 * Sections: Today | Practice | Videos | Learn | Team | More
 * Existing Version 1 tools remain mounted under the new navigation shell.
 * Shape standards: src/config/shapes.ts
 * Curriculum: src/config/curriculum.ts
 * Tasks 2 scripts: src/config/tasks2.ts
 * Sequences: src/config/sequences.ts
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AthletePanel } from './components/AthletePanel'
import { GymRecords } from './components/GymRecords'
import { AccountsDesk } from './components/AccountsDesk'
import { CollapsibleSection } from './components/CollapsibleSection'
import { ConsentDesk } from './components/ConsentDesk'
import { StillTagDesk } from './components/coach/StillTagDesk'
import { WatchDesk } from './components/WatchDesk'
import { AwayLockScreen, useAwayLock } from './components/AwayLockScreen'
import { FloorKioskBar } from './components/FloorKioskBar'
import { AuthLoginScreen } from './components/AuthLoginScreen'
import { GymBootScreen } from './components/GymBootScreen'
import { HOLD_BUILD_CHIP, HOLD_BUILD_LABEL } from './lib/holdBuild'
import { stashMobileSearchJump } from './lib/mobileSearchNav'
import { applyAppTheme, FAVORITE_COLORS } from './lib/profileTheme'
import { AppNav } from './components/AppNav'
import { IgMobileShell } from './components/mobile/IgMobileShell'
import { CameraStage } from './components/CameraStage'
import { CoachInbox } from './components/CoachInbox'
import { CoachShapeLibrary } from './components/coach/CoachShapeLibrary'
import { CompareErrorBoundary } from './components/compare/CompareErrorBoundary'
import { PanelErrorBoundary } from './components/PanelErrorBoundary'
import { ComparePanel } from './components/compare/ComparePanel'
import { EducationPanel } from './components/EducationPanel'
import type { PhoneReelClip } from './components/PhoneReelViewer'
import { CoachInterviewPanel } from './components/coach/CoachInterviewPanel'
import { VersionCheck } from './components/VersionCheck'
import { DrillLibraryPanel } from './components/DrillLibraryPanel'
import { SpottingPanel } from './components/learn/SpottingPanel'
import { ChatPanel } from './components/chat/ChatPanel'
import { HomeworkPanel } from './components/HomeworkPanel'
import { LogForPicker } from './components/homework/LogForPicker'
import { ProgressHistory } from './components/ProgressHistory'
import { ScorePanel } from './components/ScorePanel'
import { SequencePanel } from './components/SequencePanel'
import { ShapeSelector } from './components/ShapeSelector'
import { TaskTrainer } from './components/TaskTrainer'
import { Tasks2Panel } from './components/Tasks2Panel'
import { TasksWorkspace, type TaskLiveUi } from './components/TasksWorkspace'
import { OverlayStillProvider } from './components/OverlayStillContext'
import { ShapeCopyProvider } from './components/ShapeCopyContext'
import { StillCropProvider } from './components/StillCropContext'
import { StillOverlayPicker } from './components/StillOverlayPicker'
import { HomeDashboard } from './components/lesson/HomeDashboard'
import { CoachReminderBanners } from './components/today/CoachReminderBanners'
import { TourOfferButton } from './components/tour/TourOfferButton'
import { TODAY_COACH_TOUR, LEARN_TOUR, SCROLL_TOUR, PROFILE_TOUR, ATHLETE_HOME_TOUR } from './config/surfaceTours'
import { ClassStation } from './components/today/ClassStation'
import { ClassSession } from './components/today/ClassSession'
import { EndClassPrompt } from './components/today/EndClassPrompt'
import { NamesQuiz } from './components/coach/NamesQuiz'
import { SkillPathBuilder } from './components/coach/SkillPathBuilder'
import { CoachSetupWizard } from './components/coach/CoachSetupWizard'
import { MySystemPanel } from './components/coach/MySystemPanel'
import { ClassStopwatch } from './components/today/ClassStopwatch'
import { ClockOverlay } from './components/today/ClockOverlay'
import { ArcadeHub } from './components/arcade/ArcadeHub'
import { AthleteProfileCard } from './components/AthleteProfileCard'
import { ImproveNotesDock } from './components/ImproveNotesDock'
import { DeskPreviewPicker } from './components/DeskPreviewPicker'
import { loadDeskPreview, saveDeskPreview, type DeskPreview } from './lib/deskPreview'
import { TEST_PARENT, TEST_ATHLETE } from './lib/testParentFixture'
import { ParentWellnessDesk } from './components/family/ParentWellnessDesk'
import { ParentHome, ParentEducationDesk } from './components/family/ParentHome'
import { FamilyPracticeView } from './components/family/FamilyPracticeView'
import { AthleteChecklistView } from './components/today/AthleteChecklistView'
import { AthleteViewBar } from './components/family/AthleteViewBar'
import { ParentGateDialog } from './components/family/ParentGateDialog'
import { AthleteHome, AthleteProgress } from './components/family/AthleteHome'
import { AthleteFoundation } from './components/family/AthleteFoundation'
import { GlowTour, tourSeen, type TourStep } from './components/homework/GlowTour'

/** Full walkthrough: foundation → homework hub → stopwatch screen. */
function buildHwTourSteps(foundationVisible: boolean): TourStep[] {
  return [
    ...(foundationVisible
      ? [
          {
            target: 'hw-tour-foundation',
            title: 'Strengthen your foundation',
            text: 'This is the engine room. Swipe through why each exercise matters — then tap Start a challenge and beat your best. Tap the glowing card to continue.',
          } satisfies TourStep,
        ]
      : []),
    {
      target: 'hw-tour-train-now',
      title: 'Train now',
      text: 'Camera on. Start a hold or a drill from here — the camera watches your form while you work. Tap the glowing card to continue.',
    },
    {
      target: 'hw-tour-pick-drill',
      title: 'Pick a drill',
      text: 'Your coach\u2019s drills live here. Tap one to train it full screen — this is where your homework list lives. Tap the glowing card to continue.',
    },
    {
      target: 'hw-tour-stopwatch',
      title: 'No camera? Stopwatch',
      text: 'Time a hold or log reps and sets by hand. It still counts. Tap the glowing card to go there.',
      tapThrough: true,
    },
    {
      target: 'hw-tour-watch-start',
      title: 'Start the watch',
      text: 'Tap Start, do your hold, tap Stop. Your time drops straight into the log form below.',
    },
    {
      target: 'hw-tour-watch-quality',
      title: 'Rate it honestly',
      text: 'Slide your rep speed from fast to slow, tap your quality — low, medium, or high. Holds get a 1 to 5. Then Log set. You are set — tap Done, then train for real.',
    },
  ]
}
import { GestureBurstHost } from './components/GestureBurst'
import { addCoachNotesToAthletes } from './lib/athleteNotes'
import { logClassSkillForAthlete } from './lib/classSessionLog'
import { publishTextPostResult } from './lib/feedPosts'
import { ClipEditProvider } from './components/ClipWatchMeta'
import { NotifyBell } from './components/NotifyBell'
import { splitPersonName } from './lib/classStation'
import { appendShapeTest, rememberGuestGrade } from './lib/quizGrades'
import type { LearnIntent } from './components/EducationPanel'
import { LessonNoteBar } from './components/lesson/LessonNoteBar'
import { LessonWorkspace } from './components/lesson/LessonWorkspace'
import { TodayFloorCamera } from './components/today/TodayFloorCamera'
import { TodayDock } from './components/today/TodayDock'
import { ChalkboardPanel } from './components/today/ChalkboardPanel'
import { TodayCollages } from './components/today/TodayCollages'
import { TodayChalkboards } from './components/today/TodayChalkboards'
import { WarmupPanel } from './components/warmup/WarmupPanel'
import { UnlockAthleteModal } from './components/UnlockAthleteModal'
import { VideoLibraryPanel } from './components/VideoLibraryPanel'
import { ClassesPanel } from './components/classes/ClassesPanel'
import { FeedPanel } from './components/feed/FeedPanel'
import { StoryComposer } from './components/stories/StoryComposer'
import { NetworkPanel } from './components/network/NetworkPanel'
import { ResearchPanel } from './components/research/ResearchPanel'
import { GymLibraryProvider } from './lib/gymLibrary'
import { ClipLoopsProvider } from './lib/clipLoops'
import { VideoAdjustmentsProvider } from './lib/videoAdjustments'
import { FavoritesProvider } from './lib/favorites'
import { ProfilePeekProvider } from './components/ProfilePeekContext'
import type { IgCropDraft } from './components/compare/IgStillContext'
import { IgStillProvider } from './components/compare/IgStillContext'
import { SHAPES } from './config/shapes'
import { roundHoldSecondsUp, useHoldTimer } from './hooks/useHoldTimer'
import { usePoseCamera } from './hooks/usePoseCamera'
import { scoreShape } from './lib/scoring'
import {
  addAttempt,
  createId,
  ensureAutoHomework,
  loadActiveAthleteId,
  loadAthletes,
  loadAttempts,
  loadReferencePhotos,
  loadSettings,
  isRyanOnlyTab,
  loadTab,
  loadTaskProgress,
  saveActiveAthleteId,
  saveAthletes,
  saveSettings,
  saveTab,
  loadRemovedAthleteIds,
  noteRemovedAthlete,
  type AppTab,
} from './lib/storage'
import { takeDiscoverTarget } from './lib/mobileDiscover'
import { hydrateGymAtBoot, localHasGymRoster, type PersistInfo } from './lib/gymHydrate'
import { syncGymIfChanged } from './lib/gymLive'
import {
  localRosterSnapshot,
  pushServerRoster,
  isServerRosterPushEnabled,
  shouldPushRoster,
} from './lib/rosterSync'
import {
  getLessonSession,
  addLessonNote,
  hydrateLessons,
  loadActiveLessonId,
  planForSession,
  resumeLessonSession,
  startLessonSession,
  subscribeLessons,
  lessonAthleteIds,
  lessonNameList,
} from './lib/lessonStore'
import { linkAthleteToCoach } from './lib/coachLink'
import { linkLessonCalendarEvent } from './lib/calendarClient'
import { hydrateCoachContent } from './lib/coachContentStore'
import { hydrateSkillPaths } from './lib/skillPaths'
import { hydrateChalkboards } from './lib/chalkboard'
import {
  checkAutoClass,
  classLabel,
  clearAutoEndPrompt,
  getActiveMeeting,
  getOffering,
  hydrateCoachClasses,
  loadMeetings,
  loadOfferingsForCoach,
  logMeetingAttendance,
  skipMeetingAttendance,
  markClassAttendance,
  pendingAutoEndPrompt,
  priorOfferingAthleteIds,
  subscribeCoachClasses,
} from './lib/coachClasses'
import { closestOfferingToNow } from './lib/sessionGlow'
import {
  addIgStill,
  hydrateIgStills,
  mergeIgStills,
  subscribeIgStills,
} from './lib/igStillStore'
import { hydrateCoachStills, mergeCoachExtras, subscribeCoachStills } from './lib/coachStillStore'
import { ensureRyanInAthletes, isRyanAthlete } from './lib/ryanProfile'
import { syncAthleteProfileToResearch } from './lib/profileResearch'
import { canViewAthleteProfile } from './lib/coachLink'
import { isCoachProfile, isShapelabAdmin, profileRole } from './lib/profileRole'
import { childAthletes } from './lib/parentLink'
import { resolveAthleteViewAthlete } from './lib/familyView'
import { coachShareLabel } from './lib/coachShare'
import {
  isOfficeOnlyTab,
  navRoleFromSession,
  tabAllowedForNavRole,
} from './lib/appNav'
import {
  isProfileUnlocked,
  lockAllProfiles,
  markProfileUnlocked,
  profileNeedsPasscode,
  unlockedProfileId,
} from './lib/athletePasscode'
import {
  fetchAuthMe,
  logoutSession,
  markSessionPresent,
  sessionIsAdmin,
  sessionIsKiosk,
  SESSION_LOST_EVENT,
  type AuthSessionUser,
  type SessionRole,
} from './lib/authSession'
import type {
  AppSettings,
  Athlete,
  AthleteTaskProgress,
  AttemptRecord,
  ReferencePhoto,
  ShapeDef,
} from './types'
import { OwnerDashboard } from './components/owner/OwnerDashboard'
import { listGyms, type Gym } from './lib/gyms'

/**
 * Effective gym-owner view: the active profile's role is gym_owner, or a
 * shapelab admin is previewing the gym-owner desk. Gates the Owner tab.
 */
function isOwnerView(activeProfile: Athlete | null, deskPreview: DeskPreview): boolean {
  if (activeProfile && deskPreview === 'gymOwner') return true
  return profileRole(activeProfile) === 'gym_owner'
}

export default function App() {
  const camera = usePoseCamera()
  const [tab, setTab] = useState<AppTab>(() => {
    // A shared card link (?skill=...) jumps straight to Learn.
    try {
      if (new URLSearchParams(window.location.search).get('skill')) return 'learn'
    } catch {
      /* ignore */
    }
    const saved = loadTab()
    if (!isRyanOnlyTab(saved)) return saved
    const id = unlockedProfileId() || loadActiveAthleteId()
    if (!id) return 'tasks2'
    const roster = ensureRyanInAthletes(loadAthletes())
    return isRyanAthlete(roster.find((a) => a.id === id) ?? null) ? saved : 'today'
  })
  const [compareOpened, setCompareOpened] = useState(() => loadTab() === 'compare')
  const [compareFullTick, setCompareFullTick] = useState(0)
  /** Reference clip handed in from the reference scroll reel viewer ("Compare" button). */
  const [compareIncomingRef, setCompareIncomingRef] = useState<{
    src: string | null
    name: string
    itemId?: string
  } | null>(null)
  const [hwStudio, setHwStudio] = useState(false)
  const [assignedFlowId, setAssignedFlowId] = useState<string | null>(null)
  const consumeAssignedFlow = useCallback(() => setAssignedFlowId(null), [])
  const [feedChannel, setFeedChannel] = useState<'gym' | 'all'>('gym')
  useEffect(() => {
    if (tab === 'feed') {
      takeDiscoverTarget()
      setFeedChannel('gym')
    }
  }, [tab])
  const [learnIntent, setLearnIntent] = useState<LearnIntent | null>(null)
  const [quizPreset, setQuizPreset] = useState<{
    firstName: string
    lastName: string
    athleteId?: string
  } | null>(null)
  const [stationOpen, setStationOpen] = useState(false)
  const [classSessionOpen, setClassSessionOpen] = useState(false)
  const [autoEndMeetingId, setAutoEndMeetingId] = useState<string | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [storyComposerOpen, setStoryComposerOpen] = useState(false)
  const [clockOpen, setClockOpen] = useState(false)
  const [arcadeOpen, setArcadeOpen] = useState(false)
  const [namesQuizOpen, setNamesQuizOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const [tourStartIdx, setTourStartIdx] = useState(0)
  const [tourSteps, setTourSteps] = useState<TourStep[]>([])
  const closeTour = useCallback(() => setTourOpen(false), [])
  /** Open the spotlight tour with any step list (homework, today, surfaces). */
  const openTour = useCallback((steps: TourStep[], startTarget?: string) => {
    const i = startTarget ? steps.findIndex((s) => s.target === startTarget) : 0
    setTourSteps(steps)
    setTourStartIdx(i >= 0 ? i : 0)
    setTourOpen(true)
  }, [])
  const hwTourAutoFired = useRef(false)
  const [namesQuizGroupId, setNamesQuizGroupId] = useState<string | null>(null)
  const [trainLogForId, setTrainLogForId] = useState<string | null>(null)
  const [trainGuest, setTrainGuest] = useState(false)
  const [logForOpen, setLogForOpen] = useState(false)
  const [skillPathsOpen, setSkillPathsOpen] = useState(false)
  const [skillBuilderStart, setSkillBuilderStart] = useState<string | null>(null)
  const [skillBuilderUnscoped, setSkillBuilderUnscoped] = useState(false)
  const [coachWizardOpen, setCoachWizardOpen] = useState(false)
  const [viewingAthleteId, setViewingAthleteId] = useState<string | null>(null)
  const [shape, setShape] = useState<ShapeDef>(SHAPES[0])
  const [athletes, setAthletes] = useState<Athlete[]>(() => ensureRyanInAthletes(loadAthletes()))
  const [activeAthleteId, setActiveAthleteId] = useState<string | null>(() => {
    return unlockedProfileId() || loadActiveAthleteId()
  })
  const [parentFocusId, setParentFocusId] = useState<string | null>(null)
  const [athleteViewId, setAthleteViewId] = useState<string | null>(null)
  const [showParentGate, setShowParentGate] = useState(false)
  const [showFamilyPractice, setShowFamilyPractice] = useState(false)
  const [showChecklist, setShowChecklist] = useState(false)
  const [parentGuideArticleId, setParentGuideArticleId] = useState<string | null>(null)
  const [attempts, setAttempts] = useState<AttemptRecord[]>(() => loadAttempts())
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())
  const [saveFlash, setSaveFlash] = useState<string | null>(null)
  const [taskProgress, setTaskProgress] = useState<AthleteTaskProgress | null>(null)
  const [scoreStance, setScoreStance] = useState<'left' | 'right' | 'auto'>('auto')
  const [scoreProfileOk, setScoreProfileOk] = useState(false)
  const [referencePhotos, setReferencePhotos] = useState<ReferencePhoto[]>(() =>
    loadReferencePhotos(),
  )
  const [hitPreviewUrl, setHitPreviewUrl] = useState<string | null>(null)
  const [taskLiveUi, setTaskLiveUi] = useState<TaskLiveUi | null>(null)
  const [flowCue, setFlowCue] = useState<string | null>(null)
  const [flowPreview, setFlowPreview] = useState<{ shapeId: string; label: string }[] | null>(
    null,
  )
  const [camFullscreen, setCamFullscreen] = useState(false)
  const [flowPhase, setFlowPhase] = useState('idle')
  const [holdChallenge, setHoldChallenge] = useState(false)
  const startFlowRef = useRef<() => void>(() => {})
  const holdDoneRef = useRef<() => void>(() => {})
  const [holdClock, setHoldClock] = useState<number | null>(null)
  const holdSecondsRef = useRef<number | null>(null)
  const skipNextRef = useRef<(() => void) | null>(null)
  const [athleteGate, setAthleteGate] = useState<Athlete | null>(null)
  const [lessonTick, setLessonTick] = useState(0)
  const [gymBoot, setGymBoot] = useState<'loading' | 'ready' | 'error'>('loading')
  const [gymBootError, setGymBootError] = useState<string | null>(null)
  const [gymPersist, setGymPersist] = useState<PersistInfo | null>(null)
  const [gymBootTick, setGymBootTick] = useState(0)
  const [authUser, setAuthUser] = useState<AuthSessionUser | null>(null)
  const [authStatus, setAuthStatus] = useState<'loading' | 'in' | 'out'>('loading')
  const [authBootstrap, setAuthBootstrap] = useState(false)
  const [ownerGym, setOwnerGym] = useState<Gym | null>(null)
  const [deskPreview, setDeskPreview] = useState<DeskPreview>(() => loadDeskPreview())
  const chooseDeskPreview = (next: DeskPreview) => {
    saveDeskPreview(next)
    setDeskPreview(next)
    setTab('today')
  }
  const [awayLocked, setAwayLocked] = useState(false)
  const lockAway = useCallback(() => setAwayLocked(true), [])
  const clearSignedInDesk = useCallback(() => {
    lockAllProfiles()
    setActiveAthleteId(null)
    setAuthUser(null)
    setAuthStatus('out')
    setGymBoot('loading')
    setAwayLocked(false)
  }, [])
  const authStatusRef = useRef(authStatus)
  authStatusRef.current = authStatus
  // Never lock during a live class or lesson. Otherwise 3h idle.
  // (liveClass/liveLesson are defined below; check directly here.)
  const lockSuppressed = (() => {
    try {
      if (getActiveMeeting(activeAthleteId)) return true
      const lessonId = loadActiveLessonId()
      if (lessonId) {
        const s = getLessonSession(lessonId)
        if (s && !s.endedAt) return true
      }
    } catch { /* ignore */ }
    return false
  })()
  useAwayLock(authStatus === 'in' && !sessionIsKiosk(authUser) && !awayLocked && !lockSuppressed, lockAway)

  useEffect(() => {
    const onLost = () => {
      if (authStatusRef.current !== 'in') return
      clearSignedInDesk()
    }
    window.addEventListener(SESSION_LOST_EVENT, onLost)
    return () => window.removeEventListener(SESSION_LOST_EVENT, onLost)
  }, [clearSignedInDesk])

  useEffect(() => {
    let cancelled = false
    void fetchAuthMe()
      .then((me) => {
        if (cancelled) return
        setAuthBootstrap(Boolean(me.bootstrapAllowed))
        if (me.authenticated && me.user) {
          markSessionPresent()
          setAuthUser(me.user)
          setAuthStatus('in')
        } else {
          setAuthUser(null)
          setAuthStatus('out')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAuthUser(null)
          setAuthStatus('out')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Gym owners see their own gym. Loads once per login.
  useEffect(() => {
    if (authUser?.role !== 'gymOwner') {
      setOwnerGym(null)
      return
    }
    let cancelled = false
    void listGyms()
      .then((gyms) => {
        if (!cancelled) setOwnerGym(gyms[0] ?? null)
      })
      .catch(() => {
        if (!cancelled) setOwnerGym(null)
      })
    return () => {
      cancelled = true
    }
  }, [authUser?.accountId, authUser?.role])

  useEffect(() => {
    if (authStatus !== 'in') return
    void hydrateLessons().then(() => setLessonTick((n) => n + 1))
    void hydrateCoachClasses().then(() => setLessonTick((n) => n + 1))
    void hydrateChalkboards()
    void hydrateCoachContent()
    void hydrateSkillPaths()
    const unsubLessons = subscribeLessons(() => setLessonTick((n) => n + 1))
    const unsubClasses = subscribeCoachClasses(() => setLessonTick((n) => n + 1))
    return () => {
      unsubLessons()
      unsubClasses()
    }
  }, [authStatus])

  useEffect(() => {
    if (authStatus !== 'in') return
    const unsub = subscribeIgStills((ig) => {
      setReferencePhotos((prev) => mergeIgStills(prev, ig))
    })
    void hydrateIgStills()
    return unsub
  }, [authStatus])

  useEffect(() => {
    if (authStatus !== 'in') return
    const unsub = subscribeCoachStills((extras) => {
      setReferencePhotos((prev) => mergeCoachExtras(prev, extras))
    })
    void hydrateCoachStills(loadReferencePhotos())
    return unsub
  }, [authStatus])

  // Auto-start and auto-end scheduled classes every minute.
  useEffect(() => {
    if (authStatus !== 'in') return
    const run = () => {
      try {
        // Hydrate first: a client with a stale local copy (e.g. a phone that
        // was backgrounded through the scheduled start) must see the server's
        // live meeting before deciding to auto-start, or it spawns duplicates.
        void hydrateCoachClasses().then(() => {
          try {
            checkAutoClass()
            const pending = pendingAutoEndPrompt()
            if (pending) setAutoEndMeetingId(pending)
          } catch {
            /* never break the app over the class clock */
          }
        })
      } catch {
        /* never break the app over the class clock */
      }
    }
    run()
    const id = window.setInterval(run, 60_000)
    return () => window.clearInterval(id)
  }, [authStatus])

  const qualityThreshold =
    settings.qualityThresholdOverride ?? shape.qualityThreshold

  const activeLandmarks = camera.running ? camera.landmarks : null

  const score = useMemo(
    () =>
      scoreShape(activeLandmarks, shape, qualityThreshold, {
        stance: scoreStance,
        profileOk: scoreProfileOk,
      }),
    [activeLandmarks, shape, qualityThreshold, scoreStance, scoreProfileOk],
  )

  const timingActive = camera.running
  const hold = useHoldTimer(
    timingActive,
    score.holdReady ? Math.max(score.overall, qualityThreshold) : score.overall,
    score.holdReady ? qualityThreshold : 101,
  )

  const setAthleteRoster = useCallback((next: Athlete[]) => {
    const now = new Date().toISOString()
    setAthletes((prev) =>
      ensureRyanInAthletes(next).map((a) => {
        const old = prev.find((x) => x.id === a.id)
        if (!old) return { ...a, updatedAt: a.updatedAt || now }
        const { updatedAt: _prevAt, ...prevFields } = old
        const { updatedAt: _nextAt, ...nextFields } = a
        if (JSON.stringify(prevFields) === JSON.stringify(nextFields)) {
          return { ...a, updatedAt: a.updatedAt || old.updatedAt }
        }
        return { ...a, updatedAt: now }
      }),
    )
  }, [])

  const removeProfile = useCallback((id: string) => {
    const target = athletes.find((a) => a.id === id)
    if (!target || isRyanAthlete(target)) return
    noteRemovedAthlete(id)
    const next = athletes.filter((a) => a.id !== id)
    setAthleteRoster(next)
    if (viewingAthleteId === id) setViewingAthleteId(null)
    if (activeAthleteId === id) {
      lockAllProfiles()
      setActiveAthleteId(null)
    }
    void pushServerRoster({
      ...localRosterSnapshot(),
      athletes: ensureRyanInAthletes(next),
      removedAthleteIds: [...new Set([...loadRemovedAthleteIds(), id])],
    })
  }, [athletes, viewingAthleteId, activeAthleteId, setAthleteRoster])

  const requestSelectAthlete = useCallback(
    (id: string | null) => {
      if (!id) {
        lockAllProfiles()
        setActiveAthleteId(null)
        setAthleteGate(null)
        return
      }
      const a = athletes.find((x) => x.id === id)
      if (!a) {
        // Brand-new profile: roster state may not have re-rendered yet.
        if (isProfileUnlocked(id)) {
          setActiveAthleteId(id)
          setAthleteGate(null)
        }
        return
      }
      if (isProfileUnlocked(a.id)) {
        markProfileUnlocked(a.id)
        setActiveAthleteId(id)
        setAthleteGate(null)
        return
      }
      if (sessionIsAdmin(authUser) && isRyanAthlete(a)) {
        markProfileUnlocked(a.id)
        setActiveAthleteId(id)
        setAthleteGate(null)
        return
      }
      if (authUser?.rosterProfileId && authUser.rosterProfileId === a.id) {
        markProfileUnlocked(a.id)
        setActiveAthleteId(id)
        setAthleteGate(null)
        return
      }
      if (profileNeedsPasscode(a)) {
        setAthleteGate(a)
        return
      }
      markProfileUnlocked(a.id)
      setActiveAthleteId(id)
    },
    [athletes, authUser],
  )

  const rosterReadyRef = useRef(false)

  useEffect(() => {
    saveAthletes(athletes)
    if (!rosterReadyRef.current) return
    for (const a of athletes) ensureAutoHomework(a.id)
    if (athletes.length > 0 && shouldPushRoster(athletes.length)) {
      void pushServerRoster(localRosterSnapshot())
    }
  }, [athletes])

  useEffect(() => {
    saveActiveAthleteId(activeAthleteId)
    if (rosterReadyRef.current && shouldPushRoster(athletes.length)) void pushServerRoster()
  }, [activeAthleteId, athletes.length])

  useEffect(() => {
    const onApplied = () => {
      setAthletes(ensureRyanInAthletes(loadAthletes()))
    }
    window.addEventListener('shape-lab-roster-applied', onApplied)
    return () => window.removeEventListener('shape-lab-roster-applied', onApplied)
  }, [])

  useEffect(() => {
    let cancelled = false
    const applyRoster = (synced: { athletes: Athlete[]; fromServer: boolean }) => {
      const next =
        synced.athletes.length > 0
          ? ensureRyanInAthletes(synced.athletes)
          : ensureRyanInAthletes(loadAthletes())
      if (cancelled) return next
      rosterReadyRef.current = synced.fromServer && isServerRosterPushEnabled()
      setAthletes((prev) =>
        next.map((a) => ({
          ...a,
          photoDataUrl: a.photoDataUrl || prev.find((p) => p.id === a.id)?.photoDataUrl,
        })),
      )
      const remembered = unlockedProfileId() || loadActiveAthleteId()
      if (remembered && next.some((a) => a.id === remembered)) {
        markProfileUnlocked(remembered)
        setActiveAthleteId(remembered)
      } else {
        setActiveAthleteId(null)
        setAthleteGate(null)
      }
      return next
    }
    let settled = false
    let watchdog = 0
    const settle = (state: 'ready' | 'error', message?: string) => {
      if (cancelled || settled) return
      settled = true
      window.clearTimeout(watchdog)
      if (message) setGymBootError(message)
      setGymBoot(state)
    }
    if (authStatus !== 'in') return
    const run = async () => {
      setGymBoot('loading')
      setGymBootError(null)
      const deadline = Date.now() + 12_000
      for (let attempt = 0; attempt < 3 && !cancelled && !settled; attempt += 1) {
        try {
          const synced = await hydrateGymAtBoot()
          if (cancelled || settled) return
          setGymPersist(synced.persist)
          applyRoster(synced)
          if (synced.fromServer || localHasGymRoster()) {
            settle('ready')
            return
          }
        } catch (err) {
          if (cancelled || settled) return
          setGymBootError(err instanceof Error ? err.message : 'Could not load the gym file from this URL.')
        }
        if (Date.now() > deadline) break
        await new Promise((resolve) => window.setTimeout(resolve, 800))
      }
      settle(
        'error',
        'Could not load the gym file from this URL. On the Mac run git pull and npm run gym:mac, then refresh.',
      )
    }
    watchdog = window.setTimeout(() => {
      settle(
        'error',
        'This Wi-Fi link reached the Mac but the name list did not finish. On the Mac: git pull, then npm run gym:mac. Then refresh this page.',
      )
    }, 12_000)
    void run()
    return () => {
      cancelled = true
      window.clearTimeout(watchdog)
    }
  }, [gymBootTick, authStatus])

  useEffect(() => {
    if (gymBoot !== 'ready') return
    const pull = () => {
      void syncGymIfChanged((next) => {
        if (next.length === 0) return
        setAthletes((prev) =>
          ensureRyanInAthletes(next).map((a) => ({
            ...a,
            photoDataUrl: a.photoDataUrl || prev.find((p) => p.id === a.id)?.photoDataUrl,
          })),
        )
      })
    }
    window.addEventListener('focus', pull)
    // Phones backgrounded through an auto-start miss the revision poll while
    // suspended. Refetch class meetings directly on focus/foreground so a
    // class that started while the app was asleep appears immediately.
    const refetchClasses = () => {
      void hydrateCoachClasses().then(() => setLessonTick((n) => n + 1))
    }
    window.addEventListener('focus', refetchClasses)
    let tick = 0
    const start = () => {
      if (tick) return
      tick = window.setInterval(pull, 4_000)
    }
    const stop = () => {
      window.clearInterval(tick)
      tick = 0
    }
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        pull()
        refetchClasses()
        start()
      } else {
        stop()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    if (document.visibilityState === 'visible') start()
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', pull)
      window.removeEventListener('focus', refetchClasses)
      stop()
    }
  }, [gymBoot])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const activeProfile = athletes.find((a) => a.id === activeAthleteId) ?? null

  // Family beta: athlete view through a parent login. Auth (authUser) stays
  // the parent — this only changes which experience renders. The id is
  // validated against the parent's linked athletes on every render.
  // In the admin Test parent preview, the fixture parent stands in for the signed-in parent.
  const familyParent =
    activeProfile && profileRole(activeProfile) === 'parent'
      ? activeProfile
      : deskPreview === 'testParent' && sessionIsAdmin(authUser)
        ? TEST_PARENT
        : null
  const familyAthletes =
    deskPreview === 'testParent' && sessionIsAdmin(authUser) ? [TEST_ATHLETE] : athletes
  const athleteViewAthlete = resolveAthleteViewAthlete(familyParent, athleteViewId, familyAthletes)
  const previewRole: SessionRole | undefined = athleteViewAthlete
    ? 'athlete'
    : sessionIsAdmin(authUser) && deskPreview !== 'home'
      ? deskPreview === 'gymOwner'
        ? 'gymOwner'
        : deskPreview === 'testParent' || deskPreview === 'parent'
          ? 'parent'
          : deskPreview === 'athlete'
            ? 'athlete'
            : 'coach'
      : authUser?.role

  useEffect(() => {
    const pick =
      !settings.themeColor || settings.themeColor === 'auto'
        ? activeProfile?.favoriteColor
        : settings.themeColor
    applyAppTheme(pick)
  }, [settings.themeColor, activeProfile?.favoriteColor])

  useEffect(() => {
    saveTab(tab)
    if (tab === 'compare') setCompareOpened(true)
    if (tab !== 'tasks' && tab !== 'tasks2') setCamFullscreen(false)
    if (tab !== 'homework') setHwStudio(false)
    // Guided homework tour: auto-offer once per device to non-coach viewers.
    // Wait for the homework hub to actually render before opening — opening
    // on a fixed timer is what made the old tour cascade-skip its steps.
    if (tab === 'homework' && !hwTourAutoFired.current && !tourSeen()) {
      hwTourAutoFired.current = true
      const coachViewing = activeProfile != null && isCoachProfile(activeProfile)
      if (!coachViewing) {
        let tries = 0
        const iv = window.setInterval(() => {
          tries += 1
          const hub = document.getElementById('hw-tour-hub')
          const ready = hub != null && hub.children.length > 0
          if (ready || tries > 20) {
            window.clearInterval(iv)
            if (ready) {
              openTour(buildHwTourSteps(foundationVisible))
            }
          }
        }, 400)
        return () => window.clearInterval(iv)
      }
    }
  }, [tab])

  useEffect(() => {
    const ryan =
      deskPreview === 'home' && isRyanAthlete(athletes.find((a) => a.id === activeAthleteId) ?? null)
    if (!ryan && isRyanOnlyTab(tab)) setTab('today')
    if (sessionIsKiosk(authUser) && isOfficeOnlyTab(tab)) setTab('today')
    const role = navRoleFromSession(previewRole, sessionIsKiosk(authUser))
    const ownerView = isOwnerView(athletes.find((a) => a.id === activeAthleteId) ?? null, deskPreview)
    if (authUser && !tabAllowedForNavRole(tab, role, ryan, ownerView)) setTab('today')
  }, [athletes, activeAthleteId, tab, authUser, deskPreview, previewRole])

  // Admin default: opening the app in the admin home desk with the Learn tab
  // restored lands on Today instead. Once per boot — navigating to Learn
  // afterwards stays put.
  const adminDefaultedRef = useRef(false)
  useEffect(() => {
    if (authStatus !== 'in' || adminDefaultedRef.current) return
    adminDefaultedRef.current = true
    if (sessionIsAdmin(authUser) && deskPreview === 'home' && tab === 'learn') {
      setTab('today')
    }
  }, [authStatus, authUser, deskPreview, tab])

  useEffect(
    () => () => {
      if (hitPreviewUrl) URL.revokeObjectURL(hitPreviewUrl)
    },
    [hitPreviewUrl],
  )

  const liveLesson = (() => {
    // Only the lesson this device has active (started or explicitly opened here).
    // A lesson started on another device shows as a "Lesson in progress" banner
    // on Today with a join button; it must not yank this device into the workspace.
    const pointed = getLessonSession(loadActiveLessonId())
    if (pointed && !pointed.endedAt) return pointed
    return null
  })()
  const liveLessonPlan = planForSession(liveLesson)
  const liveLessonAthletes = liveLesson
    ? lessonAthleteIds(liveLesson)
        .map((id) => athletes.find((a) => a.id === id) ?? null)
        .filter((a): a is Athlete => Boolean(a))
    : []
  const liveLessonAthlete = liveLessonAthletes[0] ?? null
  const liveLessonCoach = athletes.find((a) => a.id === liveLesson?.coachId) ?? null
  void lessonTick

  const cameraTab =
    tab === 'tasks' ||
    tab === 'tasks2' ||
    tab === 'homework' ||
    tab === 'coach'
  useEffect(() => {
    if (!cameraTab && camera.running) camera.stop()
  }, [cameraTab, camera.running, camera.stop])

  const enterAthleteView = useCallback(
    (id: string) => {
      if (!resolveAthleteViewAthlete(familyParent, id, familyAthletes)) return
      setAthleteViewId(id)
      setTab('today')
    },
    [familyParent, familyAthletes],
  )
  const exitAthleteView = useCallback(() => {
    // Parent Gate: require PIN to return to Parent experience.
    setShowParentGate(true)
  }, [])

  const confirmExitAthleteView = useCallback(() => {
    setShowParentGate(false)
    setAthleteViewId(null)
  }, [])

  // Return to the parent experience after 20 minutes without interaction
  // while in athlete view.
  useEffect(() => {
    if (!athleteViewAthlete) return
    let lastActive = Date.now()
    const bump = () => {
      lastActive = Date.now()
    }
    window.addEventListener('pointerdown', bump)
    window.addEventListener('keydown', bump)
    const timer = window.setInterval(() => {
      if (Date.now() - lastActive > 20 * 60 * 1000) {
        // Inactivity: return to safe state directly, no PIN needed.
        setShowParentGate(false)
        setAthleteViewId(null)
      }
    }, 60 * 1000)
    return () => {
      window.removeEventListener('pointerdown', bump)
      window.removeEventListener('keydown', bump)
      window.clearInterval(timer)
    }
  }, [athleteViewAthlete, exitAthleteView])

  const goTab = (id: AppTab) => {
    const ryan = isRyanAthlete(athletes.find((a) => a.id === activeAthleteId) ?? null)
    if (isRyanOnlyTab(id) && !ryan) return
    if (sessionIsKiosk(authUser) && isOfficeOnlyTab(id)) return
    const role = navRoleFromSession(previewRole, sessionIsKiosk(authUser))
    if (authUser && !tabAllowedForNavRole(id, role, ryan, isOwnerView(athletes.find((a) => a.id === activeAthleteId) ?? null, deskPreview))) return
    setTab(id)
    if (id === 'compare') setCompareOpened(true)
  }

  const openCompareWithReference = (payload?: {
    src: string | null
    name: string
    itemId?: string
  }) => {
    // A payload hands a reference clip in from outside the tab (reference
    // scroll reel viewer); no payload means a plain open, which clears any
    // stale incoming clip.
    setCompareIncomingRef(payload ?? null)
    goTab('compare')
    setCompareFullTick((tick) => tick + 1)
  }

  const startLesson = async (
    athleteIds: string[],
    planId?: string | null,
    calendar?: { eventId: string; title: string; startAt: string; endAt: string; notes?: string | null },
  ) => {
    const coach = athletes.find((a) => a.id === activeAthleteId) ?? null
    if (!coach || !isCoachProfile(coach)) return
    const ids = athleteIds.filter(Boolean)
    if (ids.length === 0) return
    // Pull the latest first: if another device just started a lesson for these
    // athletes, join that session instead of creating a duplicate.
    await hydrateLessons()
    const primaryId = ids[0]!
    const existing = getLessonSession(loadActiveLessonId())
    if (
      existing &&
      !existing.endedAt &&
      calendar?.eventId &&
      existing.calendarEventId === calendar.eventId &&
      ids.some((id) => lessonAthleteIds(existing).includes(id))
    ) {
      setLessonTick((n) => n + 1)
      return
    }
    const session = startLessonSession({
      athleteIds: ids,
      coachId: coach.id,
      planId,
      calendar,
    })
    let roster = athletes
    for (const id of ids) roster = linkAthleteToCoach(id, coach.id)
    setAthleteRoster(roster)
    if (calendar?.eventId) {
      void linkLessonCalendarEvent(session.id, calendar.eventId, primaryId)
    }
    setLessonTick((n) => n + 1)
  }

  const saveIgStill = useCallback((draft: IgCropDraft) => {
    const athlete = athletes.find((a) => a.id === activeAthleteId) ?? null
    const photo: ReferencePhoto = {
      id: createId('ig'),
      shapeId: draft.shapeId,
      athleteId: athlete?.id ?? null,
      dataUrl: draft.dataUrl,
      customName: draft.customName,
      label: draft.label,
      createdAt: new Date().toISOString(),
      library: 'ig',
      persistedToApp: true,
    }
    void addIgStill(photo, { persistToApp: true })
  }, [activeAthleteId, athletes])

  useEffect(() => {
    if (!activeAthleteId) {
      setTaskProgress(null)
      return
    }
    setTaskProgress(loadTaskProgress(activeAthleteId))
  }, [activeAthleteId])

  useEffect(() => {
    hold.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape.id])

  const onSelectShape = useCallback((s: ShapeDef) => {
    setShape(s)
    setScoreStance('auto')
    setScoreProfileOk(false)
  }, [])

  const onJumpToShape = useCallback(
    (shapeId: string, stance?: 'left' | 'right' | 'auto', opts?: { profileOk?: boolean }) => {
      const s = SHAPES.find((x) => x.id === shapeId)
      if (s) setShape(s)
      setScoreStance(stance ?? 'auto')
      setScoreProfileOk(Boolean(opts?.profileOk))
    },
    [],
  )

  const saveAttempt = () => {
    if (!activeAthleteId) {
      setSaveFlash('Select or create an athlete first.')
      return
    }
    const record: AttemptRecord = {
      id: createId('att'),
      athleteId: activeAthleteId,
      shapeId: shape.id,
      shapeName: shape.name,
      overall: score.overall,
      criteria: score.criteria.map((c) => ({
        id: c.id,
        label: c.label,
        score: c.score,
      })),
      totalHoldSeconds: roundHoldSecondsUp(hold.totalHoldSeconds),
      qualityHoldSeconds: roundHoldSecondsUp(hold.qualityHoldSeconds),
      mainCorrection: score.mainCorrection,
      savedAt: new Date().toISOString(),
    }
    addAttempt(record)
    setAttempts((prev) => [record, ...prev].slice(0, 500))
    setSaveFlash(`Saved ${shape.name} — score ${score.overall}`)
    setTimeout(() => setSaveFlash(null), 2500)
    if (rosterReadyRef.current) void pushServerRoster()
  }

  const cameraControls = (
    <div className="flex flex-wrap items-center gap-2">
      {!camera.running ? (
        <button
          type="button"
          onClick={() => void camera.start()}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-[var(--on-accent)]"
        >
          Start camera
        </button>
      ) : (
        <button
          type="button"
          onClick={camera.stop}
          className="rounded-lg border border-[var(--panel-border)] px-4 py-2"
        >
          Stop camera
        </button>
      )}
      <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <input
          type="checkbox"
          checked={settings.mirrorVideo}
          onChange={(e) =>
            setSettings((s) => ({ ...s, mirrorVideo: e.target.checked }))
          }
        />
        Mirror
      </label>
      <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <input
          type="checkbox"
          checked={settings.showAngles}
          onChange={(e) =>
            setSettings((s) => ({ ...s, showAngles: e.target.checked }))
          }
        />
        Show joint angles (shoulders, elbows, hips, ankles)
      </label>
      <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <input
          type="checkbox"
          checked={settings.voiceEnabled}
          onChange={(e) =>
            setSettings((s) => ({ ...s, voiceEnabled: e.target.checked }))
          }
        />
        Voice
      </label>
      <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <input
          type="checkbox"
          checked={settings.notificationsEnabled}
          onChange={(e) =>
            setSettings((s) => ({ ...s, notificationsEnabled: e.target.checked }))
          }
        />
        Reminders
      </label>
      <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <input
          type="checkbox"
          checked={settings.tourGuidesEnabled}
          onChange={(e) =>
            setSettings((s) => ({ ...s, tourGuidesEnabled: e.target.checked }))
          }
        />
        Tour guide buttons
      </label>
      <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
        Quality threshold
        <input
          type="number"
          min={0}
          max={100}
          className="w-16 rounded border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1"
          value={qualityThreshold}
          onChange={(e) => {
            const v = Number(e.target.value)
            setSettings((s) => ({
              ...s,
              qualityThresholdOverride: Number.isFinite(v) ? v : null,
            }))
          }}
        />
      </label>
      <span className="text-xs text-[var(--muted)]">{camera.fps} fps</span>
    </div>
  )

  const liveClass = getActiveMeeting(activeAthleteId)
  const liveClassOffering = liveClass ? getOffering(liveClass.offeringId) : null
  const liveClassRosterIds = liveClass ? (getOffering(liveClass.offeringId)?.rosterIds ?? []) : []
  const liveClassAthletes = athletes.filter((a) => liveClassRosterIds.includes(a.id))
  const floorKiosk = sessionIsKiosk(authUser)
  const ryanEdit =
    !floorKiosk &&
    deskPreview === 'home' &&
    isRyanAthlete(athletes.find((a) => a.id === activeAthleteId) ?? null)
  const libraryEdit = ryanEdit || (deskPreview === 'home' && isCoachProfile(activeProfile))
  const openProfile = (id: string) => {
    const row = athletes.find((a) => a.id === id)
    if (row && !canViewAthleteProfile(activeProfile, row)) return
    setViewingAthleteId(id)
  }
  const parentKids =
    deskPreview === 'testParent' && sessionIsAdmin(authUser)
      ? [TEST_ATHLETE]
      : activeProfile
        ? childAthletes(activeProfile, athletes)
        : []
  const deskRole = navRoleFromSession(previewRole, floorKiosk)
  const previewProfile: Athlete | null = athleteViewAthlete ?? (deskPreview === 'testParent' && sessionIsAdmin(authUser)
      ? TEST_PARENT
      : activeProfile && deskPreview === 'parent'
      ? { ...activeProfile, role: 'parent' }
      : activeProfile && deskPreview === 'athlete'
        ? { ...activeProfile, role: 'athlete' }
        : activeProfile && deskPreview === 'coach'
          ? { ...activeProfile, role: 'coach' }
          : activeProfile && deskPreview === 'gymOwner'
            ? { ...activeProfile, role: 'gym_owner' }
            : activeProfile)
  const ownerView = isOwnerView(activeProfile, deskPreview)
  const homeworkAthleteId = athleteViewAthlete
    ? athleteViewAthlete.id
    : activeProfile && profileRole(activeProfile) === 'parent'
      ? parentFocusId && parentKids.some((k) => k.id === parentFocusId)
        ? parentFocusId
        : parentKids[0]?.id ?? null
      : activeAthleteId
  const homeworkAthlete = athletes.find((a) => a.id === homeworkAthleteId) ?? null
  // Coach/admin override: whose profile the Train view logs holds for.
  // Lets a coach hand the device to an athlete (or a guest) without the
  // hold landing on the coach's own profile.
  const trainLogForAthleteId = trainGuest ? homeworkAthleteId : (trainLogForId ?? homeworkAthleteId)
  const trainLogForAthlete = athletes.find((a) => a.id === trainLogForAthleteId) ?? null
  // "Strengthen your foundation" sits above the homework hub for coach viewers.
  const foundationVisible = Boolean(
    activeProfile && isCoachProfile(activeProfile) && (trainLogForAthlete ?? homeworkAthlete),
  )
  const openHwTour = useCallback(
    (startTarget?: string) => openTour(buildHwTourSteps(foundationVisible), startTarget),
    [openTour, foundationVisible],
  )
  const showLogForPicker =
    (activeProfile != null && isCoachProfile(activeProfile)) || sessionIsAdmin(authUser)
  const personalCompare =
    Boolean(activeProfile) && isCoachProfile(activeProfile) && !isShapelabAdmin(activeProfile)

  if (authStatus === 'loading') {
    return <GymBootScreen phase="loading" persist={gymPersist} />
  }
  if (authStatus === 'out' || !authUser) {
    return (
      <AuthLoginScreen
        bootstrapAllowed={authBootstrap}
        onSignedIn={(user) => {
          markSessionPresent()
          setAuthUser(user)
          setAuthStatus('in')
          if (sessionIsAdmin(user)) {
            markProfileUnlocked('ath_ryan')
            setActiveAthleteId('ath_ryan')
          } else if (user.rosterProfileId) {
            markProfileUnlocked(user.rosterProfileId)
            setActiveAthleteId(user.rosterProfileId)
          }
          setGymBootTick((n) => n + 1)
        }}
      />
    )
  }

  if (gymBoot !== 'ready') {
    return (
      <GymBootScreen
        phase={gymBoot === 'error' ? 'error' : 'loading'}
        error={gymBootError}
        persist={gymPersist}
        onRetry={() => setGymBootTick((n) => n + 1)}
        onContinueLocal={() => setGymBoot('ready')}
      />
    )
  }

  return (
    <OverlayStillProvider>
    <IgStillProvider persistToApp onSave={saveIgStill}>
    <ShapeCopyProvider canEdit={libraryEdit}>
    <StillCropProvider canEdit={ryanEdit}>
    <GymLibraryProvider profileId={personalCompare ? activeAthleteId : null}>
    <ClipEditProvider viewer={activeProfile} athletes={athletes}>
    <ClipLoopsProvider>
    <VideoAdjustmentsProvider>
    <FavoritesProvider>
    <ProfilePeekProvider onView={openProfile}>
    <GestureBurstHost />
    <VersionCheck />
    <div className="mx-auto min-h-screen min-w-0 max-w-[90rem] overflow-x-hidden px-3 py-4 sm:px-6">
      <IgMobileShell
        tab={tab}
        onGo={goTab}
        authUser={authUser}
        athlete={athleteViewAthlete ?? activeProfile}
        athletes={athletes}
        activeAthleteId={activeAthleteId}
        settings={settings}
        onViewProfile={openProfile}
        ryan={ryanEdit}
        kiosk={floorKiosk}
        admin={sessionIsAdmin(authUser) && deskPreview === 'home'}
        navRole={previewRole ?? authUser.role}
        deskPreview={deskPreview}
        isOwner={ownerView}
        onDeskPreview={chooseDeskPreview}
        onSignOut={() => {
          void logoutSession().then(() => {
            setAthleteViewId(null)
            clearSignedInDesk()
          })
        }}
        onOpenMyProfile={() => {
          if (activeProfile) setProfileOpen(true)
        }}
        profileActive={profileOpen}
        onCloseProfile={() => setProfileOpen(false)}
        onStory={() => {
          if (activeProfile) setStoryComposerOpen(true)
        }}
      >
      <header className="mb-4 hidden min-w-0 max-w-full flex-wrap items-start justify-between gap-3 md:flex">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            shapelab
          </h1>
          <p className="mt-1">
            <span className={HOLD_BUILD_CHIP}>{HOLD_BUILD_LABEL}</span>
          </p>
          {floorKiosk && (
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-[#6ec8d6]">
              Floor iPad
            </p>
          )}
          <button
            type="button"
            className="mt-3 text-[10px] text-[var(--muted)]/70 underline decoration-transparent hover:decoration-current"
            onClick={() => {
              void logoutSession().then(() => {
                setAthleteViewId(null)
                clearSignedInDesk()
              })
            }}
          >
            Sign out
          </button>
          {sessionIsAdmin(authUser) && !floorKiosk && (
            <div className="mt-3">
              <DeskPreviewPicker value={deskPreview} onChange={chooseDeskPreview} compact />
            </div>
          )}
        </div>
        <div className="min-w-0 max-w-full flex-1 basis-full sm:basis-auto">
          <AppNav
            tab={tab}
            ryan={ryanEdit}
            kiosk={floorKiosk}
            admin={sessionIsAdmin(authUser) && deskPreview === 'home'}
            role={previewRole ?? authUser.role}
            isOwner={ownerView}
            onGo={goTab}
          />
        </div>
        <div className="ml-auto shrink-0">
          <NotifyBell athlete={activeProfile} settings={settings} onOpen={goTab} />
        </div>
      </header>

      {floorKiosk && <FloorKioskBar user={authUser} onUser={setAuthUser} />}
      {athleteViewAthlete && activeProfile && (
        <AthleteViewBar
          athlete={athleteViewAthlete}
          siblings={childAthletes(familyParent, familyAthletes)}
          parentName={activeProfile.firstName || ''}
          onBackToParent={exitAthleteView}
          onSwitchAthlete={enterAthleteView}
        />
      )}
      {showParentGate && (
        <ParentGateDialog
          onSuccess={confirmExitAthleteView}
          onCancel={() => setShowParentGate(false)}
        />
      )}

      {tab === 'today' && deskRole === 'parent' && previewProfile && !showFamilyPractice && (
        <ParentHome
          parent={previewProfile}
          kids={parentKids}
          focusId={parentFocusId}
          onFocus={setParentFocusId}
          onOpenAthletes={() => goTab('history')}
          onOpenLearn={() => goTab('learn')}
          onOpenArticle={(articleId) => {
            setParentGuideArticleId(articleId)
            goTab('learn')
          }}
          onEnterAthleteView={enterAthleteView}
          onPracticeTogether={() => setShowFamilyPractice(true)}
        />
      )}
      {showFamilyPractice && previewProfile && deskRole === 'parent' && (
        <FamilyPracticeView
          parent={previewProfile}
          kids={parentKids}
          onBack={() => setShowFamilyPractice(false)}
        />
      )}
      {showChecklist && previewProfile && (
        <AthleteChecklistView
          coach={previewProfile}
          athletes={athletes}
          onBack={() => setShowChecklist(false)}
        />
      )}
      {tab === 'today' && deskRole === 'athlete' && (
        <div className="flex min-w-0 flex-col gap-4 pt-8 md:pt-4">
          <div className="px-5">
            <TourOfferButton onTakeTour={() => openTour(ATHLETE_HOME_TOUR)} label="✨ Tour this page" />
          </div>
        <AthleteHome
          athlete={previewProfile}
          onAthleteChange={(next) => {
            setAthleteRoster(athletes.map((a) => (a.id === next.id ? next : a)))
          }}
          onPractice={() => goTab('homework')}
          onQuickLog={() => goTab('classclock')}
          onProgress={() => goTab('progress')}
          onVideos={() => goTab('compare')}
          onOpenGuide={() => {
            stashMobileSearchJump({ kind: 'skillPath' })
            goTab('learn')
          }}
          onOpenShapes={() => {
            stashMobileSearchJump({ kind: 'shapes' })
            goTab('learn')
          }}
          onOpenShapeTest={() => {
            setLearnIntent('quiz')
            goTab('learn')
          }}
        />
        </div>
      )}
      {tab === 'today' && deskRole !== 'parent' && deskRole !== 'athlete' && (
        <div className="flex min-w-0 flex-col gap-4 pt-8 md:pt-4">
          <div className="px-5">
            <TourOfferButton onTakeTour={() => openTour(TODAY_COACH_TOUR)} label="✨ Tour this page" />
          </div>
          {activeProfile && isCoachProfile(activeProfile) && (
            <div id="tour-today-banners">
            <CoachReminderBanners
              coachId={activeProfile.id}
              onJumpToRecaps={() =>
                document.getElementById('today-recaps')?.scrollIntoView({ behavior: 'smooth' })
              }
            />
            </div>
          )}
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
          <div className="min-w-0">
            {liveLesson && !liveLesson.endedAt && liveLessonAthletes.length > 0 ? (
              <div className="grid gap-4">
              <LessonWorkspace
                session={liveLesson}
                plan={liveLessonPlan}
                athlete={liveLessonAthlete}
                athleteName={lessonNameList(liveLessonAthletes.map((a) => a.name))}
                lessonAthletes={liveLessonAthletes}
                coach={liveLessonCoach ?? activeProfile}
                coachName={liveLessonCoach?.name ?? 'Coach'}
                athletes={athletes}
                onAthletesChange={setAthleteRoster}
                score={score}
                currentShapeId={shape.id}
                timingActive={false}
                landmarks={null}
                onRequestShape={(shapeId) => onJumpToShape(shapeId)}
                onGoCompare={() => goTab('compare')}
                onSessionChange={() => setLessonTick((n) => n + 1)}
                onEnded={() => setLessonTick((n) => n + 1)}
              />
              <TodayDock
                id="chalk"
                icon="📋"
                eyebrow="Today"
                title="Prepare chalkboard"
                hint="Pin clips and drills. Tap to open."
              >
                <ChalkboardPanel viewer={activeProfile} onToday embed />
              </TodayDock>
              <TodayDock
                id="collage"
                icon="🎬"
                eyebrow="Class drills"
                title="Collages"
                hint="Play the board. Save it. Keep editing later."
              >
                <TodayCollages
                  viewer={activeProfile}
                  onOpenLibrary={() => goTab('classes')}
                  embed
                />
              </TodayDock>
              <TodayDock
                id="chalk-library"
                icon="📋"
                eyebrow="Class drills"
                title="Chalkboards"
                hint="Skill boards you can open in any class."
              >
                <TodayChalkboards
                  viewer={activeProfile}
                  onOpenLibrary={() => goTab('classes')}
                  embed
                />
              </TodayDock>
              </div>
            ) : (
              <HomeDashboard
                athletes={athletes}
                signedIn={previewProfile}
                gymAdmin={deskPreview === 'home' && isShapelabAdmin(activeProfile)}
                onUnlock={(id) => requestSelectAthlete(id)}
                onStartLesson={startLesson}
                onOpenLesson={(session) => {
                  resumeLessonSession(session.id)
                  setLessonTick((n) => n + 1)
                }}
                onStartClass={() => setClassSessionOpen(true)}
                onOpenNamesTest={(groupId) => {
                    setNamesQuizGroupId(groupId ?? 'desk')
                  setNamesQuizOpen(true)
                }}
                onOpenSkillPaths={() => setSkillPathsOpen(true)}
                onOpenSkillPathGuide={() => {
                  stashMobileSearchJump({ kind: 'skillPath' })
                  goTab('learn')
                }}
                classSessionOpen={classSessionOpen}
                onOpenChecklist={() => setShowChecklist(true)}
                onViewProfile={openProfile}
                onAthletesChange={setAthleteRoster}
                onParentHomework={(id) => {
                  setParentFocusId(id)
                  goTab('homework')
                }}
                onOpenProfile={() => {
                  if (activeProfile) setProfileOpen(true)
                  else requestSelectAthlete(athletes[0]?.id ?? null)
                }}
                onShortcut={(id) => {
                  if (id === 'library') {
                    setLearnIntent('shapes')
                    goTab('learn')
                  } else if (id === 'quiz') {
                    setLearnIntent('quiz')
                    goTab('learn')
                  } else if (id === 'names') {
                    setNamesQuizGroupId('desk')
                    setNamesQuizOpen(true)
                  } else if (id === 'skillpaths') {
                    setSkillPathsOpen(true)
                  } else if (id === 'replay') {
                    openCompareWithReference()
                  } else if (id === 'scroll') {
                    goTab('scroll')
                  } else if (id === 'feed') {
                    goTab('feed')
                  } else if (id === 'wins') {
                    goTab('wins')
                  } else if (id === 'homework') {
                    goTab('homework')
                  } else if (id === 'station') {
                    setStationOpen(true)
                  } else if (id === 'profile') {
                    if (activeProfile) setProfileOpen(true)
                    else requestSelectAthlete(athletes[0]?.id ?? null)
                  } else if (id === 'clock') {
                    setClockOpen(true)
                  } else if (id === 'arcade') {
                    setArcadeOpen(true)
                  } else if (id === 'collages') {
                    goTab('classes')
                  }
                }}
              />
            )}
          </div>
          <TodayDock
            id="floor"
            icon="📷"
            eyebrow="Floor"
            title="Floor camera"
            hint="See the mat. No score or grade."
          >
            <TodayFloorCamera
              embed
              mirror={settings.mirrorVideo}
              showJointAngles={settings.showAngles}
              referencePhotos={referencePhotos}
              onOpenCompareWithReference={openCompareWithReference}
              onShowJointAnglesChange={(showAngles) =>
                setSettings((current) => ({ ...current, showAngles }))
              }
            />
          </TodayDock>
        </div>
        </div>
      )}

      {ryanEdit && tab === 'tasks' && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.85fr)]">
          <TasksWorkspace
            shape={shape}
            score={score}
            qualityThreshold={qualityThreshold}
            referencePhotos={referencePhotos}
            videoRef={camera.videoRef}
            canvasRef={camera.canvasRef}
            landmarks={activeLandmarks}
            mirror={settings.mirrorVideo}
            showAngles={settings.showAngles}
            cameraRunning={camera.running}
            stream={camera.stream}
            cameraControls={cameraControls}
            cameraError={camera.error}
            hitPreviewUrl={hitPreviewUrl}
            liveUi={taskLiveUi}
            onSkipNextTask={() => skipNextRef.current?.()}
            fullscreen={camFullscreen}
            onFullscreenChange={setCamFullscreen}
          />

          <div className="panel-scroll flex max-h-[calc(100vh-6.5rem)] flex-col gap-3 overflow-y-auto">
            <AthletePanel
              athletes={athletes}
              activeId={activeAthleteId}
              onChangeAthletes={setAthleteRoster}
              onSelect={requestSelectAthlete}
              viewer={activeProfile}
            />
            <TaskTrainer
              athleteId={activeAthleteId}
              progress={taskProgress}
              onProgressChange={setTaskProgress}
              overallScore={score.overall}
              qualityThreshold={qualityThreshold}
              mainCorrection={score.mainCorrection}
              score={score}
              scoredShapeId={shape.id}
              onRequestShape={onJumpToShape}
              referencePhotos={referencePhotos}
              onReferencesChange={setReferencePhotos}
              voiceEnabled={settings.voiceEnabled}
              onVoiceEnabledChange={(on) =>
                setSettings((s) => ({ ...s, voiceEnabled: on }))
              }
              timingActive={timingActive}
              videoRef={camera.videoRef}
              canvasRef={camera.canvasRef}
              cameraRunning={camera.running}
              onEnsureCamera={() => camera.start()}
              onHitPreview={(blob) => {
                setHitPreviewUrl((prev) => {
                  if (prev) URL.revokeObjectURL(prev)
                  return URL.createObjectURL(blob)
                })
              }}
              onLiveUi={setTaskLiveUi}
              skipNextRef={skipNextRef}
              onRequestFullscreen={() => setCamFullscreen(true)}
            />
          </div>
        </div>
      )}

      {tab === 'tasks2' && (
        <PanelErrorBoundary label="Practice">
        <div className="grid min-h-[16rem] gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.95fr)]">
          <div className="order-2 min-w-0 xl:order-1">
          <TasksWorkspace
            shape={shape}
            score={score}
            qualityThreshold={qualityThreshold}
            referencePhotos={referencePhotos}
            videoRef={camera.videoRef}
            canvasRef={camera.canvasRef}
            landmarks={activeLandmarks}
            mirror={settings.mirrorVideo}
            showAngles={settings.showAngles}
            cameraRunning={camera.running}
            stream={camera.stream}
            cameraControls={cameraControls}
            cameraError={camera.error}
            hitPreviewUrl={hitPreviewUrl}
            liveUi={null}
            flowMode
            cueLine={flowCue}
            previewItems={flowPreview}
            fullscreen={camFullscreen}
            onFullscreenChange={setCamFullscreen}
            holdSeconds={holdClock}
            holdSecondsRef={holdSecondsRef}
            holdScoreGate={holdChallenge}
            flowIdle={flowPhase === 'idle'}
            onStartFlow={() => {
              startFlowRef.current()
            }}
            showHoldDone={flowPhase === 'holding' || flowPhase === 'finishing'}
            holdDoneBusy={flowPhase === 'finishing'}
            hideDelayCam={holdChallenge}
            onDoneHold={() => holdDoneRef.current()}
          />
          </div>

          <div className="order-1 panel-scroll flex max-h-[calc(100vh-6.5rem)] min-h-[12rem] flex-col gap-3 overflow-y-auto xl:order-2">
            <Tasks2Panel
              athleteId={activeAthleteId}
              athlete={athletes.find((a) => a.id === activeAthleteId) ?? null}
              athletes={athletes}
              onOpenTour={openTour}
              assignedSequenceId={assignedFlowId}
              onAssignedSequenceConsumed={consumeAssignedFlow}
              score={score}
              scoredShapeId={shape.id}
              onRequestShape={onJumpToShape}
              referencePhotos={referencePhotos}
              voiceEnabled={settings.voiceEnabled}
              onVoiceEnabledChange={(on) =>
                setSettings((s) => ({ ...s, voiceEnabled: on }))
              }
              canvasRef={camera.canvasRef}
              cameraRunning={camera.running}
              stream={camera.stream}
              onEnsureCamera={() => camera.start()}
              onCue={setFlowCue}
              onPreviewItems={setFlowPreview}
              onRequestFullscreen={() => setCamFullscreen(true)}
              onExitFullscreen={() => setCamFullscreen(false)}
              cameraFullscreen={camFullscreen}
              landmarks={activeLandmarks}
              mirror={settings.mirrorVideo}
              cameraError={camera.error}
              onFlowPhase={setFlowPhase}
              onHoldChallenge={setHoldChallenge}
              onRegisterStart={(fn) => {
                startFlowRef.current = fn
              }}
              onRegisterHoldDone={(fn) => {
                holdDoneRef.current = fn
              }}
              onHoldClock={(seconds) => {
                holdSecondsRef.current = seconds
                setHoldClock((prev) => {
                  const next = seconds == null ? null : Math.round(seconds * 10) / 10
                  return prev === next ? prev : next
                })
              }}
              onHitPreview={(blob) => {
                setHitPreviewUrl((prev) => {
                  if (prev) URL.revokeObjectURL(prev)
                  return URL.createObjectURL(blob)
                })
              }}
            />
          </div>
        </div>
        </PanelErrorBoundary>
      )}

      {tab === 'homework' && (
        <PanelErrorBoundary label="Homework">
        <div className="flex min-h-[16rem] flex-col gap-3">
          {!hwStudio && activeAthleteId ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-2">
              {!athleteViewAthlete && activeProfile && profileRole(activeProfile) === 'parent' ? (
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm text-[var(--text)]">
                    Signed in as <strong>{activeProfile.name}</strong>
                    <span className="text-[var(--muted)]">
                      {' '}
                      — logging homework for{' '}
                      <strong>{homeworkAthlete?.name ?? 'your athlete'}</strong>
                    </span>
                  </p>
                  {parentKids.length > 1 && (
                    <label className="block text-[11px] text-[var(--muted)]">
                      Which athlete
                      <select
                        className="ml-2 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1 text-sm text-[var(--text)]"
                        value={homeworkAthleteId ?? ''}
                        onChange={(e) => setParentFocusId(e.target.value || null)}
                      >
                        {parentKids.map((k) => (
                          <option key={k.id} value={k.id}>
                            {k.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[var(--text)]">
                  Signed in as{' '}
                  <strong>
                    {athletes.find((a) => a.id === activeAthleteId)?.name ?? 'athlete'}
                  </strong>
                  <span className="text-[var(--muted)]">
                    {' '}
                    — holds you log stay on this profile
                  </span>
                </p>
              )}
              {!athleteViewAthlete && (
                <button
                  type="button"
                  onClick={() => requestSelectAthlete(null)}
                  className="text-xs text-[var(--muted)] underline"
                >
                  Switch profile
                </button>
              )}
            </div>
          ) : null}
          {!hwStudio && !activeAthleteId ? (
            <AthletePanel
              athletes={athletes}
              activeId={activeAthleteId}
              onChangeAthletes={setAthleteRoster}
              onSelect={requestSelectAthlete}
              viewer={activeProfile}
            />
          ) : null}
          {showLogForPicker && !hwStudio && activeAthleteId ? (
            <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-2">
              {!logForOpen ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-[var(--text)]">
                    Logging holds for{' '}
                    <strong>
                      {trainGuest
                        ? 'a guest (nothing will log)'
                        : (trainLogForAthlete?.name ?? 'this profile')}
                    </strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => setLogForOpen(true)}
                    className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold"
                  >
                    Change who's training
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <LogForPicker
                    athletes={athletes}
                    selectedId={trainGuest ? null : trainLogForId}
                    guest={trainGuest}
                    onSelect={(id) => {
                      setTrainLogForId(id)
                      setTrainGuest(false)
                      setLogForOpen(false)
                    }}
                    onGuest={() => {
                      setTrainGuest(true)
                      setLogForOpen(false)
                    }}
                    onReset={() => {
                      setTrainLogForId(null)
                      setTrainGuest(false)
                      setLogForOpen(false)
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setLogForOpen(false)}
                    className="self-end text-xs text-[var(--muted)] underline"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          ) : null}
          {!hwStudio && (
            <button
              type="button"
              onClick={() => openHwTour()}
              className="rounded-xl border border-[var(--accent)]/60 bg-[var(--accent)]/10 px-4 py-2.5 text-sm font-black text-[var(--accent)]"
              style={{
                animation: 'sl-skill-pulse 2.4s ease-in-out infinite',
                boxShadow:
                  '0 0 18px rgba(52,211,153,0.35), 0 0 44px rgba(52,211,153,0.15)',
              }}
            >
              ✨ Take the guided tour
            </button>
          )}
          {foundationVisible && (
            <div>
              <AthleteFoundation athlete={(trainLogForAthlete ?? homeworkAthlete)!} />
            </div>
          )}
          <HomeworkPanel
            athleteId={trainLogForAthleteId}
            athlete={trainLogForAthlete ?? homeworkAthlete}
            viewer={activeProfile}
            athletes={athletes}
            suspendWrites={trainGuest}
            onTakeTour={openHwTour}
            onUpdateAthlete={(patch) => {
              if (!trainLogForAthleteId) return
              setAthleteRoster(
                athletes.map((a) => (a.id === trainLogForAthleteId ? { ...a, ...patch } : a)),
              )
            }}
            score={score}
            currentShapeId={shape.id}
            onRequestShape={onJumpToShape}
            timingActive={timingActive}
            voiceEnabled={settings.voiceEnabled}
            referencePhotos={referencePhotos}
            landmarks={activeLandmarks}
            onEnsureCamera={() => camera.start()}
            onStudioChange={setHwStudio}
            onOpenClassFlow={(flowId) => {
              setAssignedFlowId(flowId)
              goTab('tasks2')
            }}
            camSlot={
              hwStudio ? (
                <div className="flex flex-col gap-3">
                  <CameraStage
                    videoRef={camera.videoRef}
                    canvasRef={camera.canvasRef}
                    landmarks={activeLandmarks}
                    mirror={settings.mirrorVideo}
                    showAngles={settings.showAngles}
                    running={camera.running}
                    shape={shape}
                    score={score}
                  />
                  {cameraControls}
                  {camera.error && (
                    <p className="rounded-lg border border-[var(--bad)]/40 bg-[#2a1518] px-3 py-2 text-sm text-[var(--bad)]">
                      {camera.error}
                    </p>
                  )}
                  <ScorePanel
                    shape={shape}
                    score={score}
                    qualityThreshold={qualityThreshold}
                    totalHoldSeconds={hold.totalHoldSeconds}
                    qualityHoldSeconds={hold.qualityHoldSeconds}
                    onResetTimer={hold.reset}
                    onSave={saveAttempt}
                    canSave={Boolean(activeAthleteId)}
                    collapseWhatWeGrade
                  />
                </div>
              ) : null
            }
          />
        </div>
        </PanelErrorBoundary>
      )}

      {tab === 'warmup' && <WarmupPanel signedIn={activeProfile} />}

      {tab === 'learn' && deskRole === 'parent' && <ParentEducationDesk initialArticleId={parentGuideArticleId} />}
      {tab === 'learn' && deskRole !== 'parent' && ryanEdit && (
        <details className="mb-4 rounded-xl border border-white/10 bg-white/5">
          <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-white/80">
            Coach interview · 28 answers
          </summary>
          <div className="px-4 pb-4">
            <CoachInterviewPanel />
          </div>
        </details>
      )}
      {tab === 'learn' && deskRole !== 'parent' && (
        <EducationPanel
          key={deskRole}
          referencePhotos={referencePhotos}
          athleteId={activeAthleteId}
          athleteName={athletes.find((a) => a.id === activeAthleteId)?.name ?? null}
          persistIgToApp={ryanEdit}
          onReferencesChange={setReferencePhotos}
          signedIn={previewProfile}
          athletes={athletes}
          classAthletes={liveClassAthletes}
          intent={learnIntent}
          onIntentConsumed={() => setLearnIntent(null)}
          onOpenNamesTest={
            previewProfile && isCoachProfile(previewProfile)
              ? (groupId) => {
                  setNamesQuizGroupId(groupId ?? 'desk')
                  setNamesQuizOpen(true)
                }
              : undefined
          }
          onOpenSkillPaths={
            previewProfile && isCoachProfile(previewProfile)
              ? () => setSkillPathsOpen(true)
              : undefined
          }
          surface="learn"
          presetQuizTaker={quizPreset}
          preferredQuizIds={[
            ...new Set([
              ...(liveClass
                ? [
                    ...(getOffering(liveClass.offeringId)?.rosterIds ?? []),
                    ...priorOfferingAthleteIds(liveClass.offeringId),
                  ]
                : []),
            ]),
          ]}
          onQuizTaker={(taker) => {
            markClassAttendance({
              athleteId: taker.athleteId,
              firstName: taker.firstName,
              lastName: taker.lastName,
              source: 'shape_test',
            })
          }}
          onRecordQuiz={(taker, record) => {
            if (taker.athleteId) {
              setAthleteRoster(
                athletes.map((a) =>
                  a.id === taker.athleteId ? appendShapeTest(a, record) : a,
                ),
              )
              return
            }
            rememberGuestGrade(taker.firstName, taker.lastName, record)
          }}
          onAthleteChange={(next) => {
            setAthleteRoster(athletes.map((a) => (a.id === next.id ? next : a)))
            void syncAthleteProfileToResearch(next, activeProfile?.id ?? next.id)
          }}
          onParkQuiz={() => {
            setQuizPreset(null)
            setLearnIntent(null)
            goTab('today')
          }}
          onFinishQuizToday={() => {
            setQuizPreset(null)
            setLearnIntent(null)
            goTab('today')
            setStationOpen(false)
          }}
          onFinishQuizAnother={() => {
            setQuizPreset(null)
            setLearnIntent(null)
            goTab('today')
            setStationOpen(true)
          }}
          onOpenTour={() => openTour(LEARN_TOUR)}
          onCompareWithReference={(clip: PhoneReelClip) =>
            openCompareWithReference({
              src: clip.url,
              name: clip.name || 'Reference',
              itemId: clip.id,
            })
          }
        />
      )}

      {tab === 'scroll' && (
        <EducationPanel
          referencePhotos={referencePhotos}
          athleteId={activeAthleteId}
          athleteName={athletes.find((a) => a.id === activeAthleteId)?.name ?? null}
          persistIgToApp={ryanEdit}
          onReferencesChange={setReferencePhotos}
          signedIn={activeProfile}
          athletes={athletes}
          intent="scroll"
          surface="videos"
          onOpenTour={() => openTour(SCROLL_TOUR)}
          onCompareWithReference={(clip: PhoneReelClip) =>
            openCompareWithReference({
              src: clip.url,
              name: clip.name || 'Reference',
              itemId: clip.id,
            })
          }
        />
      )}

      {tab === 'coachlib' && (
        <CoachShapeLibrary
          signedIn={activeProfile}
          athletes={athletes}
          onOpenNetwork={() => goTab('network')}
        />
      )}

      {tab === 'mysystem' && (
        <MySystemPanel
          signedIn={activeProfile}
          athletes={athletes}
          ryanEdit={ryanEdit}
          onOpenTour={openTour}
          onOpenWizard={() => setCoachWizardOpen(true)}
          onOpenBuilder={(skillId, unscoped) => {
            setSkillBuilderStart(skillId)
            setSkillBuilderUnscoped(unscoped)
            setSkillPathsOpen(true)
          }}
        />
      )}

      {tab === 'drills' && <DrillLibraryPanel signedIn={activeProfile} />}

      {tab === 'spotting' && <SpottingPanel />}
      {tab === 'chat' && <ChatPanel onOpenTab={goTab} canEditFaq={ryanEdit} viewerRole={previewRole} />}

      {(compareOpened || tab === 'compare') && (
        <div className={tab === 'compare' ? '' : 'hidden'} hidden={tab !== 'compare'}>
          <CompareErrorBoundary>
            <ComparePanel
              onSaveIgStill={saveIgStill}
              referencePhotos={referencePhotos}
              persistIgToApp={ryanEdit}
              athleteId={liveLesson?.athleteId ?? activeAthleteId}
              athleteName={
                athletes.find((a) => a.id === (liveLesson?.athleteId ?? activeAthleteId))?.name ??
                null
              }
              gymEditor={ryanEdit}
              personalEditor={personalCompare}
              enterFullscreenTick={compareFullTick}
              incomingReference={compareIncomingRef}
              videoSource={liveLesson ? 'lesson' : undefined}
              lessonId={liveLesson?.id ?? null}
              skillId={liveLesson ? shape.id : null}
              skillLabel={liveLesson ? shape.name : null}
              classId={liveClass?.offeringId ?? null}
              className={liveClassOffering ? classLabel(liveClassOffering) : null}
              lessonBar={
                liveLesson ? (
                  <LessonNoteBar
                    coachId={liveLesson.coachId}
                    placeholder="Compare note for this athlete…"
                    onAdd={(text, topic, audience) => {
                      const next = addLessonNote(liveLesson.id, text, 'compare', {
                        kind: topic.kind,
                        id: topic.id,
                        label: topic.label,
                        audience,
                      })
                      if (next) setLessonTick((n) => n + 1)
                    }}
                  />
                ) : null
              }
            />
          </CompareErrorBoundary>
        </div>
      )}

      {tab === 'classes' && (
        <ClassesPanel
          athlete={athletes.find((a) => a.id === activeAthleteId) ?? null}
          onOpenTour={openTour}
        />
      )}

      {tab === 'feed' && (
        <FeedPanel
          athletes={athletes}
          athlete={athletes.find((a) => a.id === activeAthleteId) ?? null}
          channel={feedChannel}
        />
      )}

      {tab === 'wins' && (
        <FeedPanel
          athletes={athletes}
          athlete={athletes.find((a) => a.id === activeAthleteId) ?? null}
          channel="wins"
        />
      )}

      {tab === 'network' && (
        <NetworkPanel
          athletes={athletes}
          athlete={athletes.find((a) => a.id === activeAthleteId) ?? null}
          onViewProfile={openProfile}
          initialPage="messages"
        />
      )}

      {tab === 'research' && !floorKiosk && (
        <ResearchPanel
          athletes={athletes}
          athlete={athletes.find((a) => a.id === activeAthleteId) ?? null}
        />
      )}

      {ryanEdit && tab === 'coach' && (
        <div className="grid gap-4 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
          <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4 lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
              Practice
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Live scoring</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Score shapes with the stable Practice camera. Videos / Compare keeps
              its independent Version 1 delay camera and replay buffer.
            </p>
          </section>
          <div className="flex flex-col gap-3">
            <CameraStage
              videoRef={camera.videoRef}
              canvasRef={camera.canvasRef}
              landmarks={activeLandmarks}
              mirror={settings.mirrorVideo}
              showAngles={settings.showAngles}
              running={camera.running}
              shape={shape}
              score={score}
              compact
            />
            {cameraControls}
            <StillOverlayPicker photos={referencePhotos} compact />
            {camera.error && (
              <p className="rounded-lg border border-[var(--bad)]/40 bg-[#2a1518] px-3 py-2 text-sm text-[var(--bad)]">
                {camera.error}
              </p>
            )}
            {saveFlash && (
              <p className="rounded-lg border border-[var(--accent)]/30 bg-[#102820] px-3 py-2 text-sm text-[var(--accent)]">
                {saveFlash}
              </p>
            )}
          </div>

          <div className="panel-scroll flex max-h-[calc(100vh-6.5rem)] flex-col gap-3 overflow-y-auto">
            <ShapeSelector selectedId={shape.id} onSelect={onSelectShape} />
            <ScorePanel
              shape={shape}
              score={score}
              qualityThreshold={qualityThreshold}
              totalHoldSeconds={hold.totalHoldSeconds}
              qualityHoldSeconds={hold.qualityHoldSeconds}
              onResetTimer={hold.reset}
              onSave={saveAttempt}
              canSave={Boolean(activeAthleteId)}
            />
            <AthletePanel
              athletes={athletes}
              activeId={activeAthleteId}
              onChangeAthletes={setAthleteRoster}
              onSelect={requestSelectAthlete}
              viewer={activeProfile}
            />
            <SequencePanel
              currentShapeId={shape.id}
              overallScore={score.overall}
              onJumpToShape={onJumpToShape}
            />
          </div>
        </div>
      )}

      {tab === 'wellness' && deskRole === 'parent' && (
        <ParentWellnessDesk accountId={authUser.accountId} />
      )}

      {tab === 'progress' && (
        <AthleteProgress athlete={homeworkAthlete ?? activeProfile} />
      )}

      {tab === 'classclock' && deskRole === 'athlete' && previewProfile && (
        <div className="mx-auto max-w-2xl">
          <section className="mb-4 rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
              Class clock
            </p>
            <h2 className="mt-1 text-xl font-semibold">Quick homework log</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Pick a hold or rep drill, run the timer, and log it on your profile — same clock coaches
              use in class.
            </p>
          </section>
          <ClassStopwatch
            athletes={athletes}
            signedIn={previewProfile}
            embed
            floorMode
            candidates={[previewProfile]}
          />
        </div>
      )}

      {tab === 'history' && deskRole === 'parent' && (
        <div className="mx-auto grid max-w-3xl gap-4">
          <AthletePanel
            athletes={parentKids}
            activeId={parentFocusId ?? parentKids[0]?.id ?? null}
            onChangeAthletes={setAthleteRoster}
            onSelect={(id) => {
              setParentFocusId(id)
              if (id) openProfile(id)
            }}
            allowCreate={false}
            onViewProfile={openProfile}
            viewer={activeProfile}
          />
        </div>
      )}

      {tab === 'history' && deskRole === 'athlete' && (
        <div className="mx-auto grid max-w-3xl gap-4">
          <AthletePanel
            athletes={activeProfile ? [activeProfile] : []}
            activeId={activeProfile?.id ?? null}
            onChangeAthletes={setAthleteRoster}
            onSelect={requestSelectAthlete}
            allowCreate={false}
            onViewProfile={openProfile}
            viewer={activeProfile}
          />
        </div>
      )}

      {tab === 'history' && deskRole !== 'parent' && deskRole !== 'athlete' && (
        <div className="mx-auto grid min-w-0 max-w-3xl gap-4">
          {ryanEdit && <GymRecords athletes={athletes} onAthletes={setAthleteRoster} />}
          <AthletePanel
            athletes={athletes}
            activeId={activeAthleteId}
            onChangeAthletes={setAthleteRoster}
            onSelect={requestSelectAthlete}
            allowDelete={ryanEdit}
            canSeeAllProfiles={ryanEdit}
            onViewProfile={openProfile}
            viewer={activeProfile}
          />
          <ProgressHistory attempts={attempts} athleteId={activeAthleteId} />
          <VideoLibraryPanel
            athleteId={activeAthleteId}
            athleteName={athletes.find((a) => a.id === activeAthleteId)?.name ?? null}
            showClassFolders={Boolean(activeProfile && isCoachProfile(activeProfile))}
          />
          <CoachInbox athletes={athletes} />
        </div>
      )}

      {tab === 'accounts' && !floorKiosk && (
        <AccountsDesk
          user={authUser}
          athletes={athletes}
          onUser={setAuthUser}
          onLock={lockAway}
          deskPreview={deskPreview}
          onDeskPreview={chooseDeskPreview}
        />
      )}

      {tab === 'owner' && ownerView && activeProfile && authUser && (
        <OwnerDashboard
          owner={activeProfile}
          athletes={athletes}
          user={authUser}
          gym={ownerGym}
          onAthletesChange={setAthleteRoster}
        />
      )}

      {tab === 'consent' && !floorKiosk && <ConsentDesk user={authUser} />}

      {tab === 'stills' && !floorKiosk && sessionIsAdmin(authUser) && (
        <StillTagDesk user={authUser} />
      )}

      {tab === 'watch' && !floorKiosk && <WatchDesk user={authUser} />}

      {tab === 'about' && (
        <div className="mx-auto max-w-2xl space-y-3 text-sm leading-relaxed text-[var(--muted)]">
          <CollapsibleSection title="What this is" hint="Free shape-coaching gym app">
            <p>
              shapelab is a free gymnastics shape-coaching app. Profiles, phones, and
              homework stay in the app on this gym link. Add a Blob store on the claimed
              Vercel project so class sign-ups are still here tomorrow. Only the gym
              admin sees every profile&apos;s shared phones and photos. Your own
              profile still shows what you entered. Gym photos, wins, and athlete
              clips play through this signed-in gym — the app does not hand the
              browser a public file link.
            </p>
          </CollapsibleSection>
          <CollapsibleSection title="Classes and the gym feed" hint="Boards, feed, who can post">
            <p className="mb-2">
              <strong className="text-[var(--text)]">Classes</strong> saves named drill
              collages (up to six gym URLs) with captions and A/B loops into your class
              library. After a board is saved, Edit (or the menu on each panel)
              changes which video plays there — the same clip can be on more than
              one tile. Duplicate copies a board into your class library. Full
              screen is the videos only, tiles sharing an edge.
              Share a board to the gym feed so other coaches can save a copy.{' '}
              <strong className="text-[var(--text)]">Feed</strong> is the gym wall —
              a thought, a hit video, or a shared class collage. Video is optional.
              Coaches tag athletes, athletes tag their coach. Unlock a profile to post.
              Fellow coaches and gym owners create a profile on Profiles (gym owner, coach,
              athlete, or parent), keep their own Compare collections, and use Classes, Feed,
              Network, and Research. Ryan stays shapelab admin —
              only that profile edits the shared Compare library, shape descriptions,
              and picture sizes. The first <strong className="text-[var(--text)]">Tasks</strong>{' '}
              tab and <strong className="text-[var(--text)]">Coach</strong> stay hidden unless
              Ryan is unlocked.
            </p>
          </CollapsibleSection>
          <CollapsibleSection title="Theme" hint="Favorite color wash">
            <p className="mb-3">
              Default is your favorite color. Pick another build here if you want
              the whole app in a different wash.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSettings((s) => ({ ...s, themeColor: 'auto' }))}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                  !settings.themeColor || settings.themeColor === 'auto'
                    ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                    : 'border border-[var(--panel-border)]'
                }`}
              >
                Favorite color
              </button>
              {FAVORITE_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={c.label}
                  onClick={() => setSettings((s) => ({ ...s, themeColor: c.id }))}
                  className={`h-9 w-9 rounded-full border-2 ${
                    settings.themeColor === c.id ? 'border-white' : 'border-transparent'
                  }`}
                  style={{ background: c.swatch }}
                />
              ))}
            </div>
          </CollapsibleSection>
          <CollapsibleSection title="Reminders" hint="Homework, likes, high-fives">
            <p className="mb-3">
              Homework nudges, likes, follows, wins, and high-fives. Turn them off
              here or with the Reminders checkbox on camera screens.
            </p>
            <label className="flex items-center gap-2 text-[var(--text)]">
              <input
                type="checkbox"
                checked={settings.notificationsEnabled}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, notificationsEnabled: e.target.checked }))
                }
              />
              Notifications on
            </label>
          </CollapsibleSection>
          <CollapsibleSection title="Network" hint="Follow, message, coach lounge">
            <p>
              <strong className="text-[var(--text)]">Network</strong> is follow, message, and
              the coach lounge. Unlock a profile to follow someone on this gym, send a
              direct message, or paste a public clip URL. The lounge is coaches only —
              tumbling philosophies, tagged by topic, with a “why I coach it this way”
              box so Research can count what people argue about. Athletes can read the
              digest on Research; posting stays in the lounge.
            </p>
          </CollapsibleSection>
          <CollapsibleSection title="Research" hint="Studies on this gym, not a census">
            <p>
              <strong className="text-[var(--text)]">Research</strong> uses the scientific
              method on this gym’s tumbling: a question, a hypothesis, a log, then counts.
              Laterality (hand, front foot, twist, doubles, triples, skate stance),
              panel-mat layers on a first standing full, why people tumble, and fear /
              mental blocks. Correlations are crosstabs, not causes. n is this gym.
              Dump future study ideas in the inbox. The lounge digest counts coach
              threads by topic, who posted, and how often they wrote their reasoning.
              Unlock a profile to log studies; anyone can read findings.
            </p>
          </CollapsibleSection>
          <CollapsibleSection title="Learn without a camera" hint="Shapes, tests, physics">
            <p className="mb-2">
              Open the <strong className="text-[var(--text)]">Learn</strong> tab to study shapes
              (cues, criteria, reference photos) and the full task pathway before practicing.
              Take a <strong className="text-[var(--text)]">Shape test</strong> (pictures,
              descriptions, or both — notes do not name the answer) or the{' '}
              <strong className="text-[var(--text)]">Physics test</strong> — when you
              finish, you see the score and every miss with the correct answer.
              Review <strong className="text-[var(--text)]">My shapes</strong>, and keep one coach photo
              per position in the <strong className="text-[var(--text)]">Glossary</strong> (plus an
              Extra folder for shapes you will not practice on camera).{' '}
              <strong className="text-[var(--text)]">Tumbling physics</strong> covers inertia,
              angular momentum, moment of inertia, speeding and slowing rotation, the
              round-off to back handspring arm drop, and why layouts expose a weak set.
            </p>
          </CollapsibleSection>
          <CollapsibleSection title="Tasks 2 — class flow" hint="Named sequences, stills, then counts">
            <p className="mb-2">
              <strong className="text-[var(--text)]">Tasks 2</strong> is the same shapes, run
              the way class runs: we name the sequence (LG LV HS LG), show the stills, then tell
              you <strong className="text-[var(--text)]">side view, stand clean</strong> before
              counts start. Sequences: <strong className="text-[var(--text)]">LG LV HS LG
              (Cartwheel side)</strong>, the same flow on the{' '}
              <strong className="text-[var(--text)]">NON Cartwheel side</strong>,{' '}
              <strong className="text-[var(--text)]">MC HS LV LG</strong>, and{' '}
              <strong className="text-[var(--text)]">MC HS LG (Assisted)</strong> — a spotted
              handstand with a coach, friend, or parent — and{' '}
              <strong className="text-[var(--text)]">MC HS 5 reps</strong>, and{' '}
              <strong className="text-[var(--text)]">Long Bridge</strong> — the class
              talk-through after rainbow shoulders are open (two snapshots: before chin
              to chest, then after) — and <strong className="text-[var(--text)]">Pike → Hollow → Arch</strong>,
              the snap-open drill for handsprings and whips. The assisted run grades the{' '}
              <strong className="text-[var(--text)]">handstand only</strong>; five-reps grades each
              kick, numbered 1–5, assisted or not. The replay is
              mountain climber through landing lunge. After you clean, you get a
              fullscreen replay of the run, a snapshot of each graded shape with a score, and a few
              written cues to think about next time. Go again, take the next sequence, or pick
              another. Progress
              over time lets you download the video and analysis, share a Story caption + clip to
              Instagram, or mark the run for Ryan on this device.
            </p>
          </CollapsibleSection>
          <CollapsibleSection title="Athlete Tasks pathway" hint="Curriculum holds and sequences">
            <p className="mb-2">
              Open the <strong className="text-[var(--text)]">Tasks</strong> tab, pick an athlete,
              and work through the ordered curriculum. Standalone holds start at 5s and drop to 3s after
              mastery. Sequences always use 3s holds, and FTOS in those sequences does not require
              facing the camera. Freestanding handstand is <strong className="text-[var(--text)]">three kick-up tries</strong> —
              we grade the best line in a written analysis, and it does not block moving on (wall
              handstand stays on Homework). Required to pass the lunge–lever sequences:{' '}
              <strong className="text-[var(--text)]">FTOS, starting lunge, lever, landing lunge</strong>.
              After each task you can read corrections. Voice talks you through the
              passé–lunge–lever–handstand walkthrough when you get there. Coach stills are labeled
              with the shape we are asking — a lever still for lever, a mountain climber still for
              mountain climber.
            </p>
          </CollapsibleSection>
          <CollapsibleSection title="How coaches edit scoring" hint="shapes.ts, curriculum, sequences">
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Open <code className="text-[var(--accent)]">src/config/shapes.ts</code>
              </li>
              <li>Find the shape (Handstand is the full reference example).</li>
              <li>
                Adjust <code>target</code> / <code>tolerance</code> / <code>weight</code> / feedback
                strings.
              </li>
              <li>
                Curriculum order:{' '}
                <code className="text-[var(--accent)]">src/config/curriculum.ts</code>
              </li>
              <li>
                Sequences: edit <code className="text-[var(--accent)]">src/config/sequences.ts</code>
              </li>
            </ol>
          </CollapsibleSection>
          <CollapsibleSection title="Roadmap hooks" hint="What the architecture can grow into">
            <p className="mb-2">Architecture is ready to grow into:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Cartwheel head/gaze and hand placement grading</li>
              <li>Roundoff body segmentation</li>
              <li>Handstand forward roll &amp; back extension roll grading</li>
              <li>V-ups and more dynamic skills</li>
              <li>Drills mastered library &amp; skill progression roadmaps</li>
              <li>Richer education media (video demos, drill libraries)</li>
              <li>Folders &amp; groups for athletes</li>
              <li>Progress sharing with parents or athletes</li>
            </ul>
          </CollapsibleSection>
        </div>
      )}

      <ImproveNotesDock page={tab} />
      </IgMobileShell>
    </div>
    {stationOpen && (
      <ClassStation
        athletes={athletes}
        viewer={activeProfile}
        onClose={() => setStationOpen(false)}
        onSaveAthlete={(athlete, mode) => {
          if (mode === 'create') {
            const created =
              activeProfile && isCoachProfile(activeProfile)
                ? linkAthleteToCoach(athlete.id, activeProfile.id).find((a) => a.id === athlete.id) ?? {
                    ...athlete,
                    createdByCoachId: activeProfile.id,
                    worksWithCoachIds: [...new Set([...(athlete.worksWithCoachIds ?? []), activeProfile.id])],
                  }
                : athlete
            setAthleteRoster(
              athletes.some((a) => a.id === created.id)
                ? athletes.map((a) => (a.id === created.id ? created : a))
                : [...athletes, created],
            )
          } else {
            setAthleteRoster(athletes.map((a) => (a.id === athlete.id ? { ...a, ...athlete } : a)))
          }
          void syncAthleteProfileToResearch(athlete, activeProfile?.id ?? athlete.id)
          markClassAttendance({
            athleteId: athlete.id,
            firstName: athlete.firstName || splitPersonName(athlete.name).firstName,
            lastName: athlete.lastName || splitPersonName(athlete.name).lastName,
            source: 'profile',
          })
        }}
        onStartShapeTest={(athlete) => {
          const parts = splitPersonName(athlete.name)
          setQuizPreset({
            firstName: athlete.firstName || parts.firstName,
            lastName: athlete.lastName || parts.lastName,
            athleteId: athlete.id || undefined,
          })
          setStationOpen(false)
          setLearnIntent('quiz')
          goTab('learn')
        }}
      />
    )}
    {storyComposerOpen && activeProfile && (
      <StoryComposer
        athlete={activeProfile}
        athletes={athletes}
        onClose={() => setStoryComposerOpen(false)}
        onPosted={() => setStoryComposerOpen(false)}
      />
    )}
    {profileOpen && activeProfile && (
      <AthleteProfileCard
        athlete={athleteViewAthlete ?? activeProfile}
        viewer={activeProfile}
        athletes={athletes}
        variant="overlay"
        onClose={() => setProfileOpen(false)}
        onOpenTour={() => openTour(PROFILE_TOUR)}
        onDeleteProfile={ryanEdit ? removeProfile : undefined}
        onAthleteChange={(next) => {
          setAthleteRoster(athletes.map((a) => (a.id === next.id ? next : a)))
          void syncAthleteProfileToResearch(next, next.id)
        }}
      />
    )}
    {tourOpen && (
      <GlowTour steps={tourSteps} startIdx={tourStartIdx} onDone={closeTour} />
    )}
    {clockOpen && (
      <ClockOverlay
        athletes={athletes}
        signedIn={activeProfile}
        coach={Boolean(activeProfile && isCoachProfile(activeProfile))}
        onClose={() => setClockOpen(false)}
      />
    )}
    {arcadeOpen && (
      <div className="fixed inset-0 z-[80] overflow-y-auto bg-[#07110e] text-[var(--text)]">
        <ArcadeHub
          athletes={athletes}
          coach={Boolean(activeProfile && isCoachProfile(activeProfile))}
          onClose={() => setArcadeOpen(false)}
        />
      </div>
    )}
    {viewingAthleteId && (
      <AthleteProfileCard
        athlete={athletes.find((a) => a.id === viewingAthleteId) ?? { id: viewingAthleteId, name: 'Athlete', createdAt: '' }}
        viewer={activeProfile}
        athletes={athletes}
        variant="overlay"
        onClose={() => setViewingAthleteId(null)}
        onDeleteProfile={ryanEdit ? removeProfile : undefined}
        onAddNote={
          activeProfile && isCoachProfile(activeProfile)
            ? (text, audience) =>
                setAthleteRoster(
                  addCoachNotesToAthletes(athletes, [viewingAthleteId], {
                    author: activeProfile,
                    text,
                    audience,
                  }),
                )
            : undefined
        }
        onAddWin={
          activeProfile && isCoachProfile(activeProfile)
            ? async (text, big) => {
                logClassSkillForAthlete({ athleteId: viewingAthleteId, text })
                await publishTextPostResult({
                  authorId: viewingAthleteId,
                  caption: text,
                  taggedIds: [viewingAthleteId],
                  channels: big ? ['wins', 'gym'] : ['wins'],
                  sharedById: activeProfile.id,
                  sharedByName: coachShareLabel(activeProfile),
                })
                setAthleteRoster(
                  addCoachNotesToAthletes(athletes, [viewingAthleteId], {
                    author: activeProfile,
                    text: `Win · ${text}`,
                    topicLabel: 'Win',
                  }),
                )
              }
            : undefined
        }
        onAthleteChange={(next) => {
          setAthleteRoster(athletes.map((a) => (a.id === next.id ? next : a)))
          if (activeProfile && next.id === activeProfile.id) {
            void syncAthleteProfileToResearch(next, next.id)
          }
        }}
      />
    )}
    {classSessionOpen && activeProfile && (isCoachProfile(activeProfile) || isShapelabAdmin(activeProfile)) && (
      <ClassSession
        coach={activeProfile}
        athletes={athletes}
        onAthletesChange={setAthleteRoster}
        onViewProfile={openProfile}
        onClose={() => setClassSessionOpen(false)}
        highlightOfferingId={
          closestOfferingToNow(loadOfferingsForCoach(activeProfile.id))?.id ?? null
        }
        onOpenStation={() => {
          setClassSessionOpen(false)
          setStationOpen(true)
        }}
        onOpenShapeTest={() => {
          setClassSessionOpen(false)
          setLearnIntent('quiz')
          goTab('learn')
        }}
        onOpenNamesTest={() => {
          setNamesQuizGroupId('live')
          setNamesQuizOpen(true)
        }}
      />
    )}
    {autoEndMeetingId && (() => {
      const meeting = loadMeetings().find((m) => m.id === autoEndMeetingId)
      if (!meeting) {
        clearAutoEndPrompt()
        setAutoEndMeetingId(null)
        return null
      }
      // Answered on another device — don't ask again.
      if (meeting.attendanceLogged !== undefined) {
        clearAutoEndPrompt()
        setAutoEndMeetingId(null)
        return null
      }
      return (
        <EndClassPrompt
          count={meeting.attendees.length}
          onLog={() => {
            logMeetingAttendance(meeting.id)
            clearAutoEndPrompt()
            setAutoEndMeetingId(null)
          }}
          onSkip={() => {
            skipMeetingAttendance(meeting.id)
            clearAutoEndPrompt()
            setAutoEndMeetingId(null)
          }}
          onStay={() => {
            clearAutoEndPrompt()
            setAutoEndMeetingId(null)
          }}
        />
      )
    })()}
    {skillPathsOpen && (
      <SkillPathBuilder
        coachId={activeProfile?.id}
        athletes={athletes}
        onClose={() => {
          setSkillPathsOpen(false)
          setSkillBuilderStart(null)
          setSkillBuilderUnscoped(false)
        }}
        startSkillId={skillBuilderStart}
        unscopedEdit={skillBuilderUnscoped}
      />
    )}
    {coachWizardOpen && activeProfile && (
      <CoachSetupWizard
        coach={activeProfile}
        onDone={() => setCoachWizardOpen(false)}
        onOpenAsk={() => {
          setCoachWizardOpen(false)
          goTab('chat')
        }}
      />
    )}
    {namesQuizOpen && (
      <NamesQuiz
        athletes={athletes}
        signedIn={activeProfile}
        preferredGroupId={namesQuizGroupId}
        onClose={() => {
          setNamesQuizOpen(false)
          setNamesQuizGroupId(null)
        }}
        onAthletesChange={setAthleteRoster}
      />
    )}
    {athleteGate && (
      <UnlockAthleteModal
        athlete={athleteGate}
        onCancel={() => setAthleteGate(null)}
        onUnlocked={(a) => {
          setActiveAthleteId(a.id)
          setAthleteGate(null)
          setAthleteRoster(athletes)
        }}
      />
    )}
    {awayLocked && authUser && !floorKiosk && (
      <AwayLockScreen
        user={authUser}
        onUnlocked={() => setAwayLocked(false)}
        onSignedOut={clearSignedInDesk}
      />
    )}
    </ProfilePeekProvider>
    </FavoritesProvider>
    </VideoAdjustmentsProvider>
    </ClipLoopsProvider>
    </ClipEditProvider>
    </GymLibraryProvider>
    </StillCropProvider>
    </ShapeCopyProvider>
    </IgStillProvider>
    </OverlayStillProvider>
  )
}
