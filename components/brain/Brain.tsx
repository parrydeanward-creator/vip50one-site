"use client";
import { lockedLine } from "@/lib/growthOrb.ts";

import { CLASSIC_DASHBOARD_URL } from "@/lib/host.ts";
import { hostAgainHref } from "@/lib/live.ts";
import { goHref, productLink } from "@/lib/productSignIn.ts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PersonPanel from "./PersonPanel.tsx";
import PersonMenu from "./PersonMenu.tsx";
import { useHeldDelete } from "./useHeldDelete.tsx";
import { dropPeople, firstOf, putBack } from "@/lib/deleteContact.ts";
import VipRings from "./VipRings.tsx";
import DailyTracker from "./DailyTracker.tsx";
import WeeklyTracker from "./WeeklyTracker.tsx";
import Rolodex from "./Rolodex.tsx";
import HomeReports from "./HomeReports.tsx";
import GbpScreen from "./GbpScreen.tsx";
import { GBP_PATH } from "@/lib/gbp.ts";
import MyProfile from "./MyProfile.tsx";
import AddonsPanel from "./AddonsPanel.tsx";
import Contacts from "./Contacts.tsx";
import HotWarmCold from "./HotWarmCold.tsx";
import TouchAudit from "./TouchAudit.tsx";
import GroupPanel from "./GroupPanel.tsx";
import { demoDailyRaw, demoWeeklyRaw, menuTarget, withDemoTrackers } from "@/lib/examples/move.ts";
import type { BusinessGraph, GraphNode } from "@/lib/graph/types.ts";
import { DESKTOP_BUDGET, PHONE_BUDGET, TEAM_HUB_BUDGET, childrenOf, indexGraph, pathTo, visibleSet } from "@/lib/graph/model.ts";
import { bounds, layout, teamInner } from "@/lib/brain/layout.ts";
import { fit, keepInBand, pan, zoomAt } from "@/lib/brain/camera.ts";
import * as nav from "@/lib/brain/nav.ts";
import { PRODUCT_COLOR, STATUS, hex } from "@/lib/brain/theme.ts";
import { UPGRADE_URL } from "@/lib/products.ts";
import type { BrainScene } from "./scene.ts";
import Icon from "./Icon.tsx";
import { iconFor, iconForText } from "@/lib/brain/icons.ts";
import { LIVE_SUGGESTED, SUGGESTED, answerSet, factsFor, navTargetOf, type AskAnswer } from "@/lib/ask.ts";
import { changesSince, firstVisitToday, groupChanges, morningTop, orbsToPing, sinceLabel, visitAnchor } from "@/lib/morning.ts";
import type { ChangeNote, DatedNote } from "@/lib/graph/types.ts";
import { DEMO_SIGNALS, applySignal, lightFrom, usable, type Signal } from "@/lib/signals.ts";
import { RANGE, byWeek, dayLabel, inWindow, offsetLabel, productOrbs, whereLabel, windowTitle } from "@/lib/timeline.ts";
import { clock, completedBy, duration, isEvening, planDay, recap, type DayItem, type Slot } from "@/lib/day.ts";
import { localDay } from "@/lib/morning.ts";
import PulseMark from "./PulseMark.tsx";
import PulseIntro from "./PulseIntro.tsx";
import SignalsFilm, { GO_TOUR_FILM, ONE_TOUR_FILM, WEBSITE_FILM } from "./SignalsFilm.tsx";
import PlanMyDay from "./PlanMyDay.tsx";
import DayClock from "./DayClock.tsx";
import { useDay } from "./useDay.ts";
import { chimeOn, dueChimes, notify, playChime, unlockChime } from "@/lib/chime.ts";
import { clock12, nextLine, toMin, toTime } from "@/lib/schedule.ts";
import { dayIsDone, groupHead, groupRows, nowStrip, slideSlots, withTomorrow } from "@/lib/dayView.ts";
import { dayStart } from "@/lib/workDay.ts";
import { soundsLikeDay } from "@/lib/overview.ts";
import CommitmentsView from "./CommitmentsView.tsx";
import ReviewView from "./ReviewView.tsx";
import IncomeMapView from "./IncomeMapView.tsx";
import ForecastView from "./ForecastView.tsx";
import PulseCoachView from "./PulseCoachView.tsx";
import ReferralsView from "./ReferralsView.tsx";
import MarqueePanel from "./views/MarqueePanel.tsx";
import MarqueeView from "./views/MarqueeView.tsx";
import { mqKeyOf, type MqKey } from "@/lib/examples/marquee.ts";
import ShowlyTools, { SHOWLY_TOOL } from "./views/ShowlyTools.tsx";
import OpenTools, { OPEN_TOOL } from "./views/OpenTools.tsx";
import GrowthPanel, { realLabel } from "./views/GrowthPanel.tsx";
import GrowthView from "./views/GrowthView.tsx";
import MoveTools from "./views/MoveTools.tsx";
import MoveExampleFetch from "./views/MoveExampleFetch.tsx";
import { EXAMPLE_NATIVE, M2_PATHS, m2KeyOf, withExampleMoveTools } from "@/lib/examples/move2.ts";
import WinsView from "./WinsView.tsx";
import LifeUpcomingView from "./LifeUpcomingView.tsx";
import OutreachPanel, { AttractionSection } from "./OutreachPanel.tsx";
import { PlanPanel, PlanPersonLine, PlansPartNote } from "./PlansPanel.tsx";
import { LearnPartPanel, LearnSearch } from "./LearnPanel.tsx";
import { actionPlansUrl, examplePlan, isPlanNode, planOf, readPlans, withPlan, withPlanNodes, type ActionPlan } from "@/lib/actionPlans.ts";
import { LEARN_PANEL_FIRST, demoLearn, learnPartOf, learnUrl, readLearn, withLearnNodes, type Learn } from "@/lib/learn.ts";
import MoveLikelyView from "./MoveLikelyView.tsx";
import DealsView, { type SetClientPage as DealSetClientPage, type SetStatus as DealSetStatus } from "./DealsView.tsx";
import TeamView from "./TeamView.tsx";
import WarRoomView from "./WarRoomView.tsx";
import ReviewCallsView from "./ReviewCallsView.tsx";
import HabitsView from "./HabitsView.tsx";
import LogReferral from "./LogReferral.tsx";
import TeamRezenSection from "./TeamRezenSection.tsx";
import PartnersView from "./PartnersView.tsx";
import PowerHourView from "./PowerHourView.tsx";
import CoachView from "./CoachView.tsx";
import { commitmentWork } from "@/lib/assist.ts";
import { demoHistory, historyUrl, pulseRead, readHistory, type History, type Read as PulseRead } from "@/lib/pulseCoach.ts";
import { POWER_NODE, callsFromTouch, newSession, powerKey, readSession, withPowerNode, withTicked, type Call, type Session as PowerSession } from "@/lib/powerHour.ts";
import { goalsPlanUrl, goalsShown, readGoalsPlan, type GoalsPlan } from "@/lib/goalsPlan.ts";
import { ASSUME_DEFAULT, START as INCOME_START, goalFacts, incomeKey, incomeMap, readAssume, yearStartFor, type Assume, type GoalKey } from "@/lib/goals.ts";
import GoalsPanel from "./GoalsPanel.tsx";
import { exampleRoster, makeReviewDemoStore } from "@/lib/examples/move2.ts";
import { REVIEW_NODE, demoRoster, goalsFromGraph, lateInWeek, review as buildReview, withReviewNode, type Review, type Thing } from "@/lib/review.ts";
import { CHALLENGE_NODE, GOALS_NODE, SCORE_NODE, goalsThree, withoutRetired } from "@/lib/oneYou.ts";
import { groupOneYou, isYouGroup } from "@/lib/youGroups.ts";
import ScoreboardPanel from "./ScoreboardPanel.tsx";
import ChallengePanel from "./ChallengePanel.tsx";
import { challengeShown, challengeUrl, demoChallenge, readChallenge, withChallengeNode, type LiveChallenge } from "@/lib/challenge.ts";
import ChallengeView from "./ChallengeView.tsx";
import { profileUrl, readProfile } from "@/lib/profile.ts";
import { syncKind } from "@/lib/voicePick.ts";
import GoalsView from "./GoalsView.tsx";
import { dailyUrl, readDaily, withTick, type DailyDay } from "@/lib/daily.ts";
import { REVIEW_CALLS_NODE, agentsUrl, demoAgents, readAgents, withReviewCallsNode, type ReviewAgent } from "@/lib/reviewCalls.ts";
import { TEAM_LEADS_PATH, WAR_NODE, demoWarRoom, teamDealsUrl, leadsUrl, logUrl, readWarRoom, type WarRoom } from "@/lib/warroom.ts";
import BrokerView from "./BrokerView.tsx";
import { BROKER_NODE, brokerSummaryLine, brokerUrl, demoBroker, readBroker, withBrokerNode, type Broker } from "@/lib/broker.ts";
import { TEAM_NODE, demoTeam, readTeam, teamUrl, type Scope as TeamScope, type Team } from "@/lib/team.ts";
import { awayLine, demoTimeOff, readTimeOff, timeOffUrl, withAwayLabel, type TimeOffState } from "@/lib/timeOff.ts";
import { demoPulseReport, pulseReportUrl, readPulseReport, type PulseReport } from "@/lib/pulseReport.ts";
import AskAiView from "./AskAiView.tsx";
import ContactLinkView from "./ContactLinkView.tsx";
import TouchPanel from "./TouchPanel.tsx";
import type { TouchItem } from "@/lib/touchBlock.ts";
import MorningPulse from "./MorningPulse.tsx";
import { OFFER_KEY as MP_OFFER_KEY, buildMorningPulse, demoEvening, demoMorning, eveningUrl as mpEveningUrl, morningUrl as mpMorningUrl, orbFor as mpOrbFor, readEvening as readMpEvening, readMorning as readMpMorning, type Beat as MpBeat, type BeatTool as MpTool } from "@/lib/morningPulse.ts";
import { readTeamSites, type TeamSite, readAgentTeamSites, siteOpenHref, type AgentTeamSite } from "@/lib/siteEdit.ts";
import { aiCheckBody, aiCheckUrl, cardFor, monthOf, readAiCheck, readResults, resultKey, type AiCheck, type Answer as AiAnswer, type Engine as AiEngine, type Results as AiResults } from "@/lib/aiCheck.ts";
import { LIKELY_NODE, callBody as likelyCallBody, callUrl as likelyCallUrl, demoMoveLikely, emptyMoveLikely, moveLikelyUrl, notUsefulUrl, pastClientsUrl, readMoveLikely, readPastClientsAnswer, withMoveLikelyNode, withoutPerson, type MoveLikely, type PastClient, type Person as LikelyPerson, type RouteReason } from "@/lib/moveLikely.ts";
import { OPP_LABEL, OPP_NODE, PEOPLE_MENU_PARTS, withOpportunities } from "@/lib/opportunities.ts";
import { readRoute } from "@/lib/routeFirst.ts";
import { HOME_REPORTS_PATH } from "@/lib/homeReport.ts";
import { PANEL_FIRST, attractionUrl, demoAttraction, demoEvents, demoOutreach, eventsUrl, outreachUrl, partOf, readAttraction, readEvents, readOutreach, withEventsNodes, withOutreachNodes, type Attraction, type EventsNow, type Outreach } from "@/lib/outreach.ts";
import { DEALS_NODE, dealUrl, dealsUrl, demoDeals, readClosingAsk, readDeals, statusBody as dealStatusBody, withClientPage as withDealClientPage, withDealsNode, withStatus as withDealStatus, type Deal } from "@/lib/deals.ts";
import { clientPageBody, readSaveAnswer } from "@/lib/siteFeeds.ts";
import { LIFE_NODE } from "@/lib/lifeEvents.ts";
import { DATES_STAT, demoUpcoming, readUpcoming, taskBody as lifeTaskBody, taskUrl as lifeTaskUrl, upcomingUrl as lifeUpcomingUrl, withLifeUpcomingNode, type Upcoming, type UpcomingList } from "@/lib/lifeUpcoming.ts";
import { readScoreboard, scoreboardUrl, type ScoreboardLive } from "@/lib/scoreboard.ts";
import { demoWins, readWeekWins, readWins, total as winsTotal, weekWinsUrl, winsUrl, type WeekWinsLive, type Wins } from "@/lib/wins.ts";
import { demoPartners, partnersActionUrl, partnersUrl, readPartners, unseenNudges, withAllSeen, type PartnersState } from "@/lib/partners.ts";
import { HABITS_NODE, demoHabitsDay, habitsToday, withHabitsNode, mondayOf, habitsUrl, type HabitToday } from "@/lib/habits.ts";
import { readRoster, vipsUrl, type VipRoster } from "@/lib/vips.ts";
import { REFERRALS_NODE, applyThank, applyThanked, askUrl, demoReferrals, thankUrl, thankedUrl, readThanked, thankCount, withReferralCount, yearLine, type ThankKind, readReferrals, referralsUrl, withReferralsNode, type Referrals, demoNetwork, networkUrl, readNetwork, type NetworkCounts } from "@/lib/referrals.ts";
import { COACH_NODE, coachedUrl, demoCoached, readCoached, withCoachNode, type Coached } from "@/lib/coach.ts";
import { WEEK_NODE, commitWay, commitmentsUrl, demoCommitments, queueBody, queueDraft, queueUrl, readCommitments, readQueueAnswer, readQueued, withWeekNode, type Commitments } from "@/lib/commitments.ts";
import { nextCommitKey } from "@/lib/pulseCoach.ts";
import { CALENDAR_NODE, PLAN_NODE, planKey, planState, planUrl, readPlan, timed, withPlanNode, type Plan, type PlanState } from "@/lib/plan.ts";
import { hwcUrl, readHwc, todayIn, type HwcClass } from "@/lib/hwc.ts";
import { readSignals, signalsUrl, type WebSignal } from "@/lib/webSignals.ts";
import { readSiteAlerts, withAdsAlertNode, type SiteAlert } from "@/lib/siteAlerts.ts";
import { GROWTH_JOIN_BUTTON, GROWTH_NODE, growthChildren, growthDemoNote, isGrowthChild, withGrowthNodes, type GrowthAction, type GrowthState } from "@/lib/growthOrb.ts";
import { ASK_PERSON, askOrbIds, withAskPeople } from "@/lib/askOrbs.ts";
import { LEADS_NODE, demoNewLeads, leadOf, readNewLeads, todayUrl, withNewLeadsNode, withOutcome, type LeadOutcome, type NewLeads, type RetryWhen } from "@/lib/newLeads.ts";
import LeadCard from "./LeadCard.tsx";
import { postDay, type TeamPost } from "@/lib/teamPosts.ts";
import { perProduct } from "@/lib/perProduct.ts";
import ListingFitsSection from "./ListingFitsSection.tsx";
import { launchRefOf, launchUrl, readLaunches, upsertLaunch, withLaunchNodes, type Launch } from "@/lib/launch.ts";
import LaunchPanel from "./LaunchPanel.tsx";
import ListingsPage from "./ListingCards.tsx";
import LooksHotPanel from "./LooksHotPanel.tsx";
import NewToSort from "./NewToSort.tsx";
import OnboardingPanel from "./OnboardingPanel.tsx";
import GettingStartedPanel from "./GettingStartedPanel.tsx";
import TeamHubPanel, { isHubPart } from "./TeamHubPanel.tsx";
import TeamAgentPanel from "./TeamAgentPanel.tsx";
import TeamWarPanel from "./TeamWarPanel.tsx";
import { useTeamRoom } from "./useTeamRoom.ts";
import { agentIdOf, type TeamPeople, type War30 } from "@/lib/teamPeople.ts";
import FollowUpsPanel from "./FollowUpsPanel.tsx";
import { DEMO_FOLLOW_NODE, FOLLOW_NODE, followUpsUrl, isFollowUpsOrb, mergeFollowUps, readFollowUps, rowsFromKids, summaryFollowOf, withFollowUps, type FollowUps, type SummaryFollow } from "@/lib/followUps.ts";
import { START_NODE, demoStart, filmUrl, movePathOf, placeFor, readStart, startAgentUrl, startMenuLine, startUrl, withStartNode, type Start, type StartPlace, type StartStep } from "@/lib/gettingStarted.ts";
import { TEAM_HUB, isTeamLead, withTeamHub, type HubInput } from "@/lib/teamHub.ts";
import { NetworkPanel, RevsharePanel } from "./RezenOrbPanel.tsx";
import { readRezenRead, type RezenPlan } from "@/lib/rezen.ts";
import { NETWORK_NODE, REVSHARE_NODE, demoRezenRead, readNetwork as readRezenNetwork, readRevshare, withRezenNodes, type Network as RezenNetwork, type Revshare } from "@/lib/rezenOrbs.ts";
import { rezenUrl } from "@/lib/rezen.ts";
import { ONB_NODE, demoOnboarding, onbIdOf, onboardingUrl, readOnboarding, readRemoved, withStart, type OnbMember } from "@/lib/onboarding.ts";
import { heatUrl, readHeat, type HeatSuggestion } from "@/lib/heat.ts";
import { LOOKS_NODE, NOT_YET_STORE, demoLooksHot, fromHeat, fromSignals, isLooksHotOrb, looksIdOf, looksNodeId, looksHotUrl, mergeLooks, readLooksHot, readNotYet, shownLooks, withLooksHot, withNotYet, type LooksPerson, type NotYet } from "@/lib/looksHot.ts";
import { DEMO_NTS_NODE, NTS_PATH, demoNewToSort, fromNewLeads, newToSortUrl, readNewToSort, withNewToSort, withoutPerson as withoutSorted, type NewToSort as NtsData } from "@/lib/newToSort.ts";
import ClosedCards from "./ClosedCards.tsx";
import { LAST_COOKIE, LAST_MAX_AGE } from "@/lib/landing.ts";
import { HINT, menuRows, type MenuRow } from "@/lib/phoneMenu.ts";
import { ROW_COLOR, rowState } from "@/lib/rowState.ts";
import { demoClasses, forecast, type ForecastPerson } from "@/lib/forecast.ts";
import { needWords, needsOf, type Need } from "@/lib/needs.ts";
import { SEEN_KEY } from "@/lib/pulseIntro.ts";
import type { SceneNeed } from "./scene.ts";
import { returnNote, withoutNotes } from "@/lib/googleReturn.ts";
import { arrivalFor, type Arrival } from "@/lib/deepLink.ts";
import { DEMO_PAGES, withTourPages } from "@/lib/examples/tourPages.ts";
import { arrivalExact, landing, seedArrival } from "@/lib/deepLinkNode.ts";
import { statGo } from "@/lib/statOpen.ts";
import { IN_BRAIN, MENU_ORB, MOVE_MENU, MOVE_PAGE_WIDTH, MOVE_BOTTOM, isMoveGroup, isMovePage, MOVE_TOP, inBrainPage, moveGroupsFor, withMoveCoach, moveEmbedHref, moveGroupId, moveMenuHref, movePageId, type MovePage, pageAddress, pageFromAddress, withTeamLeadsPage } from "@/lib/moveMenu.ts";

// The ONE Brain shell: navigation controller, gestures, the accessible layer
// of real buttons over the drawn nodes, and the detail drawer. Business data
// comes in as a graph; nothing here knows about any product's internals.

const PHONE_QUERY = "(max-width: 719px)";
const CARD_ROOM = 420; // desktop width kept free for the floating card
const TEAM_PHONE_SCALE = 20 / 54; // the least the Team orb is drawn at on a phone: a face keeps a 20px radius (the outer ring is a pan away)
const RAIL_ROOM = 250; // and for the rail of floating buttons on the left

export interface BrainAgent {
  firstName: string;
  initials: string;
  label: string; // spoken name for the account button
  photo?: string; // the agent's own photo (MASTER user_profiles.avatar_url)
  admin?: boolean; // MASTER is_admin / is_super_admin: the Coach menu and Review calls
  growth?: boolean; // has ONE Growth (plan or add-on); Complete/Elite without it see the add-on offer in Meet Pulse
  name?: string; // the menu's name line
  plan?: string; // "ONE Complete + ONE Growth" (the menu's plan line, as the profile badge)
}

// The made-up agent the demo, films and screenshots use.
const DEMO_AGENT: BrainAgent = { firstName: "Sarah", initials: "SB", label: "Sarah Bennett, ONE Complete, founding member", name: "Sarah Bennett", plan: "ONE Complete" };

// The hour in the agent's time zone (Mountain), for the commitment pulses (§3n.1).
function denverHour(now = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", hour: "numeric", hourCycle: "h23" }).format(now));
}

// The tour (Film A, Parry 15 Oct: "build them"): the example agent with the photo menu, My Profile and the team cards
// showing, for the recorded product tour. The recorder answers their data calls with invented example data.
const TOUR_AGENT: BrainAgent = { ...DEMO_AGENT, growth: true, plan: "ONE Complete + ONE Growth", label: "Sarah Bennett, ONE Complete + ONE Growth" };

/** How long an arrived-at orb is held as the focus while the routes answer (see arrivalHold). */
const ARRIVAL_HOLD_MS = 10_000;

export default function Brain({ graph: initialGraph, pkg = "complete", agent: agentIn = DEMO_AGENT, live = false, startPage = null, startOpen = null, startContact = null, productTour = false }: { graph: BusinessGraph; pkg?: string; agent?: BrainAgent; live?: boolean; startPage?: string | null; startOpen?: string | null; startContact?: string | null; productTour?: boolean }) {
  const agent = productTour ? TOUR_AGENT : agentIn;
  // What the address asked for (/dashboard/<page>, ?open=<thing>; lib/deepLink.ts): it opens on arrival, ahead of the
  // morning fly-through, Meet Pulse and the morning note (Parry, 18 Oct: links "just open the dashboard").
  const [arrival] = useState(() => arrivalFor(startPage, startOpen, startContact));
  // /dashboard/contacts/<uuid> (or ?contact=<uuid>): that one contact is open in the side panel; Back returns to Contacts.
  const [linkContact, setLinkContact] = useState<string | null>(() => (arrival && arrival.kind !== "gbp" ? arrival.contact ?? null : null));
  // The arrived-at orb stays the focus while the Brain's routes answer: a rebuild can drop an orb for a moment (Deals
  // and Life events before their data is in) and the map must not fall back to its parent for good (live check, 18 Oct).
  const arrivalHold = useRef<{ id: string; until: number } | null>(null);
  const [holdTick, setHoldTick] = useState(0);
  // Arriving on Team Leads means the agent is on a team: its orb is there before the team answer comes back.
  const teamLeadsHint = startPage === TEAM_LEADS_PATH;
  const hello = `${greeting()}, ${agent.firstName}.`;
  // The graph changes while the page is open (live signals tick its numbers).
  // ONE GO's Today's plan orb follows the plan (Parry, 6 Oct: "shouldnt there be a plan my day orb off of go").
  const plannedRef = useRef<Plan | null>(null);
  // the one plan state the orb and the ONE YOU card both read (audit 3.1.3)
  const planStateRef = useRef<PlanState | undefined>(undefined);
  // ONE YOU's "This week" orb follows the agent's commitments (Parry, 6 Oct; VIP-SUMMARY §3n).
  const commitRef = useRef<Commitments | null>(null);
  // ONE YOU's Coaching orb, for coaches only (§3n.4).
  const coachRef = useRef<Coached[] | null>(null);
  // ONE YOU's Weekly Review orb (PULSE-ROADMAP "ONE YOU"): pulses when part of the week needs the agent.
  const reviewRef = useRef<Review | null>(null);
  const adsRef = useRef<SiteAlert[] | null>(null);
  const growthRef = useRef<GrowthState | null>(null);
  const askPeopleRef = useRef<AskAnswer["people"] | null>(null);
  const newLeadsRef = useRef<NewLeads | null>(null);
  // New to Sort and Looks Hot (lib/newToSort.ts, lib/looksHot.ts): the two people orbs always on ONE MOVE.
  const ntsRef = useRef<NtsData | null>(null);
  const looksRef = useRef<LooksPerson[] | null>(null);
  const onbRef = useRef<OnbMember[] | null>(null);
  const onbRemovedRef = useRef<string[]>([]);
  const rezenRef = useRef<{ r: Revshare | null; n: RezenNetwork | null }>({ r: null, n: null });
  const launchRef = useRef<Launch[] | null>(null);
  const refsRef = useRef<Referrals | null>(null);
  const habitsRef = useRef<HabitToday[] | null>(null);
  const lifeRef = useRef<UpcomingList | null>(null);
  const dealsRef = useRef<Deal[] | null>(null);
  const brokerRef = useRef<Broker | null>(null);
  const outreachRef = useRef<Outreach | null>(null);
  const eventsRef = useRef<EventsNow | null>(null);
  // Action Plans drawn natively and Learn's parts (lib/actionPlans.ts, lib/learn.ts; walker 0245)
  const plansRef = useRef<ActionPlan[] | null>(null);
  const learnRef = useRef<Learn | null>(null);
  const likelyRef = useRef<MoveLikely | null>(null);
  // Likely to move's one honest reason and ONE MOVE's past clients 5+ years (lib/moveLikely.ts), for the rebuild.
  const likelyOptsRef = useRef<{ mlsMissing: boolean | null; pastClients: PastClient[] | null; routeReason: RouteReason | null }>({ mlsMissing: null, pastClients: null, routeReason: null });
  const timeOffRef = useRef<TimeOffState | null>(null);
  const teamRef = useRef<Team | null>(null);
  // ONE MOVE's follow-ups route (lib/followUps.ts): Overdue, Today and Next 7 days, once it answers.
  const followRef = useRef<FollowUps | null>(null);
  // What vip_summary put on the Follow-ups orb at the last build (merged with the route's rows; walker 17 Oct).
  const followSumRef = useRef<SummaryFollow | null>(null);
  const warRef = useRef<WarRoom | null>(null);
  const rcRef = useRef(false);
  // ONE YOU's Power Hour orb: today's VIP touches lined up, then what is behind pace.
  const powerRef = useRef<{ calls: Call[]; session: PowerSession | null } | null>(null);
  const challengeRef = useRef<LiveChallenge | null>(null);
  // Getting started (GETTING-STARTED.md): the orb at the top of ONE YOU; reopened from the menu once folded.
  const startRef = useRef<Start | null>(null);
  const startReopenRef = useRef(false);
  // The team lead's Team orb (lib/teamHub.ts): Leaderboard, War room and Onboarding, beside ONE YOU, leads only.
  const teamSitesRef = useRef(0);
  // The team's agents as faces and the War room's 30 days (lib/teamPeople.ts); null when ONE MOVE refuses (not a lead).
  const peopleRef = useRef<TeamPeople | null>(null);
  const war30Ref = useRef<War30 | null>(null);
  const hubNow = (): HubInput => ({ lead: isTeamLead(warRef.current, onbRef.current, teamSitesRef.current) || !!peopleRef.current?.people.length, team: teamRef.current, war: warRef.current, onb: onbRef.current, removed: onbRemovedRef.current, now: Date.now(), people: peopleRef.current, war30: war30Ref.current });
  const admin = agent.admin === true;
  // An arrival's orb is on the first map, so the server paints the asked-for place, never the whole map (lib/deepLinkNode.ts).
  // ONE YOU in groups (lib/youGroups.ts; Parry, 19 Oct): every graph set here is grouped last, after its builders.
  const [graph, setGraphRaw] = useState(() => groupOneYou(seedArrival(withTeamLeadsPage(withMoveCoach(withPlanNode(productTour || (!live && arrival?.kind === "page") ? withExampleMoveTools(withDemoTrackers(withTourPages(initialGraph))) : live ? initialGraph : withDemoTrackers(withTourPages(initialGraph, DEMO_PAGES)), null), admin), teamLeadsHint), arrival, { growth: agent.growth === true || pkg === "growth", exampleToday: live ? null : todayIn() })));
  const setGraph = useCallback((u: BusinessGraph | ((g: BusinessGraph) => BusinessGraph)) => setGraphRaw((g) => groupOneYou(typeof u === "function" ? u(g) : u)), []);
  const lastPath = useRef<string[]>([]); // the focused node's ancestors, nearest last
  // Fresh numbers from the server replace the graph. Without
  // this, a refresh after logging a call changed nothing on screen.
  // Swap the graph and, in the same render, move off an item that is gone
  // (a follow-up just done). Rendering the new graph with the old focus
  // crashed the page (Parry, 4 Oct, after "Yes, log it" on Sarah Bennett).
  const swapGraph = useCallback((fresh: BusinessGraph) => {
    followSumRef.current = summaryFollowOf(fresh, todayIn());
    // Opportunities last (lib/opportunities.ts; Parry, 17 Oct): its four parts move inside it, whatever built them.
    const next = withBrokerNode(groupOneYou(withOpportunities(withLooksHot(withNewToSort(withFollowUps(withStartNode(withTeamHub(withChallengeNode(withoutRetired(withGrowthNodes(withAskPeople(withAdsAlertNode(withRezenNodes((withLaunchNodes(withNewLeadsNode(withTeamLeadsPage(((withMoveCoach(withMoveLikelyNode(withLearnNodes(withPlanNodes(withEventsNodes(withOutreachNodes(withDealsNode(withLifeUpcomingNode(withAwayLabel(withReviewCallsNode((withHabitsNode(withReferralsNode(withPowerNode(withReviewNode(withCoachNode(withWeekNode(withPlanNode(fresh, plannedRef.current, planStateRef.current), commitRef.current, denverHour()), coachRef.current, denverHour()), reviewRef.current), powerRef.current?.calls ?? null, powerRef.current?.session ?? null), refsRef.current, todayIn()), habitsRef.current)), rcRef.current), timeOffRef.current), lifeRef.current), dealsRef.current, todayIn()), outreachRef.current), eventsRef.current), plansRef.current), learnRef.current), likelyRef.current, likelyOptsRef.current), admin))), !!warRef.current || teamLeadsHint), newLeadsRef.current), launchRef.current)), rezenRef.current.r, rezenRef.current.n), adsRef.current), askPeopleRef.current), growthRef.current)), challengeRef.current), hubNow()), startRef.current, startReopenRef.current), followRef.current, todayIn(), followSumRef.current), ntsRef.current), looksRef.current))), brokerRef.current);
    const nix = indexGraph(next);
    setGraph(next);
    setState((s) => {
      if (nix.byId.has(s.focusId)) return s;
      const keep = [...lastPath.current].reverse().find((id) => nix.byId.has(id)) ?? next.rootId;
      return nav.go(s, keep);
    });
  }, []);
  useEffect(() => {
    if (live) swapGraph(initialGraph);
  }, [initialGraph, live, swapGraph]);
  // Fresh numbers without re-rendering the route (Parry, 5 Oct: the screen blinked and went
  // back to the dashboard every minute). Only the graph changes; the open page stays put.
  const refreshLive = useCallback(async () => {
    if (!live) return;
    try {
      const r = await fetch("/api/live", { cache: "no-store" });
      if (!r.ok) return;
      const j = (await r.json().catch(() => null)) as { graph?: BusinessGraph } | null;
      if (j?.graph && Array.isArray(j.graph.nodes) && j.graph.rootId) swapGraph(j.graph);
      // ticks made on the phone (or done by the real call, text or task) come back with the plan
      fetch(planUrl, { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((pj) => {
          const p = readPlan(pj, plannedRef.current?.items ?? []);
          if (p && p.sentAt && p.date === todayIn()) setPlanned(p);
        })
        .catch(() => {});
      fetch(commitmentsUrl, { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((cj) => {
          const cm = readCommitments(cj);
          if (cm) setCommitments(cm);
        })
        .catch(() => {});
    } catch {
      // offline or signed out: keep what is on screen
    }
  }, [live, swapGraph]);
  // Follow-ups (lib/followUps.ts): ONE MOVE's own list when its route answers; otherwise the orb keeps vip_summary's.
  const [follow, setFollow] = useState<FollowUps | null>(null);
  const loadFollow = useCallback(() => {
    if (!live) return;
    fetch(followUpsUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const f = j ? readFollowUps(j) : null;
        if (f) setFollow(f);
      })
      .catch(() => {});
  }, [live]);
  useEffect(() => {
    loadFollow();
    if (!live) return;
    const t = setInterval(loadFollow, 300_000);
    return () => clearInterval(t);
  }, [live, loadFollow]);
  useEffect(() => {
    followRef.current = follow;
    if (follow) setGraph((g) => withFollowUps(g, follow, todayIn(), followSumRef.current ?? undefined));
  }, [follow]);
  // ONE's morning note, written by the AI when it is available (rules otherwise).
  const [note, setNote] = useState<{ note: string; source: "ai" | "rules" } | null>(null);
  useEffect(() => {
    let current = true;
    fetch(`/api/note?package=${encodeURIComponent(pkg)}${live ? "" : "&demo=1"}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((n) => current && n && setNote(n))
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [pkg, live]);
  const ix = useMemo(() => indexGraph(graph), [graph]);
  // Follow the pulse (Parry, 5 Oct): what needs the agent, added up every orb above it.
  const needs = useMemo(() => needsOf(graph.nodes), [graph]);
  const sceneNeeds = useMemo(() => {
    const parents = new Set(graph.nodes.map((n) => n.parentId).filter((p): p is string => !!p));
    const m = new Map<string, SceneNeed>();
    for (const [id, need] of needs) m.set(id, { ...need, leaf: !parents.has(id) });
    return m;
  }, [graph, needs]);
  // The centre ONE orb opens Meet Pulse (Parry, 14 Oct); the film, What everything means, is a card inside it, and a
  // signed-in agent sees Meet Pulse once on a first visit.
  const [intro, setIntro] = useState(false);
  const [guide, setGuide] = useState(false); // What everything means
  const [addonsOpen, setAddonsOpen] = useState(false); // Add-ons (CHECKOUT §2)
  // Google Business Profile (GBP.md §5b): a full screen over the Brain, at /dashboard/google-profile.
  // open from the first paint when the address names it (the server draws it, not the map under it)
  const [gbpOpen, setGbpOpen] = useState(() => arrival?.kind === "gbp");
  const openGbp = useCallback(() => {
    setGbpOpen(true);
    if (window.location.pathname !== GBP_PATH) window.history.replaceState(null, "", GBP_PATH + window.location.search);
  }, []);
  const closeGbp = useCallback(() => {
    setGbpOpen(false);
    if (window.location.pathname === GBP_PATH) window.history.replaceState(null, "", "/dashboard" + window.location.search);
  }, []);
  useEffect(() => {
    if (window.location.pathname === GBP_PATH || arrival?.kind === "gbp") setGbpOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Morning Pulse (Parry, 16 Oct 21:14 MT): replaces Watch Pulse work, Watch ONE Work and Listen on the signed-in dashboard.
  const [mp, setMp] = useState<{ beats: MpBeat[]; example: boolean } | null>(null);
  const [mpOffer, setMpOffer] = useState(false); // the once-a-day offer on the morning note
  const [goTour, setGoTour] = useState(false); // the ONE GO phone tour (Film B)
  const [oneTour, setOneTour] = useState(false); // the ONE desktop tour (Film A)
  const [webFilm, setWebFilm] = useState(false); // the website film (Film C)
  useEffect(() => {
    if (!live) return;
    if (arrival) return; // a link to a page opens that page; Meet Pulse waits for a plain visit
    try {
      if (window.localStorage.getItem(SEEN_KEY)) return;
      window.localStorage.setItem(SEEN_KEY, "1");
    } catch {
      return; // storage blocked: only the orb opens it
    }
    setIntro(true);
  }, [live]);
  const [state, setState] = useState(() => {
    const s = nav.start(graph.rootId);
    const want = arrival ? arrivalExact(arrival, (id) => graph.nodes.some((n) => n.id === id)) : null;
    if (want) arrivalHold.current = { id: want, until: Date.now() + ARRIVAL_HOLD_MS };
    return want ? nav.go(s, want) : s;
  });
  const [phone, setPhone] = useState(false);
  const [ready, setReady] = useState(false);
  const [highlight, setHighlight] = useState<string[] | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<BrainScene | null>(null);
  const btnRefs = useRef(new Map<string, HTMLButtonElement>());
  const drawerRef = useRef<HTMLElement>(null);
  const leaderRef = useRef<SVGLineElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state.focusId);
  stateRef.current = state.focusId;
  const drag = useRef({ down: false, moved: false, x: 0, y: 0, pointers: new Map<number, { x: number; y: number }>(), pinch: 0 });

  // Ask ONE: while an answer is showing, the map is laid out around it.
  const [ask, setAsk] = useState<AskAnswer | null>(null);
  const [askText, setAskText] = useState("");
  const [asking, setAsking] = useState(false);
  const [askErr, setAskErr] = useState<string | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const askInputRef = useRef<HTMLInputElement>(null);
  const askIds = useMemo(() => askOrbIds(ask?.people, ask?.results.map((r) => r.id) ?? []), [ask]);
  // Morning fly-through: step 0 is ONE, then each of today's top three.
  const [decided, setDecided] = useState<Record<string, string>>({});
  const [deciding, setDeciding] = useState(false);
  const [decideErr, setDecideErr] = useState<string | null>(null);
  const [gci, setGci] = useState("");
  // A ONE MOVE page inside the Brain fills the window. When the window is
  // narrower than ONE MOVE's full desktop layout (VIP-50, Swap and VIP-100
  // side by side), the page is drawn at that width and shrunk to fit, so it
  // looks the same as Classic (Parry, 3 Oct).
  const frameBoxRef = useRef<HTMLDivElement>(null);
  const [frameReady, setFrameReady] = useState<string | null>(null);
  const [frameScale, setFrameScale] = useState(1);
  const focusIsPage = !!inBrainPage(state.focusId);
  useEffect(() => {
    const el = frameBoxRef.current;
    if (!el) return;
    const fit = () => setFrameScale(Math.min(1, el.clientWidth / MOVE_PAGE_WIDTH));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [focusIsPage]);
  // Which ONE MOVE menu groups are open (this browser only).
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem("one.moveMenu.open") ?? "[]");
      if (Array.isArray(v)) setOpenGroups(v.filter((k): k is string => typeof k === "string"));
    } catch {}
  }, []);
  const [tour, setTour] = useState<{ ids: string[]; step: number } | null>(null);
  const tourRef = useRef(tour);
  tourRef.current = tour;
  const [since, setSince] = useState<{ label: string; changes: ChangeNote[] } | null>(null);
  // Timeline: days from today the slider is at (0 = today, the normal map).
  const [when, setWhen] = useState(0);
  const whenRef = useRef(when);
  whenRef.current = when;
  const [now] = useState(() => new Date());
  // The real dated feed from MASTER (app/api/timeline): read the first time the slider moves, signed in only.
  const [feed, setFeed] = useState<DatedNote[] | null>(null);
  const feedAsked = useRef(false);
  useEffect(() => {
    if (!live || when === 0 || feedAsked.current) return;
    feedAsked.current = true;
    fetch("/api/timeline", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setFeed(Array.isArray(j?.dated) ? j.dated : []))
      .catch(() => setFeed([]));
  }, [live, when]);
  const allDated = useMemo(() => [...(graph.dated ?? []), ...(feed ?? [])], [graph.dated, feed]);
  const dated = useMemo(() => (tour || ask ? [] : inWindow(allDated, when, now, ix)), [allDated, when, now, ix, tour, ask]);
  // The map keeps the product orbs and lights the ones with something in the stretch (walker audit 02).
  const datedIds = useMemo(() => productOrbs(dated, ix), [dated, ix]);
  const productIds = useMemo(() => childrenOf(ix, graph.rootId).filter((n) => n.type === "product").map((n) => n.id), [ix, graph.rootId]);
  const timeline = when !== 0 && !tour && !ask;
  // Your day: today's work in order, with times; done as the products report
  // it (or the agent ticks it), compiled in the evening.
  const [dayDone, setDayDone] = useState<Set<string>>(() => new Set());
  const [dayMap, setDayMap] = useState(false);
  const [evening, setEvening] = useState(false);
  // Plan My Day (§3l): once the agent has planned today, Your day is that plan, in their order.
  const [planOpen, setPlanOpen] = useState(false);
  const [planned, setPlanned] = useState<Plan | null>(null);
  useEffect(() => {
    plannedRef.current = planned;
    setGraph((g) => withPlanNode(g, planned, planStateRef.current));
  }, [planned]);
  const [commitments, setCommitments] = useState<Commitments | null>(null);
  const [cmOpen, setCmOpen] = useState(false);
  useEffect(() => {
    if (!live) return setCommitments(demoCommitments(todayIn()));
    fetch(commitmentsUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setCommitments(readCommitments(j)))
      .catch(() => {}); // not live yet: no "This week" orb
  }, [live]);
  useEffect(() => {
    commitRef.current = commitments;
    setGraph((g) => withWeekNode(g, commitments, denverHour()));
  }, [commitments]);
  const [coached, setCoached] = useState<Coached[] | null>(null);
  const [coachOpen, setCoachOpen] = useState(false);
  useEffect(() => {
    if (!live) return setCoached(demoCoached(todayIn()));
    fetch(coachedUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null)) // 403 for anyone who coaches nobody: no Coaching orb
      .then((j) => setCoached(j ? readCoached(j, todayIn()) : null))
      .catch(() => {});
  }, [live]);
  useEffect(() => {
    coachRef.current = coached;
    setGraph((g) => withCoachNode(g, coached, denverHour()));
  }, [coached]);
  // "Pulse did this" (LEADS §6.1): the week's report for the Weekly Review; the example agent's in the demo.
  const [pulseReport, setPulseReport] = useState<PulseReport | null>(null);
  useEffect(() => {
    if (!live) return setPulseReport(demoPulseReport(todayIn()));
    fetch(pulseReportUrl(), { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setPulseReport(j ? readPulseReport(j) : null))
      .catch(() => {});
  }, [live]);
  // Wins (§3t), read below; declared here because the Weekly Review shows this week's.
  const [wins, setWins] = useState<Wins | null>(null);
  // This week's wins as ONE MOVE counts them (vip50-web-crm#278, `?week=this`); the year's list is the fallback.
  const [weekWinsLive, setWeekWinsLive] = useState<WeekWinsLive | null>(null);
  // The Scoreboard's Mission Control, streak and XP as ONE MOVE counts them (vip50-web-crm#281); the demo graph's otherwise.
  const [scoreLive, setScoreLive] = useState<ScoreboardLive | null>(null);
  // Weekly Review: the week's score (ONE MOVE's daily feed), the VIP-50 roster, commitments and goals.
  const [weekScore, setWeekScore] = useState<{ score: number; minimum: number } | null>(null);
  // The Habits ring: the Daily Tracker's "habits" boxes (same feed), ticked from the Brain like any box.
  const [habitsDay, setHabitsDay] = useState<DailyDay | null>(null);
  const [habitsOpen, setHabitsOpen] = useState(false);
  const [roster, setRoster] = useState<VipRoster | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  // The example agent's Weekly Review: demoRoster's people as an example ONE MOVE store, so a name opens a contact and a
  // tick on it changes the review (nothing leaves the browser).
  const reviewDemoStore = useMemo(() => (live ? null : makeReviewDemoStore(todayIn(), demoRoster())), [live]);
  // A contact opened from the Weekly Review was changed: the roster is read again, so "Not reached" and the counts follow;
  // the live numbers (the ONE YOU pulse) are read again too.
  const refreshRoster = useCallback(() => {
    if (!live) {
      const r = reviewDemoStore ? readRoster(exampleRoster(reviewDemoStore)) : null;
      if (r) setRoster(r);
      return;
    }
    fetch(vipsUrl, { credentials: "include", cache: "no-store" })
      .then((x) => (x.ok ? x.json() : null))
      .then((j) => {
        const r = j ? readRoster(j) : null;
        if (r) setRoster(r);
      })
      .catch(() => {});
    void refreshLive();
  }, [live, reviewDemoStore, refreshLive]);
  useEffect(() => {
    if (!live) {
      setWeekScore({ score: 82, minimum: 100 });
      setRoster(demoRoster());
      setHabitsDay(demoHabitsDay(todayIn()));
      return;
    }
    const get = (u: string) => fetch(u, { credentials: "include", cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    get(dailyUrl).then((j) => {
      const d = readDaily(j);
      setWeekScore(d?.week ?? null);
      setHabitsDay(d);
    });
    get(vipsUrl).then((j) => setRoster(j ? readRoster(j) : null));
  }, [live]);
  // Keyed by content: adding the review orb changes graph.nodes, and must not rebuild the review again.
  const goalKey = JSON.stringify(goalsFromGraph(graph.nodes));
  const goalNodes = useMemo(() => JSON.parse(goalKey) as ReturnType<typeof goalsFromGraph>, [goalKey]);
  const theReview = useMemo(
    () => (weekScore || roster || commitments || goalNodes.length ? buildReview({ today: todayIn(), week: weekScore, roster, commitments, goals: goalNodes, wins: wins?.wins ?? null, winsYear: wins ? winsTotal(wins) : null, weekWins: weekWinsLive, pulse: pulseReport }) : null),
    [weekScore, roster, commitments, goalNodes, wins, weekWinsLive, pulseReport],
  );
  useEffect(() => {
    reviewRef.current = theReview;
    setGraph((g) => withReviewNode(g, theReview));
  }, [theReview]);
  // The Income Map: the goal orbs' facts and the agent's own numbers, kept in MASTER with the goals
  // (agent_goals.income_assumptions; Parry, 16 Oct, audit 3.5.3). This browser keeps a copy, and is the only keeper
  // until MASTER has that column ("browser"); the promise line says which.
  const [assume, setAssume] = useState<Assume>(ASSUME_DEFAULT);
  const [assumeKept, setAssumeKept] = useState<"master" | "browser">("browser");
  const [incomeOpen, setIncomeOpen] = useState(false);
  // Goals as ONE MOVE works them out (vip50-web-crm#279), so ONE MOVE and the Brain can never differ; read again after
  // a goal or the Income Map's numbers change. The Brain's own working-out below is the fallback and the demo.
  const [goalsPlan, setGoalsPlan] = useState<GoalsPlan | null>(null);
  const loadGoalsPlan = useCallback(() => {
    if (!live) return Promise.resolve();
    return fetch(goalsPlanUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setGoalsPlan(j ? readGoalsPlan(j) : null))
      .catch(() => {});
  }, [live]);
  useEffect(() => {
    void loadGoalsPlan();
  }, [loadGoalsPlan]);
  useEffect(() => {
    let local: Assume | null = null;
    try {
      const raw = localStorage.getItem(incomeKey);
      if (raw) local = readAssume(JSON.parse(raw));
    } catch {}
    if (local) setAssume(local);
    if (!live) return;
    fetch("/api/goals", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j || j.assumptions_kept !== true) return;
        setAssumeKept("master");
        if (j.income_assumptions) return setAssume(readAssume(j.income_assumptions));
        // First time with the column: carry this browser's numbers up so the phone and other computers see them.
        if (local) void fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ income_assumptions: local }) }).catch(() => {});
      })
      .catch(() => {});
  }, [live]);
  const saveAssume = (a: Assume) => {
    setAssume(a);
    try {
      localStorage.setItem(incomeKey, JSON.stringify(a));
    } catch {}
    if (!live) return;
    fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ income_assumptions: a }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setAssumeKept(j?.assumptions_saved === true ? "master" : "browser"))
      .catch(() => setAssumeKept("browser"))
      .then(() => loadGoalsPlan());
  };
  // Change goal (Parry, 16 Oct, audit 3.4.1 and 3.5.2): saved to MASTER agent_goals, then the goal orbs are read again.
  const saveGoal = useCallback(
    async (key: GoalKey, value: number): Promise<string | null> => {
      if (!live) return "Example agent: goals are not saved.";
      const from = goalFacts(graph.nodes).find((g) => g.from)?.from ?? null;
      try {
        const r = await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goals: { [key]: value }, starts_on: from }) });
        const j = await r.json().catch(() => null);
        if (!r.ok) return typeof j?.error === "string" ? j.error : "That didn't save. Try again.";
      } catch {
        return "That didn't save. Check your connection and try again.";
      }
      await Promise.all([refreshLive(), loadGoalsPlan()]);
      return null;
    },
    [live, refreshLive, graph.nodes, loadGoalsPlan],
  );
  // The agent's goal year start (Parry, 21 Oct): the latest such day on or before today, saved on their goals row.
  const setGoalStart = useCallback(
    async (month: number, day: number): Promise<string | null> => {
      if (!live) return "Example agent: goals are not saved.";
      const start = yearStartFor(month, day, todayIn());
      if (!start) return "That day doesn't exist. Pick another.";
      try {
        const r = await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ starts_on: start, set_start: true }) });
        const j = await r.json().catch(() => null);
        if (!r.ok) return typeof j?.error === "string" ? j.error : "That didn't save. Try again.";
      } catch {
        return "That didn't save. Check your connection and try again.";
      }
      await Promise.all([refreshLive(), loadGoalsPlan()]);
      return null;
    },
    [live, refreshLive, loadGoalsPlan],
  );
  // Referral Scoreboard data (declared here: the goals below count its referrals).
  const [refs, setRefs] = useState<Referrals | null>(null);
  // The referrals goal counts the same number as the Referrals orb (`this_year`), so the two never disagree.
  const factsKey = JSON.stringify(withReferralCount(goalFacts(graph.nodes), refs));
  const theIncome = useMemo(() => incomeMap(JSON.parse(factsKey), assume, todayIn()), [factsKey, assume]);
  // Pulse Coach (§3q): eight weeks of the agent's own numbers from ONE MOVE; the example agent's until it answers.
  const [history, setHistory] = useState<History | null>(null);
  useEffect(() => {
    if (!live) return setHistory(demoHistory(todayIn()));
    fetch(historyUrl(8), { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setHistory(j ? readHistory(j) : null))
      .catch(() => {});
  }, [live]);
  const thePulseRead = useMemo(() => (history ? pulseRead(history, commitments, todayIn()) : null), [history, commitments]);
  // Weekly Review's "Make it a commitment" (Parry, 16 Oct): only on the agent's tap. For a signed-in agent the tap goes
  // into ONE MOVE's queue (vip50-web-crm#280), so the draft waits first in the set form on the desktop and on the phone;
  // ONE MOVE picks the week (this week Monday to Thursday while nothing is set, else next Monday) and says which in its
  // own words. Nothing is set for the agent. The example agent keeps the browser copy.
  const commitThing = useCallback(
    async (t: Thing): Promise<{ ok: boolean; text: string }> => {
      if (live) {
        try {
          const r = await fetch(queueUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(queueBody(t.draft)) });
          const j = await r.json().catch(() => null);
          const a = r.ok ? readQueueAnswer(j) : null;
          if (a) return { ok: true, text: a.words };
          return { ok: false, text: (j as { error?: string } | null)?.error || "That didn't save. Nothing was changed." };
        } catch {
          return { ok: false, text: "That didn't save. Check your connection and try again." };
        }
      }
      const w = commitWay(commitments, t.draft, lateInWeek(todayIn()));
      if (w.way === "set_now") return { ok: true, text: "Example agent: this would be set as this week's commitment. Nothing is saved." };
      try {
        localStorage.setItem(nextCommitKey, JSON.stringify(queueDraft(readQueued(localStorage.getItem(nextCommitKey)), t.draft)));
      } catch {
        return { ok: false, text: "This browser could not keep it. Add it when you set next week's commitments." };
      }
      return { ok: true, text: "Saved for next week: it goes first when you set Monday's commitments. You still choose." };
    },
    [commitments, live],
  );
  // Referral Scoreboard (§3r): who sent business and who is likely next, from ONE MOVE; the example agent's until it answers.
  const [refsOpen, setRefsOpen] = useState(false);
  // Marquee's tools inside the Brain on the labelled example (Parry, 18 Oct: no blank side panels).
  const [mqOpen, setMqOpen] = useState<{ tool: MqKey; deck?: string; href?: string } | null>(null);
  // §3af: referrals with other ONE agents, counts only, on the Scoreboard.
  const [network, setNetwork] = useState<NetworkCounts | null>(null);
  useEffect(() => {
    if (!live) return setNetwork(demoNetwork());
    fetch(networkUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setNetwork(j ? readNetwork(j) : null))
      .catch(() => {});
  }, [live]);
  const loadRefs = useCallback(() => {
    if (!live) return setRefs(demoReferrals(todayIn()));
    fetch(referralsUrl(), { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setRefs(j ? readReferrals(j) : null))
      .catch(() => {});
  }, [live]);
  useEffect(() => loadRefs(), [loadRefs]);
  useEffect(() => {
    refsRef.current = refs;
    setGraph((g) => withReferralsNode(g, refs, todayIn()));
  }, [refs]);
  const askReferral = useCallback(async (contactId: string): Promise<{ ok: boolean; words: string }> => {
    try {
      const r = await fetch(askUrl, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ contact_id: contactId }) });
      const j = (await r.json().catch(() => null)) as { ok?: boolean; reason?: string } | null;
      if (r.ok && j?.ok) return { ok: true, words: "Added to today's tasks. Ask in your own words; nothing is sent." };
      if (j?.reason === "already_asked") return { ok: true, words: "There is already an open ask for them in your tasks." };
      if (j?.reason === "opted_out" || j?.reason === "has_agent") return { ok: false, words: "Not for this one: they opted out or have an agent." };
      return { ok: false, words: "Could not add the task just now. Please try again." };
    } catch {
      return { ok: false, words: "Could not add the task just now. Please try again." };
    }
  }, []);
  // Log a thank-you the agent already gave (call, note, text or email): recorded in ONE MOVE only; nothing is sent.
  const thankedReferral = useCallback(async (contactId: string, kind: ThankKind): Promise<{ ok: boolean; words: string }> => {
    let res: { ok: boolean; words: string };
    try {
      const r = await fetch(thankedUrl, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ contact_id: contactId, kind }) });
      res = readThanked(r.status, await r.json().catch(() => null));
    } catch {
      res = { ok: false, words: "Could not log it just now. Nothing was saved; please try again." };
    }
    if (res.ok) setRefs((x) => (x ? applyThanked(x, contactId) : x));
    return res;
  }, []);

  // who has sent business, for the VIP swap coach (never suggest moving a referrer out)
  const referredMap = useMemo(() => new Map((refs?.referrers ?? []).map((x) => [x.id, x.total])), [refs]);
  const thankReferral = useCallback(async (referralId: string): Promise<string> => {
    try {
      const r = await fetch(thankUrl, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ referral_id: referralId }) });
      const j = (await r.json().catch(() => null)) as { ok?: boolean; reason?: string } | null;
      if (r.ok && j?.ok) {
        setRefs((x) => (x ? applyThank(x, referralId) : x));
        return "Added to today's tasks. Thank them in your own words; nothing is sent.";
      }
      if (j?.reason === "already_open") return "There is already an open thank-you for this one in your tasks.";
      if (j?.reason === "already_thanked") return "Already thanked: you logged a touch since.";
      if (r.status === 404 || r.status === 405) return "Thank-you tasks arrive with ONE MOVE's next update. Nothing was saved.";
      return "Could not add the task just now. Please try again.";
    } catch {
      return "Could not add the task just now. Please try again.";
    }
  }, []);
  const theHabits = useMemo(() => habitsToday(habitsDay, history, todayIn()), [habitsDay, history]);
  useEffect(() => {
    habitsRef.current = theHabits.length ? theHabits : null;
    setGraph((g) => withHabitsNode(g, theHabits.length ? theHabits : null));
  }, [theHabits]);
  const tickHabit = useCallback(
    async (key: string, done: boolean): Promise<string | null> => {
      if (!habitsDay) return "Your Daily Tracker isn't loaded yet.";
      const before = habitsDay;
      setHabitsDay(withTick(habitsDay, key, done)); // lights at once; ONE MOVE's answer settles it
      if (!live) return null;
      try {
        const r = await fetch(dailyUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, done }) });
        const body = await r.json().catch(() => null);
        const next = r.ok ? readDaily(body) : null;
        if (!next) throw new Error((body as { error?: string } | null)?.error || "That didn't save. Nothing was changed.");
        setHabitsDay(next);
        setWeekScore(next.week);
        return null;
      } catch (e) {
        setHabitsDay(before);
        return e instanceof Error ? e.message : "That didn't save. Nothing was changed.";
      }
    },
    [habitsDay, live],
  );
  // The agent's own habits (Parry, 20 Oct: "there is no way for the user to actually add a habit"): add, rename or
  // remove through ONE MOVE, which answers today's Daily Tracker with them in it.
  const ownHabit = useCallback(
    async (edit: { add?: string; key?: string; name?: string; remove?: boolean }): Promise<string | null> => {
      if (!live) return "Sign in to add habits of your own. This is the example agent.";
      const body = edit.add != null ? { name: edit.add } : edit.remove ? { key: edit.key, remove: true } : { key: edit.key, name: edit.name };
      try {
        const r = await fetch(habitsUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const j = await r.json().catch(() => null);
        const next = r.ok ? readDaily(j) : null;
        if (!next) return (j as { error?: string } | null)?.error || "That didn't save. Nothing was changed.";
        setHabitsDay(next);
        return null;
      } catch {
        return "That didn't save. Nothing was changed.";
      }
    },
    [live],
  );
  const openHabits = useCallback(() => {
    setHabitsOpen(true);
    if (!live) return;
    // fresh from ONE MOVE, in case a box was ticked on the phone since the Brain loaded
    fetch(dailyUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const d = readDaily(j);
        if (d) setHabitsDay(d);
      })
      .catch(() => {});
  }, [live]);
  // Review calls (§3v): admins only. The orb shows once ONE MOVE answers the agents list (a 403 for everyone else).
  const [rcAgents, setRcAgents] = useState<ReviewAgent[] | null>(null);
  const [rcOpen, setRcOpen] = useState(false);
  const loadRcAgents = useCallback(
    (q = "") => {
      if (!live) return setRcAgents(demoAgents().filter((a) => a.name.toLowerCase().includes(q.toLowerCase())));
      fetch(agentsUrl(q), { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          const a = j ? readAgents(j) : null;
          // An admin sees the orb even before ONE MOVE serves the list; saving then says to use Classic for now.
          if (a) setRcAgents(a);
          else if (admin) setRcAgents((x) => x ?? []);
        })
        .catch(() => {});
    },
    [live, admin],
  );
  useEffect(() => loadRcAgents(), [loadRcAgents]);
  useEffect(() => {
    rcRef.current = rcAgents != null;
    setGraph((g) => withReviewCallsNode(g, rcAgents != null));
  }, [rcAgents]);
  // Team (§3u): the week's leaderboard among members, full screen for the office TV; the example team in the demo.
  const [team, setTeam] = useState<Team | null>(null);
  const [teamOpen, setTeamOpen] = useState(false);
  const [teamScope, setTeamScope] = useState<TeamScope>("team");
  useEffect(() => {
    if (!live) return setTeam(demoTeam(mondayOf(todayIn())));
    fetch(teamUrl(teamScope), { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setTeam(j ? readTeam(j) : null))
      .catch(() => {});
  }, [live, teamScope]);
  useEffect(() => {
    teamRef.current = team;
    setGraph((g) => withTeamHub(g, hubNow()));
  }, [team]);
  // War room (K22, §3ae): the team leads, who has them and how fast they were reached, for a team's owner and admins.
  // ONE MOVE answers `team: null` for anyone not on a team, and the orb shows only for owners and admins.
  const [war, setWar] = useState<WarRoom | null>(null);
  const [warOpen, setWarOpen] = useState(false);
  const loadWar = useCallback(() => {
    if (!live) return setWar(demoWarRoom(Date.now()));
    const get = (u: string) => fetch(u, { credentials: "include", cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    Promise.all([get(leadsUrl(7)), get(logUrl()), get(teamDealsUrl())]).then(([l, g, d]) => setWar(l ? readWarRoom(l, g, d) : null));
  }, [live]);
  useEffect(() => {
    loadWar();
    if (!live) return;
    const t = setInterval(loadWar, 60_000);
    return () => clearInterval(t);
  }, [live, loadWar]);
  useEffect(() => {
    warRef.current = war;
    setGraph((g) => withTeamLeadsPage(withTeamHub(g, hubNow()), !!war || teamLeadsHint));
  }, [war]);
  const { people: teamPeople, war30, loadWar30 } = useTeamRoom(live);
  useEffect(() => {
    peopleRef.current = teamPeople;
    war30Ref.current = war30;
    setGraph((g) => withTeamHub(g, hubNow()));
  }, [teamPeople, war30]);
  // Wins (§3t), from ONE MOVE; the example agent's in the demo. No orb since Parry, 16 Oct: this week's are the
  // Scoreboard's "This week's wins" and the Weekly Review's Wins card (one list); the year's list opens from the Scoreboard.
  const [winsOpen, setWinsOpen] = useState(false);
  useEffect(() => {
    if (!live) return setWins(demoWins(todayIn()));
    fetch(winsUrl(), { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setWins(j ? readWins(j) : null))
      .catch(() => {});
    fetch(weekWinsUrl(), { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setWeekWinsLive(j ? readWeekWins(j) : null))
      .catch(() => {});
    fetch(scoreboardUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setScoreLive(j ? readScoreboard(j) : null))
      .catch(() => {});
  }, [live]);
  const closeWins = useCallback(() => setWinsOpen(false), []);
  // Likely to move (§3ab), one of Opportunities' four parts: ONE MOVE's answer, the agent's MLS member id (from My
  // Profile, re-read when the view opens) and ONE MOVE's past clients 5+ years once that route ships.
  const [likely, setLikely] = useState<MoveLikely | null>(null);
  const [likelyOpen, setLikelyOpen] = useState(false);
  const [mlsMissing, setMlsMissing] = useState<boolean | null>(null);
  const [pastClients, setPastClients] = useState<PastClient[] | null>(null);
  // ONE MOVE's own reason on its likely-to-move route (vip50-web-crm#293): no_mls_id or waiting_feed.
  const [likelyReasonWord, setLikelyReasonWord] = useState<RouteReason | null>(null);
  // Pulse's voice from MASTER (vip50-web-crm#277): the signed-in agent's choice goes into the local copy say() reads,
  // so Pulse speaks in it on every page, not only after My Profile opens. The demo keeps its local copy.
  useEffect(() => {
    if (!live) return;
    fetch(profileUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        void syncKind(j);
        // Likely to move's reason: no MLS member id in My Profile says so (lib/moveLikely.ts likelyReason)
        const p = j ? readProfile(j) : null;
        if (p) setMlsMissing(!p.ure_member_id.trim());
      })
      .catch(() => {});
  }, [live]);
  // Opening Likely to move reads the member id again, so one just added in My Profile changes the reason at once.
  useEffect(() => {
    if (!live || !likelyOpen) return;
    fetch(profileUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const p = j ? readProfile(j) : null;
        if (p) setMlsMissing(!p.ure_member_id.trim());
      })
      .catch(() => {});
  }, [live, likelyOpen]);
  // The 90-Day Challenge's live numbers (vip50-web-crm#277): today's score, arenas, streak, identity, enemy and group,
  // and "Day N of 90 · P today" on the orb. The demo keeps its example data (null here).
  const [challenge, setChallenge] = useState<LiveChallenge | null>(null);
  useEffect(() => {
    if (!live) return;
    fetch(challengeUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setChallenge(readChallenge(j)))
      .catch(() => {});
  }, [live]);
  useEffect(() => {
    challengeRef.current = challenge;
    setGraph((g) => withChallengeNode(g, challenge));
  }, [challenge]);
  const reloadChallenge = useCallback(() => {
    void fetch(challengeUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const c = readChallenge(j);
        if (c) setChallenge(c);
      })
      .catch(() => {});
  }, []);
  // The challenge page (Parry, 22 Oct: "yes on both"): the agent's own answer only; the example agent's on the demo.
  const demoCh = useMemo(() => (live ? null : demoChallenge()), [live]);
  const shownChallenge = challengeShown(live, challenge, () => demoCh);
  const [chOpen, setChOpen] = useState(false);
  // Energy (§3w): retired from ONE YOU by Parry, 16 Oct ("lets drop the energy orb"). Nothing asks for it or reads it
  // here any more; stored answers stay in MASTER.
  // Life-event radar (§3y): from ONE MOVE once it answers (404 until then: no orb), the example agent's in the demo.
  // Life events, one list (vip50-web-crm#294; Parry, 17 Oct: "yes"): birthdays, anniversaries, home anniversaries and
  // news from the agent's notes, soonest first (lib/lifeUpcoming.ts). The example agent's three in the demo.
  const [life, setLife] = useState<UpcomingList | null>(null);
  const [lifeOpen, setLifeOpen] = useState(false);
  useEffect(() => {
    if (!live) return setLife(demoUpcoming(todayIn()));
    fetch(lifeUpcomingUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setLife(j ? readUpcoming(j) : null))
      .catch(() => {});
  }, [live]);
  useEffect(() => {
    lifeRef.current = life;
    setGraph((g) => withLifeUpcomingNode(g, life));
  }, [life]);
  const lifeTask = useCallback(
    async (p: Upcoming): Promise<boolean> =>
      !live ||
      (await fetch(lifeTaskUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lifeTaskBody(p)) })
        .then(async (r) => r.ok && (await r.json().catch(() => null))?.ok !== false)
        .catch(() => false)),
    [live],
  );
  // Edit my website (ENTITLEMENT §6a): shown only when MASTER knows the agent's site; a one-time ticket on press.
  const [siteHost, setSiteHost] = useState<string | null>(null);
  const [siteNote, setSiteNote] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [teamSites, setTeamSites] = useState<TeamSite[]>([]);
  const [siteRead, setSiteRead] = useState(false);
  // §6a v1.4 (Parry, 14 Oct: "yes on team sign in for their own ads"): a team agent asks the team lead for an ad.
  const [agentSites, setAgentSites] = useState<AgentTeamSite[]>([]);
  useEffect(() => {
    if (!live) return;
    fetch("/api/site", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        setSiteHost(typeof j?.site_host === "string" ? j.site_host : null);
        setTeamSites(readTeamSites(j?.team_sites));
        setAgentSites(readAgentTeamSites(j?.agent_team_sites));
      })
      .catch(() => {})
      .finally(() => setSiteRead(true));
  }, [live]);
  // Pulse posted (WEBSITES §7a): the team blog's last 7 days, for the team's owner and admins, in the morning note.
  const [teamPosts, setTeamPosts] = useState<{ host: string; posts: TeamPost[] } | null>(null);
  useEffect(() => {
    if (!live) return;
    fetch("/api/site/posts", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setTeamPosts(j && typeof j.host === "string" && Array.isArray(j.posts) && j.posts.length ? { host: j.host, posts: j.posts } : null))
      .catch(() => {});
  }, [live]);
  const editSite = useCallback(async (site?: string, next?: string) => {
    setSiteNote(null);
    const r = await fetch("/api/site", {
      method: "POST",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...(site ? { site } : {}), ...(next ? { next } : {}) }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    if (r?.ok && typeof j?.url === "string") return window.location.assign(j.url);
    setSiteNote(typeof j?.error === "string" ? j.error : "Your website could not be opened just now. Please try again.");
  }, []);
  // Likely to move (§3ab): from ONE MOVE once it answers (404 until then: no orb), the example agent's past clients in the demo.
  // Ask AI about you (Scout 54): this month's marks and the agent's area, kept in MASTER through ONE MOVE's
  // /api/brain/ai-check (vip50-web-crm#326). This browser holds them only for the example agent, or when that route
  // does not answer ("Saved on this device only").
  const [askAi, setAskAi] = useState<AiResults | null>(null);
  const [askArea, setAskArea] = useState("");
  const [askCheck, setAskCheck] = useState<AiCheck | null>(null);
  const [askDevice, setAskDevice] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const askMonth = monthOf(todayIn());
  const readDevice = useCallback(() => {
    try {
      setAskAi(readResults(JSON.parse(localStorage.getItem(`ask-ai:${askMonth}`) ?? "{}")));
      setAskArea(localStorage.getItem("ask-ai:area") ?? "");
    } catch {
      setAskAi({});
    }
  }, [askMonth]);
  const takeCheck = useCallback((c: AiCheck) => {
    setAskCheck(c);
    setAskAi(c.results);
    setAskArea(c.area);
    setAskDevice(false);
  }, []);
  useEffect(() => {
    if (!live) return readDevice();
    let gone = false;
    fetch(aiCheckUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (gone) return;
        const c = j ? readAiCheck(j) : null;
        if (c) takeCheck(c);
        else {
          setAskDevice(true);
          readDevice();
        }
      })
      .catch(() => {
        if (gone) return;
        setAskDevice(true);
        readDevice();
      });
    return () => {
      gone = true;
    };
  }, [live, readDevice, takeCheck]);
  const keepDevice = (next: AiResults, area?: string) => {
    try {
      localStorage.setItem(`ask-ai:${askMonth}`, JSON.stringify(next));
      if (area != null) localStorage.setItem("ask-ai:area", area);
    } catch {}
  };
  // A change goes to the route; if it does not take, the device copy keeps it and the view says so.
  const saveAi = async (change: Parameters<typeof aiCheckBody>[0], next: AiResults, area?: string) => {
    if (!live || askDevice) return keepDevice(next, area);
    const ok = await fetch(aiCheckUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(aiCheckBody(change)) })
      .then(async (r) => {
        if (!r.ok) return false;
        const c = readAiCheck(await r.json().catch(() => null));
        if (c) takeCheck(c);
        return true;
      })
      .catch(() => false);
    if (!ok) {
      setAskDevice(true);
      keepDevice(next, area);
    }
  };
  const markAi = (q: string, e: AiEngine, a: AiAnswer | null) => {
    const next = { ...(askAi ?? {}) };
    if (a) next[resultKey(q, e)] = a;
    else delete next[resultKey(q, e)];
    setAskAi(next);
    void saveAi({ mark: { key: resultKey(q, e), answer: a } }, next);
  };
  const saveArea = (a: string) => {
    setAskArea(a);
    void saveAi({ area: a }, askAi ?? {}, a);
  };
  useEffect(() => {
    if (!live) return setLikely(demoMoveLikely());
    fetch(moveLikelyUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setLikely(j ? readMoveLikely(j) : null))
      .catch(() => {});
  }, [live]);
  // ONE MOVE's real past clients 5+ years and its one reason (vip50-web-crm#293), read again each time the view opens
  // so an MLS member id just added in My Profile changes the reason at once. 404: the one example shows.
  useEffect(() => {
    if (!live) return;
    void readRoute(pastClientsUrl, readPastClientsAnswer).then((a) => {
      if (a.kind !== "data") return;
      setPastClients(a.data.people);
      setLikelyReasonWord(a.data.reason);
    });
  }, [live, likelyOpen]);
  const likelyCall = useCallback(
    async (contactId: string): Promise<boolean> =>
      !live ||
      (await fetch(likelyCallUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(likelyCallBody(contactId)) })
        .then(async (r) => r.ok && (await r.json().catch(() => null))?.ok !== false)
        .catch(() => false)),
    [live],
  );
  useEffect(() => {
    likelyRef.current = likely;
    likelyOptsRef.current = { mlsMissing, pastClients, routeReason: likelyReasonWord };
    setGraph((g) => withOpportunities(withMoveLikelyNode(g, likely, { mlsMissing, pastClients, routeReason: likelyReasonWord })));
  }, [likely, mlsMissing, pastClients, likelyReasonWord]);
  // The ONE Growth orb (GROWTH.md §3, §5; Parry, 16 Oct): locked with the offer without Growth; with it, its seven pieces,
  // and Ad requests for each team site the agent owns or admins. The tour shows the example agent's site and team site.
  const growthState = useMemo<GrowthState>(
    () => ({
      growth: agent.growth === true || pkg === "growth",
      siteHost: productTour ? "sarah-bennett.vip50homes.com" : live ? (siteRead ? siteHost : undefined) : null,
      teamHosts: productTour ? ["summit-home.vip50homes.com"] : teamSites.map((t) => t.host),
      likely: !!likely,
    }),
    [agent.growth, pkg, productTour, live, siteRead, siteHost, teamSites, likely],
  );
  useEffect(() => {
    growthRef.current = growthState;
    setGraph((g) => withGrowthNodes(g, growthState));
  }, [growthState]);
  const likelyNotUseful = useCallback(
    async (p: LikelyPerson): Promise<boolean> => {
      if (live) {
        const ok = await fetch(notUsefulUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contact_id: p.contactId }) })
          .then((r) => r.ok)
          .catch(() => false);
        if (!ok) return false;
      }
      setLikely((m) => (m ? withoutPerson(m, p.contactId) : m));
      return true;
    },
    [live],
  );
  // Outreach and Events show what each tool is doing (lib/outreach.ts; Parry, 16 Oct: "2 yes", "3 yes"), and Agent
  // Attraction on the Team orb for a team lead. From ONE MOVE's read-only routes; the example agent's in the demo.
  // (Market Pulse folded into Market Reports, HOME-REPORT v0.4: /api/brain/market-pulse is no longer called.)
  const [outreach, setOutreach] = useState<Outreach | null>(null);
  const [eventsNow, setEventsNow] = useState<EventsNow | null>(null);
  const [attraction, setAttraction] = useState<Attraction | null>(null);
  const [hrStart, setHrStart] = useState<"vips" | null>(null);
  const loadOutreach = useCallback(() => {
    if (!live) {
      setOutreach(demoOutreach());
      setEventsNow(demoEvents(todayIn()));
      setAttraction(demoAttraction(todayIn()));
      return;
    }
    const get = (url: string) => fetch(url, { credentials: "include", cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    void get(outreachUrl).then((j) => j && setOutreach(readOutreach(j)));
    void get(eventsUrl).then((j) => j && setEventsNow(readEvents(j)));
    void get(attractionUrl).then((j) => j && setAttraction(readAttraction(j)));
  }, [live]);
  useEffect(() => {
    loadOutreach();
  }, [loadOutreach]);
  // Action Plans drawn natively and Learn's parts (lib/actionPlans.ts, lib/learn.ts; walker 0245, Parry: "yes"). An
  // empty plan list draws the labelled example plan; the example agent sees it too.
  const [plans, setPlans] = useState<ActionPlan[] | null>(null);
  const [learn, setLearn] = useState<Learn | null>(null);
  useEffect(() => {
    if (!live) {
      setPlans([]);
      setLearn(demoLearn(todayIn()));
      return;
    }
    const get = (url: string) => fetch(url, { credentials: "include", cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    void get(actionPlansUrl).then((j) => j && setPlans(readPlans(j)));
    void get(learnUrl).then((j) => j && setLearn(readLearn(j)));
  }, [live]);
  useEffect(() => {
    outreachRef.current = outreach;
    eventsRef.current = eventsNow;
    plansRef.current = plans;
    learnRef.current = learn;
    setGraph((g) => {
      const next = withLearnNodes(withPlanNodes(withEventsNodes(withOutreachNodes(g, outreach), eventsNow), plans), learn);
      // the walk-through's Video Library and VIP Docs move under Learn once it is there (lib/examples/move2.ts)
      return productTour ? withExampleMoveTools(next) : next;
    });
  }, [outreach, eventsNow, plans, learn, productTour]);
  // The broker's view (§3ao): from ONE MOVE once it answers; a 403 (not a broker or office manager) or a 404 (not built
  // yet) draws no Broker orb. The example brokerage in the demo.
  const [broker, setBroker] = useState<Broker | null>(null);
  const [brokerOpen, setBrokerOpen] = useState(false);
  useEffect(() => {
    if (!live) return setBroker(demoBroker(mondayOf(todayIn()), Date.now()));
    fetch(brokerUrl(), { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setBroker(j ? readBroker(j) : null))
      .catch(() => {});
  }, [live]);
  useEffect(() => {
    brokerRef.current = broker;
    setGraph((g) => withBrokerNode(g, broker));
  }, [broker]);
  // Deals under contract (§3z): from ONE MOVE once it answers (404 until then: no orb), the example agent's in the demo.
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [dealsOpen, setDealsOpen] = useState<false | "list" | "add">(false);
  const loadDeals = useCallback(() => {
    if (!live) return setDeals(demoDeals(todayIn()));
    fetch(dealsUrl(), { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setDeals(j ? readDeals(j) : null))
      .catch(() => {});
  }, [live]);
  useEffect(() => loadDeals(), [loadDeals]);
  // A deal the agent just saved on the Deals panel: shown at once; read again from ONE MOVE when it gave no deal back.
  const dealAdded = useCallback((d: Deal | null) => (d ? setDeals((list) => [d, ...(list ?? []).filter((x) => x.id !== d.id)]) : loadDeals()), [loadDeals]);
  useEffect(() => {
    dealsRef.current = deals;
    setGraph((g) => withDealsNode(g, deals, todayIn()));
  }, [deals]);
  // Hot on your website (LOFTY-PARITY P3): known visitors back on the agent's site, from ONE MOVE; re-read every 5 minutes.
  const [webHot, setWebHot] = useState<WebSignal[] | null>(null);
  useEffect(() => {
    if (!live) return;
    const load = () =>
      fetch(signalsUrl, { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => setWebHot(j ? readSignals(j) : null))
        .catch(() => {});
    load();
    const t = setInterval(load, 300_000);
    return () => clearInterval(t);
  }, [live]);
  // Ads that did not reach Meta, or team ads paused (ONE Websites site_alerts): red or yellow under ONE YOU.
  const [adsAlerts, setAdsAlerts] = useState<SiteAlert[] | null>(null);
  useEffect(() => {
    if (!live) return;
    const load = () =>
      fetch("/api/site-alerts", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => j && Array.isArray(j.alerts) && setAdsAlerts(readSiteAlerts(j)))
        .catch(() => {});
    load();
    const t = setInterval(load, 300_000);
    return () => clearInterval(t);
  }, [live]);
  useEffect(() => {
    adsRef.current = adsAlerts;
    setGraph((g) => withAdsAlertNode(g, adsAlerts));
  }, [adsAlerts]);
  // Ask Pulse's people as orbs while the answer is open (Parry, 15 Oct); gone with the answer.
  useEffect(() => {
    askPeopleRef.current = ask?.people ?? null;
    setGraph((g) => withAskPeople(g, ask?.people));
  }, [ask]);
  // New leads (LOFTY-PARITY P9): re-read every 2 minutes; red until each lead is reached.
  const [newLeads, setNewLeads] = useState<NewLeads | null>(null);
  useEffect(() => {
    if (!live) return setNewLeads(demoNewLeads());
    const load = () =>
      fetch(todayUrl, { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => setNewLeads(j ? readNewLeads(j) : null))
        .catch(() => {});
    load();
    const t = setInterval(load, 120_000);
    return () => clearInterval(t);
  }, [live]);
  useEffect(() => {
    newLeadsRef.current = newLeads;
    setGraph((g) => withOpportunities(withNewLeadsNode(g, newLeads)));
  }, [newLeads]);
  // the clock on each lead's line ("Came in 6:25 am · 20 minutes ago") moves once a minute
  useEffect(() => {
    const t = setInterval(() => setGraph((g) => withNewLeadsNode(g, newLeadsRef.current)), 60_000);
    return () => clearInterval(t);
  }, []);
  // Reached turns the lead green here at once (the orb colour follows); the other two count a try and keep it red.
  const leadOutcome = useCallback((contactId: string, outcome: LeadOutcome, when: RetryWhen | null) => {
    setNewLeads((l) => (l ? withOutcome(l, contactId, outcome, when, new Date().toISOString()) : l));
  }, []);
  // Looks Hot (CONNECTIONS §5.1, vip50-web-crm#244): one decide item per contact whose actions say they are ready.
  const [heat, setHeat] = useState<HeatSuggestion[] | null>(null);
  useEffect(() => {
    if (!live) return;
    const load = () =>
      fetch(heatUrl, { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => setHeat(j ? readHeat(j) : null))
        .catch(() => {});
    load();
    const t = setInterval(load, 300_000);
    return () => clearInterval(t);
  }, [live]);
  // Looks Hot, one orb (lib/looksHot.ts; walker 17 Oct, Parry "yes"), a part of Opportunities: ONE MOVE's looks-hot
  // route (live 17 Oct); only when that route is not there (404 or no answer) the heat suggestions and the website
  // signals above, merged. A refusal (signed out, a 500) keeps what the orb had.
  const [looksRoute, setLooksRoute] = useState<LooksPerson[] | null>(null);
  const [looksMissing, setLooksMissing] = useState(false);
  useEffect(() => {
    if (!live) return;
    const load = () =>
      readRoute(looksHotUrl, readLooksHot).then((a) => {
        if (a.kind === "data") {
          setLooksRoute(a.data);
          setLooksMissing(false);
        } else if (a.kind === "missing") setLooksMissing(true);
      });
    load();
    const t = setInterval(load, 300_000);
    return () => clearInterval(t);
  }, [live]);
  const [notYet, setNotYet] = useState<NotYet>({});
  useEffect(() => {
    try {
      setNotYet(readNotYet(localStorage.getItem(NOT_YET_STORE)));
    } catch {}
  }, []);
  const [looksGone, setLooksGone] = useState<ReadonlySet<string>>(() => new Set());
  const looks = useMemo(() => {
    const all = !live ? demoLooksHot() : looksRoute ?? (looksMissing && (heat || webHot) ? mergeLooks(fromHeat(heat ?? []), fromSignals(webHot ?? [])) : null);
    return shownLooks(all, notYet, looksGone);
  }, [live, looksRoute, looksMissing, heat, webHot, notYet, looksGone]);
  useEffect(() => {
    looksRef.current = looks;
    setGraph((g) => withOpportunities(withLooksHot(g, looks)));
  }, [looks]);
  const looksDone = useCallback((p: LooksPerson, action: "move_hot" | "call" | "not_yet") => {
    if (action === "not_yet")
      setNotYet((n) => {
        const next = withNotYet(n, p);
        try {
          localStorage.setItem(NOT_YET_STORE, JSON.stringify(next));
        } catch {}
        return next;
      });
    else setLooksGone((g) => new Set(g).add(p.id));
  }, []);
  // New to Sort (lib/newToSort.ts; walker 17 Oct, Parry "yes"): ONE MOVE's route when it answers; until then the new
  // leads ONE MOVE already sends from the four sources. Re-read every 2 minutes; a sorted face leaves at once.
  // Only when ONE MOVE's route is not there (404 or no answer) does the new-leads fallback show; a refusal keeps what it had.
  const [ntsRoute, setNtsRoute] = useState<NtsData | null>(null);
  const [ntsMissing, setNtsMissing] = useState(false);
  const [ntsGone, setNtsGone] = useState<ReadonlySet<string>>(() => new Set());
  const loadNts = useCallback(() => {
    if (!live) return;
    void readRoute(newToSortUrl, readNewToSort).then((a) => {
      if (a.kind === "data") {
        setNtsRoute(a.data);
        setNtsMissing(false);
      } else if (a.kind === "missing") setNtsMissing(true);
    });
  }, [live]);
  useEffect(() => {
    loadNts();
    if (!live) return;
    const t = setInterval(loadNts, 120_000);
    return () => clearInterval(t);
  }, [live, loadNts]);
  const nts = useMemo(() => {
    const d = !live ? demoNewToSort() : ntsRoute ?? (ntsMissing ? fromNewLeads(newLeads) : null);
    return d ? [...ntsGone].reduce(withoutSorted, d) : null;
  }, [live, ntsRoute, ntsMissing, newLeads, ntsGone]);
  useEffect(() => {
    ntsRef.current = nts;
    setGraph((g) => withOpportunities(withNewToSort(g, nts)));
  }, [nts]);
  // Onboarding board (TEAM-ONBOARDING §2.3, vip50-web-crm#250): team lead and admins only; anyone else gets a 403 and no orb.
  const [onb, setOnb] = useState<OnbMember[] | null>(null);
  useEffect(() => {
    if (!live) return setOnb(demoOnboarding());
    const load = () =>
      fetch(onboardingUrl, { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          setOnb(j ? readOnboarding(j) : null);
          onbRemovedRef.current = readRemoved(j);
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 600_000);
    return () => clearInterval(t);
  }, [live]);
  // Each member's own Getting started list (GETTING-STARTED §4: the board reads the same steps, not its own six), read
  // with `?agent=` (their team lead may). Until it answers, the board's own line shows.
  const [onbStart, setOnbStart] = useState<Record<string, Start>>({});
  useEffect(() => {
    if (!live || !onb?.length) return;
    let current = true;
    Promise.all(
      onb.slice(0, 15).map((m) =>
        fetch(startAgentUrl(m.id), { credentials: "include", cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((j) => [m.id, readStart(j)] as const)
          .catch(() => [m.id, null] as const),
      ),
    ).then((rows) => {
      if (!current) return;
      const out: Record<string, Start> = {};
      for (const [id, st] of rows) if (st) out[id] = st;
      setOnbStart(out);
    });
    return () => {
      current = false;
    };
  }, [live, onb]);
  const onbShown = useMemo(() => (onb ? onb.map((m) => withStart(m, onbStart[m.id] ?? null)) : null), [onb, onbStart]);
  useEffect(() => {
    onbRef.current = onbShown;
    setGraph((g) => withTeamHub(g, hubNow()));
  }, [onbShown]);
  // Getting started: the signed-in agent's list from ONE MOVE; the example list (4 of 11) in the demo and tour.
  const [start, setStart] = useState<Start | null>(null);
  const [startReopen, setStartReopen] = useState(false);
  const startPending = useRef(false);
  const loadStart = useCallback(() => {
    if (!live) return setStart(demoStart());
    fetch(startUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const st = readStart(j);
        if (st) setStart(st);
      })
      .catch(() => {});
  }, [live]);
  useEffect(() => {
    loadStart();
    if (!live) return;
    const t = setInterval(loadStart, 600_000);
    return () => clearInterval(t);
  }, [live, loadStart]);
  // My plan and billing (walker 14 Oct, Parry approved): Stripe's own portal when Stripe bills them, else My Profile.
  const openBilling = async () => {
    const j = live ? await fetch("/api/membership", { method: "POST" }).then((r) => r.json().catch(() => null)).catch(() => null) : null;
    if (j && typeof j.url === "string") window.location.assign(j.url);
    else goTo(movePageId("/profile"));
  };
  // Revenue share and My network from reZEN (REZEN.md §3a): only the boxes the agent ticked, read hourly by ONE MOVE.
  const [rezen, setRezen] = useState<{ r: Revshare | null; n: RezenNetwork | null; p: RezenPlan[] }>({ r: null, n: null, p: [] });
  // Whether reZEN is connected, for Goals' "Closings and GCI come from reZEN and the MLS" line (audit 3.4.1).
  const [rezenOn, setRezenOn] = useState<boolean | null>(null);
  useEffect(() => {
    const take = (read: unknown) => setRezen({ r: readRevshare(read), n: readRezenNetwork(read), p: readRezenRead(read).plans });
    if (!live) {
      setRezenOn(true);
      return take(demoRezenRead());
    }
    const load = () =>
      fetch(rezenUrl, { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          setRezenOn(j ? j.connected === true : null);
          take(j?.read);
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 1_800_000);
    return () => clearInterval(t);
  }, [live]);
  useEffect(() => {
    rezenRef.current = rezen;
    setGraph((g) => withRezenNodes(g, rezen.r, rezen.n));
  }, [rezen]);
  // One-tap listing launch (K21, LAUNCH.md v0.2): a Launch orb under each launched listing, yellow while a draft waits
  // for the agent, red on a failure. ONE MOVE's route answers once GO/MOVE ships it; until then nothing is drawn.
  const [launches, setLaunches] = useState<Launch[] | null>(null);
  useEffect(() => {
    if (!live) return;
    const load = () =>
      fetch(launchUrl, { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => setLaunches(j ? readLaunches(j) : null))
        .catch(() => {});
    load();
    const t = setInterval(load, 300_000);
    return () => clearInterval(t);
  }, [live]);
  useEffect(() => {
    launchRef.current = launches;
    setGraph((g) => withLaunchNodes(g, launches));
  }, [launches]);
  // Income forecast (K20): deals under contract and the Hot/Warm/Cold list as expected GCI by month, at the Income
  // Map's average GCI per closing. Part 2 of the Goals orb since Parry, 16 Oct ("Likely next 3 months": each month with
  // who makes it up, first names, one click to the record), so the Hot people's first names are kept for that.
  const [classes, setClasses] = useState<HwcClass[] | null>(null);
  const [hotPeople, setHotPeople] = useState<ForecastPerson[] | null>(null);
  const [forecastOpen, setForecastOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  // Opening Goals reads ONE MOVE's plan again, so a deal or a Hot person added since shows.
  useEffect(() => {
    if (goalsOpen) void loadGoalsPlan();
  }, [goalsOpen, loadGoalsPlan]);
  useEffect(() => {
    if (!live) {
      setHotPeople([{ cls: "hot", name: "Amy Chen", contactId: null }, { cls: "hot", name: "Marcus Lee", contactId: null }, { cls: "hot", name: "Priya Shah", contactId: null }]);
      return setClasses(demoClasses());
    }
    fetch(hwcUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const h = readHwc(j);
        setClasses(h?.people.map((p) => p.cls) ?? null);
        setHotPeople(h ? h.people.filter((p) => p.cls === "hot").map((p) => ({ cls: p.cls, name: p.name, contactId: p.contactId })) : null);
      })
      .catch(() => {});
  }, [live]);
  const forecastAvg = theIncome?.avgGci ?? { value: INCOME_START.avgGci, from: "start" as const };
  const theForecast = useMemo(() => forecast(deals, classes, forecastAvg.value, todayIn(), hotPeople), [deals, classes, forecastAvg.value, hotPeople]);
  // Goals, one orb in three parts (Parry, 16 Oct): closed so far, likely next 3 months, what to do each week. One source.
  const theGoalsOwn = useMemo(() => goalsThree(JSON.parse(factsKey), theIncome, theForecast, todayIn()), [factsKey, theIncome, theForecast]);
  // For a signed-in agent ONE MOVE's answer (vip50-web-crm#279) when it came for today; the Brain's own otherwise.
  const shownGoals = useMemo(
    () => {
      const g = goalsShown(live ? goalsPlan : null, { three: theGoalsOwn, goals: JSON.parse(factsKey), income: theIncome, forecast: theForecast }, todayIn());
      return { ...g, goals: withReferralCount(g.goals, refs) };
    },
    [live, goalsPlan, theGoalsOwn, factsKey, theIncome, theForecast, refs],
  );
  const theGoals = shownGoals.three;
  const setDealStatus: DealSetStatus = useCallback(
    async (d, status, closing) => {
      if (live) {
        const r = await fetch(dealUrl(d.id), { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dealStatusBody(status, closing)) }).catch(() => null);
        if (!r) return "failed";
        if (r.status === 409) {
          const q = readClosingAsk(await r.json().catch(() => null));
          return q ?? "failed";
        }
        if (!r.ok) return "failed";
      }
      setDeals((list) => (list ? withDealStatus(list, d.id, status) : list));
      return "ok";
    },
    [live],
  );
  // SITE-FEEDS K16: the client page switch on the Deal card. The example agent's switch is local; nothing is sent.
  const setDealClientPage: DealSetClientPage = useCallback(
    async (d, on) => {
      if (live) {
        const r = await fetch(dealUrl(d.id), { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(clientPageBody(on)) }).catch(() => null);
        const a = readSaveAnswer(r ? await r.json().catch(() => null) : null, !!r?.ok);
        if (!a.ok) return { error: a.error };
      }
      setDeals((list) => (list ? withDealClientPage(list, d.id, on) : list));
      return "ok";
    },
    [live],
  );
  // Time off (§3x): a card on My Profile since Parry, 16 Oct (components/brain/TimeOffSection.tsx plans and cancels).
  // Read here only for "Away until <date>" in ONE YOU's panel and the centre ONE orb.
  const [timeOff, setTimeOff] = useState<TimeOffState | null>(null);
  const loadTimeOff = useCallback(() => {
    if (!live) return setTimeOff(demoTimeOff(todayIn()));
    fetch(timeOffUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setTimeOff(j ? readTimeOff(j, todayIn()) : null))
      .catch(() => {});
  }, [live]);
  useEffect(() => loadTimeOff(), [loadTimeOff]);
  useEffect(() => {
    timeOffRef.current = timeOff;
    setGraph((g) => withAwayLabel(g, timeOff));
  }, [timeOff]);
  // Accountability partners (§3s): from ONE MOVE once it answers; example partners in the demo.
  const [partners, setPartners] = useState<PartnersState | null>(null);
  const [partnersOpen, setPartnersOpen] = useState(false);
  const loadPartners = useCallback(() => {
    if (!live) return setPartners((p) => p ?? demoPartners(todayIn()));
    fetch(partnersUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setPartners(j ? readPartners(j) : null))
      .catch(() => {});
  }, [live]);
  useEffect(() => loadPartners(), [loadPartners]);
  // Opening Partners marks the nudges seen (§3s.4 v1.67), so the orb stops pulsing for them.
  useEffect(() => {
    if (!partnersOpen || !partners || !unseenNudges(partners)) return;
    if (live) fetch(partnersActionUrl("seen"), { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => {});
    setPartners((s) => (s ? withAllSeen(s) : s));
  }, [partnersOpen, partners, live]);
  const partnerAct = useCallback(
    async (a: { action: "respond" | "end" | "nudge"; pairId: string; accept?: boolean; kind?: string }): Promise<string | null> => {
      if (!live) {
        // the example agent: show the result without ONE MOVE
        setPartners((s) => {
          if (!s) return s;
          if (a.action === "nudge") return { ...s, partners: s.partners.map((p) => (p.pairId === a.pairId ? { ...p, lastNudgeFromMe: `${todayIn()}T12:00:00Z` } : p)) };
          if (a.action === "end") return { ...s, partners: s.partners.filter((p) => p.pairId !== a.pairId) };
          const inv = s.invitesIn.find((i) => i.pairId === a.pairId);
          const rest = s.invitesIn.filter((i) => i.pairId !== a.pairId);
          if (!a.accept || !inv) return { ...s, invitesIn: rest };
          return { ...s, invitesIn: rest, partners: [...s.partners, { pairId: inv.pairId, userId: inv.pairId, name: inv.name, photo: null, score: 71, minimum: 100, last4: [88, 95, 102, 90], streak: 0, tickedToday: true, lastNudgeFromMe: null }] };
        });
        return null;
      }
      const body = a.action === "respond" ? { pair_id: a.pairId, accept: a.accept } : a.action === "nudge" ? { pair_id: a.pairId, kind: a.kind } : { pair_id: a.pairId };
      try {
        const r = await fetch(partnersActionUrl(a.action), { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const j = (await r.json().catch(() => null)) as { ok?: boolean; reason?: string } | null;
        if (r.ok && j?.ok) {
          loadPartners();
          return null;
        }
        if (j?.reason === "too_soon") return "You've already nudged them today. One a day.";
        if (j?.reason === "limit") return "You already have 3 partners.";
        return "That didn't go through. Nothing was changed.";
      } catch {
        return "That didn't go through. Nothing was changed.";
      }
    },
    [live, loadPartners],
  );
  // A coach's Pulse read of one agent they coach (§3n.4, §3q): their eight weeks, in the third person. MASTER answers
  // only for an agent linked to this coach (coach_links); the example agents use example weeks.
  const [agentRead, setAgentRead] = useState<{ who: string; read: PulseRead } | null>(null);
  const readAgent = useCallback(
    async (a: Coached): Promise<string | null> => {
      const first = a.name.split(/\s+/)[0];
      const today = todayIn();
      let h: History | null = null;
      if (!live) h = demoHistory(today, (coached ?? []).findIndex((x) => x.id === a.id) + 1);
      else {
        try {
          const r = await fetch(historyUrl(8, a.id), { credentials: "include", cache: "no-store" });
          h = r.ok ? readHistory(await r.json()) : null;
        } catch {
          h = null;
        }
      }
      const read = h ? pulseRead(h, a.c, today, first) : null;
      if (!read) return `No finished week for ${first} yet, so Pulse has nothing to read.`;
      setAgentRead({ who: first, read });
      return null;
    },
    [live, coached],
  );
  const [powerOpen, setPowerOpen] = useState(false);
  const [growthOpen, setGrowthOpen] = useState<string | null>(null); // a Growth piece's full view, by its key
  // The Day Clock (§3o.9): the day planned round the calendar; Your day lists its blocks in time order.
  const [clockOpen, setClockOpen] = useState(false);
  const [tellText, setTellText] = useState<string | undefined>(undefined);
  const doneRefs = useMemo(() => new Set([...dayDone].map((id) => id.replace(/^day:/, ""))), [dayDone]);
  // the week's commitments become today's work (§3o.7)
  const commitWork = useMemo(() => commitmentWork(commitments, todayIn()), [commitments]);
  // The day's work by id, so the Day Clock can say who each block is for (lib/dayLabels.ts, Parry 20 Oct).
  const dayTitles = useMemo(
    () => new Map<string, string>([...(graph.today ?? []).map((d) => [d.ref ?? d.id.replace(/^day:/, ""), d.what] as [string, string]), ...(planned?.items ?? []).map((p) => [p.ref, p.title] as [string, string])]),
    [graph.today, planned],
  );
  const theDay = useDay({ today: graph.today ?? [], planned, live, doneRefs, onPlan: setPlanned, extra: commitWork });
  // Power Hour in ONE YOU: the one ONE MOVE sends (and its follow-up), read once by useDay and drawn the same here as on the
  // Day Clock and in Your day (Parry, 22 Oct); a tick is the same tick (tickTouch below).
  const callsKey = JSON.stringify(callsFromTouch(theDay.touch));
  const calls = useMemo(() => JSON.parse(callsKey) as Call[], [callsKey]);
  const [power, setPower] = useState<PowerSession | null>(null);
  useEffect(() => {
    try {
      setPower(readSession(JSON.parse(localStorage.getItem(powerKey(todayIn())) ?? "null"), todayIn()));
    } catch {}
  }, []);
  const session = withTicked(power ?? newSession(todayIn(), calls), calls);
  const savePower = (s: PowerSession) => {
    // what ONE MOVE shows ticked is not stored as a result here: unticking it elsewhere must stay possible
    const own = { ...s, results: Object.fromEntries(Object.entries(s.results).filter(([k, v]) => !(v === "sent" && calls.find((c) => c.id === k)?.done && power?.results[k] !== "sent"))) };
    setPower(own);
    try {
      localStorage.setItem(powerKey(s.date), JSON.stringify(own));
    } catch {}
  };
  useEffect(() => {
    powerRef.current = { calls, session: withTicked(power ?? newSession(todayIn(), calls), calls) };
    setGraph((g) => withPowerNode(g, calls, powerRef.current!.session));
  }, [calls, power]);
  // ONE MOVE's Power Hour (or its follow-up) open in the side panel, by block id (Parry, 22 Oct)
  const [touchOpen, setTouchOpen] = useState<string | null>(null);
  const touchShown = touchOpen ? theDay.touch.find((b) => b.id === touchOpen) ?? null : null;
  // One plan state (Parry, 16 Oct, Plan my day audit 3.1.3): the Plan my day orb and the ONE YOU card say the same thing.
  const thePlanState = planState({ approvedAt: theDay.approvedAt, sent: planned, blocks: theDay.plan.blocks.length, over: !!theDay.now && toMin(theDay.now) >= toMin(theDay.hours.end), off: theDay.dayOff });
  useEffect(() => {
    planStateRef.current = thePlanState;
    setGraph((g) => withPlanNode(g, plannedRef.current, thePlanState));
  }, [thePlanState]);
  const slots = useMemo(() => {
    if (theDay.plan.blocks.length) {
      const byRef = new Map<string, DayItem>((graph.today ?? []).map((d) => [d.ref ?? d.id.replace(/^day:/, ""), d]));
      const plannedBy = new Map((planned?.items ?? []).map((p) => [p.ref, p]));
      const out: Slot[] = [];
      for (const b of theDay.plan.blocks) {
        let t = toMin(b.start);
        // ONE MOVE's Power Hour and its follow-up: one row per person, ticked through ONE MOVE (Parry, 22 Oct)
        if (b.items) {
          const per = Math.max(1, Math.floor((toMin(b.end) - toMin(b.start)) / Math.max(1, b.items.length)));
          for (const i of b.items) {
            const d = byRef.get(i.ref);
            out.push({
              id: `day:${i.ref}`,
              ref: i.ref,
              nodeId: d?.nodeId && ix.byId.has(d.nodeId) ? d.nodeId : "go",
              product: d?.product ?? "go",
              kind: i.kind,
              what: `${i.what}: ${i.name}`,
              minutes: per,
              contactId: i.contactId ?? undefined,
              vip: true,
              start: toTime(t),
              end: toTime(t + per),
              done: i.done,
              touchBlock: b.id,
              touchTitle: b.title,
            });
            t += per;
          }
          continue;
        }
        for (const r of b.refs) {
          const d = byRef.get(r);
          const p = plannedBy.get(r);
          const minutes = d?.minutes ?? p?.minutes ?? Math.max(5, toMin(b.end) - toMin(b.start));
          out.push({
            id: `day:${r}`,
            nodeId: d?.nodeId && ix.byId.has(d.nodeId) ? d.nodeId : p?.nodeId && ix.byId.has(p.nodeId) ? p.nodeId : (d?.product ?? p?.product) === "go" || r.startsWith("blk:") ? "go" : "move",
            product: d?.product ?? p?.product ?? "go",
            kind: d?.kind ?? p?.kind ?? "other",
            what: d?.what ?? p?.title ?? b.title,
            minutes,
            start: toTime(t),
            end: toTime(t + minutes),
            done: dayDone.has(`day:${r}`) || !!p?.done,
          });
          t += minutes;
        }
      }
      return out;
    }
    if (!planned?.items.length) return planDay((graph.today ?? []).slice(0, 8), dayDone);
    return timed(planned.items, planned.start).map((p) => ({
      id: `day:${p.ref}`,
      nodeId: p.nodeId && ix.byId.has(p.nodeId) ? p.nodeId : p.product === "go" ? "go" : "move",
      product: p.product,
      kind: p.kind,
      what: p.title,
      minutes: p.minutes,
      start: p.start,
      end: p.end,
      done: p.done || dayDone.has(`day:${p.ref}`),
    }));
  }, [graph.today, dayDone, planned, ix, theDay.plan.blocks]);
  const day = useMemo(() => recap(slots), [slots]);
  const dayIds = useMemo(() => [...new Set(slots.map((x) => x.nodeId))], [slots]);
  const dayView = dayMap && !tour && !ask && !timeline;
  const sceneFocus = ask || tour || timeline || dayView || !ix.byId.has(state.focusId) ? graph.rootId : state.focusId;
  // Live signals: the latest arrival (a small card) and the numbers that just ticked.
  const [toast, setToast] = useState<Signal | null>(null);
  // Back from Google, Lofty or billing (ONE MOVE sends the agent here,
  // vip50-web-crm#49): open My Profile and say what happened, once.
  const [googleNote, setGoogleNote] = useState<{ ok: boolean; kicker: string; what: string } | null>(null);
  const [ticked, setTicked] = useState<Set<string>>(() => new Set());
  const askRef = useRef(ask);
  askRef.current = ask;

  // After a refresh the focused item may be gone (a follow-up just done): show
  // the nearest thing still there; the effect below moves the map to it.
  const focus =
    ix.byId.get(state.focusId) ??
    [...lastPath.current].reverse().map((id) => ix.byId.get(id)).find((n) => !!n) ??
    ix.byId.get(graph.rootId)!;
  if (focus.id === state.focusId) lastPath.current = pathTo(ix, focus.id).slice(0, -1).map((n) => n.id);
  const focusIdRef = useRef(focus.id);
  focusIdRef.current = focus.id;
  // The 90-Day Challenge orb opens its full page at once (Parry, 22 Oct: "yes on both"); back leaves the orb's panel.
  useEffect(() => {
    setChOpen(focus.id === CHALLENGE_NODE && !tour && !focus.locked);
  }, [focus.id, focus.locked, tour]);
  // The One Team orb open: every face shows, on two rings (lib/brain/layout.ts teamRings).
  const teamRings = focus.id === TEAM_HUB && !ask && !tour && !timeline && !dayView;
  const vs = useMemo(
    () =>
      tour
        ? answerSet(ix, tour.ids)
        : ask
          ? answerSet(ix, askIds)
          : timeline
            ? answerSet(ix, productIds)
            : dayView
              ? answerSet(ix, dayIds)
              : visibleSet(ix, focus.id, teamRings ? TEAM_HUB_BUDGET : phone ? PHONE_BUDGET : DESKTOP_BUDGET),
    [ix, focus.id, phone, ask, askIds, tour, timeline, productIds, dayView, dayIds, teamRings],
  );
  const placed = useMemo(() => layout(vs, teamRings ? { teamRings: true } : {}), [vs, teamRings]);
  // ONE MOVE focused: the rail is ONE MOVE's main menu, as in Classic (Parry, 3 Oct).
  // Its live items stay in the panel on the right.
  const moveMenu = focus.id === "move" && !focus.locked && !ask && !tour && !timeline && !dayView;
  // The rail: the focused node's children as floating buttons on the left.
  const railNodes = useMemo(
    () =>
      moveMenu || teamRings
        ? []
        : tour
        ? tour.ids.map((id) => ix.byId.get(id)!).filter(Boolean)
        : ask
          ? askIds.map((id) => ix.byId.get(id)!).filter(Boolean)
          : timeline
            ? datedIds.map((id) => ix.byId.get(id)!).filter(Boolean)
            : dayView
              ? dayIds.map((id) => ix.byId.get(id)!).filter(Boolean)
              : focus.id === "go"
                ? childrenOf(ix, focus.id) // ONE YOU: every tool in one look (Walker, 17 Oct)
                : childrenOf(ix, focus.id).slice(0, 9),
    [ix, focus.id, ask, askIds, tour, timeline, datedIds, dayView, dayIds, moveMenu, teamRings],
  );
  const railCount = railNodes.length;
  const railRefs = useRef(new Map<string, HTMLButtonElement>());
  const railLineRefs = useRef(new Map<string, SVGLineElement>());
  const [railHover, setRailHover] = useState<string | null>(null);

  // ---- scene lifecycle ----------------------------------------------------
  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY);
    const onMq = () => setPhone(mq.matches);
    onMq();
    mq.addEventListener("change", onMq);
    let dead = false;
    let scene: BrainScene | null = null;
    (async () => {
      const { BrainScene } = await import("./scene.ts");
      if (dead || !hostRef.current) return;
      scene = new BrainScene();
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      await scene.init(hostRef.current, reduced);
      if (dead) return scene.destroy();
      // The recorded tour plays the map ?slow=N times slower, then the video is sped back up (as the films do).
      const slow = productTour ? Number(new URLSearchParams(window.location.search).get("slow")) : 0;
      if (slow > 1) scene.timeScale = 1 / slow;
      sceneRef.current = scene;
      scene.onFrame = syncOverlay;
      setReady(true);
    })();
    return () => {
      dead = true;
      mq.removeEventListener("change", onMq);
      scene?.destroy();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The map's clear band in canvas pixels: below the Pulse bar, above the hint and the timeline (and on a phone the
  // button row under it). Measured, so a wrapped Now pill or a taller bar is allowed for (walker audit 02).
  const clearBand = useCallback((): { top: number; bottom: number } | null => {
    const host = hostRef.current;
    const wrap = host?.parentElement;
    if (!host || !wrap) return null;
    const h = host.getBoundingClientRect();
    const ask = wrap.querySelector(".ask-field")?.getBoundingClientRect();
    const lows = [".timeline", ".orb-hint", ...(phone ? [".map-ctrls"] : [])]
      .map((q) => wrap.querySelector(q)?.getBoundingClientRect())
      .filter((r): r is DOMRect => !!r && r.height > 0)
      .map((r) => r.top - h.top);
    const top = ask ? Math.max(0, ask.bottom - h.top) + 10 : 0;
    const bottom = (lows.length ? Math.min(...lows) : h.height) - 10;
    return bottom > top ? { top, bottom } : null;
  }, [phone]);

  // Point the camera at a world rectangle, leaving room for the card and rail.
  const frameOn = useCallback(
    (b: { minX: number; minY: number; maxX: number; maxY: number }, animate: boolean, keep = { top: 0, bottom: 0 }) => {
      const s = sceneRef.current;
      if (!s) return;
      const vp = s.viewport;
      if (phone) {
        // screen pixels kept clear above and below (the bar, the timeline)
        let c = fit(b, { width: vp.width, height: vp.height - keep.top - keep.bottom }, 12);
        // The Team orb's rings never shrink below a readable orb: the phone fits the focus and inner ring, and pans out.
        if (teamRings && c.scale < TEAM_PHONE_SCALE) c = { ...c, scale: TEAM_PHONE_SCALE };
        return s.setCamera({ ...c, y: c.y - (keep.top - keep.bottom) / 2 / c.scale }, animate);
      }
      // Desktop: the detail card floats on the right; fit the graph to the rest.
      const room = Math.min(CARD_ROOM, vp.width * 0.4);
      const rail = (railCount > 0 || moveMenu) && vp.width > 1100 ? RAIL_ROOM : 0;
      const c = fit(b, { width: vp.width - room - rail, height: vp.height }, 40);
      s.setCamera({ ...c, x: c.x + (room - rail) / 2 / c.scale }, animate);
    },
    [phone, railCount, moveMenu, teamRings],
  );
  const fitNow = useCallback(
    (animate: boolean) => {
      const b = bounds(teamRings && phone ? teamInner(placed) : placed, 20);
      if (phone) {
        // the Pulse bar; the hint, the timeline and the button row under it (measured when the page is laid out)
        const band = clearBand();
        const vh = sceneRef.current?.viewport.height ?? 0;
        return frameOn(b, animate, band && vh ? { top: band.top, bottom: Math.max(0, vh - band.bottom) } : { top: 84, bottom: 170 });
      }
      b.maxY += 90; // keep clear of the controls and the timeline
      b.minY -= 70; // and of the Ask ONE bar across the top
      frameOn(b, animate);
    },
    [placed, phone, teamRings, frameOn, clearBand],
  );

  // Refit only when what is on screen changes, not when a number ticks (the
  // agent may have panned).
  const framedKey = useRef("");
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    s.setScene(placed, ix.byId, vs.edges, sceneFocus);
    s.setNeeds(sceneNeeds);
    const key = `${sceneFocus}|${phone}|${placed.map((p) => `${p.id}:${p.role}`).join(",")}`;
    if (key === framedKey.current) return;
    framedKey.current = key;
    if (!tourRef.current) fitNow(true);
  }, [ready, placed, vs, ix, sceneFocus, fitNow, phone, sceneNeeds]);

  useEffect(() => {
    drawerRef.current?.scrollTo({ top: 0 });
  }, [state.focusId]);

  useEffect(() => {
    sceneRef.current?.setHighlight(highlight);
  }, [highlight, ready]);

  // ---- morning: fly-through on the first visit of the day, then ring the
  // products that changed since the last visit -----------------------------
  const topIds = useMemo(() => morningTop(ix), [ix]);
  const pingChanges = useCallback(
    (changes: ChangeNote[]) => {
      const ids = orbsToPing(changes, ix);
      setTimeout(() => sceneRef.current?.ping(ids), 900);
    },
    [ix],
  );
  const endTour = useCallback(() => {
    if (!tourRef.current) return;
    setTour(null);
    if (since) pingChanges(since.changes);
  }, [since, pingChanges]);
  const startTour = useCallback(() => {
    if (!topIds.length) return;
    setWhen(0);
    setAsk(null);
    setHighlight(null);
    setState((st) => (st.focusId === graph.rootId ? st : nav.reset(st, graph.rootId)));
    setTour({ ids: topIds, step: 0 });
  }, [topIds, graph.rootId]);

  useEffect(() => {
    if (!ready) return;
    // Arriving on a page (a link to /dashboard/team-leads) opens that page, never the morning fly-through over it; the
    // visit is not counted, so the fly-through still plays the next time the Brain itself is opened today.
    if (arrival) return;
    let prev: string | null = null;
    let anchor: string | null = null;
    const now = new Date();
    try {
      prev = localStorage.getItem("one.lastVisit");
      anchor = visitAnchor(prev, localStorage.getItem("one.visitFrom"), now);
      if (anchor) localStorage.setItem("one.visitFrom", anchor);
      localStorage.setItem("one.lastVisit", now.toISOString());
    } catch {}
    const changes = changesSince(graph.changes, anchor, ix);
    setSince({ label: sinceLabel(anchor, now), changes });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const forced = new URLSearchParams(window.location.search).get("tour") === "1";
    if (!reduced && (forced || firstVisitToday(prev, now)) && topIds.length) {
      setTimeout(() => setTour({ ids: topIds, step: 0 }), 700);
    } else {
      pingChanges(changes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  useEffect(() => {
    const beat = () => {
      try {
        if (document.visibilityState === "visible") localStorage.setItem("one.lastVisit", new Date().toISOString());
      } catch {}
    };
    const t = setInterval(beat, 60_000);
    document.addEventListener("visibilitychange", beat);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", beat);
    };
  }, []);

  // Each step: point the camera, hold, move on. Any input ends it (below).
  useEffect(() => {
    if (!tour || !sceneRef.current) return;
    const at = (id: string) => placed.find((p) => p.id === id);
    const hold = tour.step === 0 ? 1700 : 2800;
    if (tour.step === 0) {
      // ONE and today's three, all in view
      const b = bounds(placed, 20);
      b.minY -= phone ? 150 : 70; // the question bar, or the caption on a phone
      b.maxY += phone ? 70 : 170; // the controls, or the caption on desktop
      frameOn(b, true);
    } else {
      // In close on one item, with room for the caption (bottom on desktop, top on a phone)
      const p = at(tour.ids[tour.step - 1]);
      if (p)
        frameOn(
          phone
            ? { minX: p.x - p.r - 120, maxX: p.x + p.r + 120, minY: p.y - p.r - 230, maxY: p.y + p.r + 110 }
            : { minX: p.x - p.r - 170, maxX: p.x + p.r + 170, minY: p.y - p.r - 110, maxY: p.y + p.r + 300 },
          true,
        );
    }
    const t = setTimeout(() => {
      if (tour.step >= tour.ids.length) endTour();
      else setTour({ ...tour, step: tour.step + 1 });
    }, hold);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour, placed]);

  // Today's plan: this browser's copy, then ONE GO's (MASTER) when it answers.
  useEffect(() => {
    const date = todayIn();
    const known = (graph.today ?? []).map((d) => ({ ref: d.ref ?? d.id.replace(/^day:/, ""), nodeId: d.nodeId, urgency: d.urgency, special: d.special }));
    try {
      const p = readPlan(JSON.parse(localStorage.getItem(planKey(date)) ?? "null"), known);
      if (p && p.date === date) setPlanned(p);
    } catch {}
    if (!live) return;
    fetch(planUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const p = readPlan(j, known);
        if (p && p.date === date && p.sentAt) setPlanned(p);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  // Your day: remember what is done today (this browser), and whether it is evening.
  const dayKey = `one.day.${localDay(now)}`;
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(dayKey) ?? "[]");
      if (Array.isArray(saved)) setDayDone(new Set(saved.filter((x) => typeof x === "string")));
    } catch {}
    const q = new URLSearchParams(window.location.search).get("day");
    setEvening(q === "evening" || (q !== "morning" && isEvening(new Date())));
  }, [dayKey]);
  const setDone = useCallback(
    (ids: string[], on: boolean) =>
      setDayDone((cur) => {
        const next = new Set(cur);
        for (const id of ids) {
          if (on) next.add(id);
          else next.delete(id);
        }
        try {
          localStorage.setItem(dayKey, JSON.stringify([...next]));
        } catch {}
        return next;
      }),
    [dayKey],
  );

  // A tick on Your day: this browser, and the plan in MASTER when there is one (§3l.3: a check
  // mark only, no touch and no tracker box).
  const tickDay = (id: string, on: boolean) => {
    setDone([id], on);
    if (!planned) return;
    const ref = id.replace(/^day:/, "");
    setPlanned((p) => p && { ...p, items: p.items.map((i) => (i.ref === ref ? { ...i, done: on } : i)) });
    if (live)
      fetch(`${planUrl}/done`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ref, done: on }) }).catch(() => {});
  };

  // One touch of the Power Hour ticked (the panel or Your day): ONE MOVE completes it as its task list does and answers
  // the day; the boxes, the counts and the pulse follow at once (rule 12: "all checks need to apply once done").
  const tickTouch = async (item: TouchItem, on: boolean): Promise<string | null> => {
    setDone([`day:${item.ref}`], on);
    const err = await theDay.tickTouch(item, on);
    if (err) setDone([`day:${item.ref}`], !on);
    else if (live) void refreshLive();
    return err;
  };
  const touchItemOf = (blockId: string, ref: string) => theDay.touch.find((b) => b.id === blockId)?.items?.find((i) => i.ref === ref) ?? null;

  // The Day Clock (§3o.9): the day planned round the calendar. The Next line and the chimes follow it
  // while the dashboard is open (§3o.11).
  // One answer for "now" (walker 14 Oct, Parry approved): the pill and Your day read the same slid rows, inside the
  // agent's working hours; nothing is planned after the day ends.
  // One count for "moves to tomorrow" (Parry, 16 Oct, Plan my day audit 3.1.2): the ONE panel, the Now pill, Your day's
  // Tomorrow group and the Day Clock's list all read this one list (lib/dayView.ts withTomorrow).
  const slidRows = useMemo(() => slideSlots(slots, theDay.now, theDay.hours), [slots, theDay.now, theDay.hours]);
  const { rows: dayRows, tomorrow } = useMemo(() => withTomorrow(slidRows, theDay.plan.later, theDay.now, theDay.hours), [slidRows, theDay.plan.later, theDay.now, theDay.hours]);
  const dayGroups = useMemo(() => groupRows(dayRows), [dayRows]);
  const next = theDay.now ? (dayRows.length ? nowStrip(dayGroups, theDay.now, theDay.hours) : nextLine(theDay.plan.blocks, theDay.now)) : null;
  const dayOver = dayIsDone(theDay.now, theDay.hours, theDay.plan.blocks.filter((b) => !b.done && b.kind !== "custom").length, tomorrow.length, theDay.dayOff);
  // A day off or a day not begun has its own words, never "over" (walker, 17 Oct 07:40 MT, a Saturday).
  const dayBegins = dayStart({ date: theDay.date, now: theDay.now, hours: theDay.hours, dayOff: theDay.dayOff, week: theDay.week });
  // The pill opens Your day at the current block (not an empty Day Clock).
  const openYourDay = () => {
    goTo("one");
    setTimeout(() => document.querySelector(".day-group.is-now, .day-group")?.scrollIntoView({ behavior: "smooth", block: "center" }), 350);
  };
  const [doneAt, setDoneAt] = useState<Record<string, string>>({});
  const [ringing, setRinging] = useState(false);
  const rung = useRef<Set<string>>(new Set());
  useEffect(() => {
    try {
      rung.current = new Set(JSON.parse(sessionStorage.getItem("one.rung") ?? "[]"));
    } catch {}
    const unlock = () => unlockChime();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);
  useEffect(() => {
    if (!theDay.now) return;
    const due = dueChimes(theDay.plan.blocks, toMin(theDay.now), rung.current);
    if (!due.length) return;
    for (const d of due) rung.current.add(d.key);
    try {
      sessionStorage.setItem("one.rung", JSON.stringify([...rung.current]));
    } catch {}
    if (chimeOn()) playChime(false);
    const b = theDay.plan.blocks.find((x) => due[0].key.startsWith(`${x.id}:`));
    if (b) notify(due[0].kind === "soon" ? `${b.title} in 5 minutes.` : `Time for ${b.title}.`);
    setRinging(true);
    const t = setTimeout(() => setRinging(false), 8000);
    return () => clearTimeout(t);
  }, [theDay.now, theDay.plan.blocks]);

  // Timeline: ring each item as it comes into view while dragging.
  const shownOnTimeline = useRef(new Set<string>());
  useEffect(() => {
    const fresh = datedIds.filter((id) => !shownOnTimeline.current.has(id));
    shownOnTimeline.current = new Set(datedIds);
    if (fresh.length && timeline) setTimeout(() => sceneRef.current?.ping(fresh), 350);
  }, [datedIds, timeline]);

  // ---- live signals: something new arrives in a product --------------------
  // Demo: a timer plays the examples (?signals=fast for a quick look,
  // ?signals=off to stop them). Real: poll vip_summary and diff (lib/signals.ts).
  const sceneFocusRef = useRef(sceneFocus);
  sceneFocusRef.current = sceneFocus;
  const receive = useCallback(
    (sig: Signal) => {
      const scene = sceneRef.current;
      const path = pathTo(ix, sig.nodeId).map((n) => n.id);
      const visible = (id: string) => !!scene?.isVisible(id);
      const from = lightFrom(sig, path, visible);
      const to = visible("one") ? "one" : sceneFocusRef.current;
      const flying = !!(scene && from && scene.signal(from, to));
      setTimeout(() => {
        const at = new Date().toISOString();
        setGraph((g) => applySignal(g, sig, at));
        setSince((s) => (s ? { ...s, changes: [{ id: sig.nodeId, product: sig.product, what: sig.what, at }, ...s.changes] } : s));
        setToast(sig);
        const keys = new Set(sig.bumps.map((b) => `${b.nodeId}|${b.label ?? "sub"}`));
        setTicked(keys);
        setTimeout(() => setTicked((cur) => (cur === keys ? new Set() : cur)), 1800);
        const finished = completedBy(graph.today ?? [], sig.id);
        if (finished.length) setDone(finished, true);
      }, flying ? 1500 : 0);
    },
    [ix, graph.today, setDone],
  );
  useEffect(() => {
    if (!ready) return;
    const mode = new URLSearchParams(window.location.search).get("signals");
    // Real accounts: no example signals (polling vip_summary comes later).
    if (mode === "off" || live) return;
    const fast = mode === "fast";
    const queue = usable(DEMO_SIGNALS, indexGraph(initialGraph));
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const next = (ms: number) => {
      t = setTimeout(() => {
        if (i >= queue.length) return;
        // not while the morning plays, an answer is up, or the tab is hidden
        if (tourRef.current || askRef.current || whenRef.current || document.hidden) return next(3000);
        receiveRef.current(queue[i++]);
        next(fast ? 7000 : 40000);
      }, ms);
    };
    next(fast ? 2500 : 9000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  const receiveRef = useRef(receive);
  receiveRef.current = receive;
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 9000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const onResize = () => fitNow(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fitNow]);

  // Keep each real button exactly over its drawn node, every frame.
  function syncOverlay() {
    const s = sceneRef.current;
    if (!s) return;
    for (const [id, el] of btnRefs.current) {
      const p = s.screenOf(id);
      if (!p || p.a < 0.05) {
        el.style.visibility = "hidden";
        continue;
      }
      const size = Math.max(48, p.r * 2);
      el.style.visibility = "visible";
      el.style.width = el.style.height = `${size}px`;
      el.style.transform = `translate(${p.x - size / 2}px, ${p.y - size / 2}px)`;
    }
    // Things anchored to orbs (no hover card: Parry, 8 Oct, removed them): the focused orb's action
    // chips, and its WHY box. Placed in screen space every frame.
    const vp = s.viewport;
    // The side panel sits over the right of the map: cards stop at its left edge.
    const cardHost = chipsRef.current?.offsetParent as HTMLElement | null;
    const dr = drawerRef.current?.getBoundingClientRect();
    const hr = cardHost?.getBoundingClientRect();
    const right = dr && hr && dr.width > 0 && dr.left > hr.left ? Math.min(vp.width, dr.left - hr.left) : vp.width;
    const place = (el: HTMLElement | null, id: string | null, fn: (p: { x: number; y: number; r: number }, w: number, h: number) => [number, number]) => {
      if (!el) return;
      const p = id ? s.screenOf(id) : null;
      if (!p || p.a < 0.3) {
        el.style.visibility = "hidden";
        return;
      }
      const [x, y] = fn(p, el.offsetWidth, el.offsetHeight);
      el.style.visibility = "visible";
      el.style.transform = `translate(${Math.round(Math.min(Math.max(8, x), right - el.offsetWidth - 8))}px, ${Math.round(Math.min(Math.max(8, y), vp.height - el.offsetHeight - 8))}px)`;
    };
    place(chipsRef.current, stateRef.current, (p, w) => [p.x - w / 2, p.y + p.r + 14]);
    // Rail lines: from each floating button to its orb.
    const hostRect = hostRef.current?.getBoundingClientRect();
    for (const [id, line] of railLineRefs.current) {
      const btn = railRefs.current.get(id);
      const p = s.screenOf(id);
      if (!btn || !p || !hostRect || p.a < 0.2 || btn.offsetParent === null) {
        line.style.opacity = "0";
        continue;
      }
      const br = btn.getBoundingClientRect();
      const x1 = br.right - hostRect.left, y1 = br.top + br.height / 2 - hostRect.top;
      const dx = p.x - x1, dy = p.y - y1, len = Math.hypot(dx, dy) || 1;
      line.setAttribute("x1", String(x1));
      line.setAttribute("y1", String(y1));
      line.setAttribute("x2", String(p.x - (dx / len) * (p.r + 4)));
      line.setAttribute("y2", String(p.y - (dy / len) * (p.r + 4)));
      line.style.opacity = "1";
    }
    // Leader line from the selected node to the floating card (desktop).
    const line = leaderRef.current, card = drawerRef.current, host = hostRef.current;
    if (line && card && host) {
      const p = s.screenOf(stateRef.current);
      const hr = host.getBoundingClientRect(), cr = card.getBoundingClientRect();
      const floating = getComputedStyle(card).position === "absolute";
      if (!p || !floating || p.a < 0.3) {
        line.style.opacity = "0";
      } else {
        const x2 = cr.left - hr.left, y2 = Math.min(Math.max(p.y, cr.top - hr.top + 40), cr.bottom - hr.top - 40);
        line.setAttribute("x1", String(p.x + p.r + 6));
        line.setAttribute("y1", String(p.y));
        line.setAttribute("x2", String(x2));
        line.setAttribute("y2", String(y2));
        line.style.opacity = "1";
      }
    }
  }

  // ---- navigation ---------------------------------------------------------
  // A panel-first page (lib/outreach.ts PANEL_FIRST: the Outreach and Events orbs) opens on its side panel; its button
  // opens the page itself. Moving to any other orb closes it again.
  const [fullPage, setFullPage] = useState<string | null>(null);
  const goTo = useCallback((id: string) => {
    if (arrivalHold.current && arrivalHold.current.id !== id) arrivalHold.current = null; // the agent moved on
    setFullPage((p) => (p && movePageId(p) === id ? p : null));
    setHighlight(null);
    setAsk(null);
    setTour(null);
    setWhen(0);
    setDayMap(false);
    setState((s) => nav.go(s, id));
  }, []);
  const reviewAct = useCallback(
    (d: { kind: "page"; path: string } | { kind: "view"; view: "goals" | "commitments" | "wins" }) => {
      if (d.kind === "page") {
        setReviewOpen(false);
        goTo(movePageId(d.path));
      } else if (d.view === "goals") setGoalsOpen(true);
      else if (d.view === "commitments") setCmOpen(true);
      else setWinsOpen(true);
    },
    [goTo],
  );
  useEffect(() => {
    if (focus.id === state.focusId) return;
    const h = arrivalHold.current;
    if (h && h.id === state.focusId && Date.now() < h.until) {
      const t = setTimeout(() => setHoldTick((n) => n + 1), h.until - Date.now() + 50);
      return () => clearTimeout(t);
    }
    goTo(focus.id);
  }, [focus.id, state.focusId, goTo, holdTick]);
  // Getting started on the map (top of ONE YOU); from the menu it comes back and to the middle in the same render.
  useEffect(() => {
    startRef.current = start;
    startReopenRef.current = startReopen;
    setGraph((g) => withStartNode(g, start, startReopen));
    if (startPending.current && start) {
      startPending.current = false;
      goTo(START_NODE);
    }
  }, [start, startReopen, goTo]);
  useEffect(() => {
    teamSitesRef.current = teamSites.length;
    setGraph((g) => withTeamHub(g, hubNow()));
  }, [teamSites]);
  // "Go to" a person opens that person in Contacts (Parry, 6 Oct: "the go to that contact doesnt work
  // to take you to that contact"); anything else moves the map there.
  const [contactOpen, setContactOpen] = useState<{ id: string; k: number } | null>(null);
  // A name in the Referrals lists opens that person's record in ONE MOVE's Contacts, inside the Brain.
  const openReferralPerson = (id: string) => {
    const page = movePageId("/contacts");
    if (!ix.byId.has(page)) return;
    setRefsOpen(false);
    setContactOpen({ id, k: Date.now() });
    goTo(page);
  };
  const [pageQuery, setPageQuery] = useState<{ path: string; query: string } | null>(null);
  // A person from Pulse's lookups (not always on the map): their contact card in the Brain, never Classic.
  const openPerson = (contactId: string) => {
    const page = movePageId("/contacts");
    if (!ix.byId.has(page)) return;
    setAsk(null);
    setContactOpen({ id: contactId, k: Date.now() });
    goTo(page);
  };
  const goToNode = (id: string) => {
    const n = ix.byId.get(id);
    const page = movePageId("/contacts");
    if (n?.contactId && ix.byId.has(page)) {
      setContactOpen({ id: n.contactId, k: Date.now() });
      return goTo(page);
    }
    goTo(id);
  };

  // Live numbers (Parry, 4 Oct): re-read the agent's data every minute while
  // the Brain is open and visible, and on coming back to the tab, so a box
  // ticked in ONE GO or ONE MOVE shows here within a minute.
  useEffect(() => {
    if (!live) return;
    let last = Date.now();
    const refresh = () => {
      if (document.visibilityState !== "visible" || Date.now() - last < 15_000) return;
      last = Date.now();
      refreshLive();
    };
    const t = setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [live, refreshLive]);

  // Clear empties the box and the answer together (walker, 14 Oct).
  const clearAsk = useCallback(() => {
    setAsk(null);
    setAskErr(null);
    setAskText("");
  }, []);
  const goBack = useCallback(() => {
    setHighlight(null);
    if (ask) return clearAsk(); // back from an answer is the map you were on
    // One step up the path at the top (Parry, 4 Oct), from what is on screen.
    setState((s) => nav.up(s, pathTo(ix, focusIdRef.current)));
  }, [ask, clearAsk, ix]);
  const goHome = useCallback(() => {
    setHighlight(null);
    setAsk(null);
    setWhen(0);
    setDayMap(false);
    setState((s) => (s.focusId === graph.rootId ? s : nav.reset(s, graph.rootId)));
    fitNow(true);
  }, [graph.rootId, fitNow]);

  // A page's own address (/dashboard/profile), PROFILE.md §4's ?open=profile, or any ?open=<thing> (lib/deepLink.ts:
  // growth, growth:<piece>, getting-started, goals, deals, team, a product, a ONE MOVE group or page) opens it on arrival.
  // An orb that arrives a moment later (Team Leads and Team wait for the team answer, Getting started for its steps)
  // opens when it appears (Parry, 13 Oct: /dashboard/team-leads landed on the main dashboard); if it never comes, the
  // nearest orb opens with a plain line, never the bare map.
  const pendingArrival = useRef<Arrival | null>(arrival && arrival.kind !== "gbp" ? arrival : null);
  const [arrivalFinal, setArrivalFinal] = useState(false);
  useEffect(() => {
    const u = new URL(window.location.href);
    if (u.searchParams.has("open") || u.searchParams.has("contact")) {
      u.searchParams.delete("open");
      u.searchParams.delete("contact");
      window.history.replaceState(null, "", u.toString());
    }
    if (!pendingArrival.current) return;
    const t = setTimeout(() => setArrivalFinal(true), live ? 8000 : 2500);
    return () => clearTimeout(t);
    // once, on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const a = pendingArrival.current;
    if (!a) return;
    const l = landing(a, (id) => ix.byId.has(id), (id) => !!ix.byId.get(id)?.locked, arrivalFinal);
    if (!l) return;
    pendingArrival.current = null;
    if (l.exact) arrivalHold.current = { id: l.id, until: Date.now() + ARRIVAL_HOLD_MS };
    goTo(l.id);
    // an address names the page itself, so a panel-first page opens full
    if (l.exact && a.kind === "page") setFullPage(a.path);
    if (!l.exact && l.note) {
      setGoogleNote({ ok: false, kicker: a.label, what: l.note });
      setTimeout(() => setGoogleNote(null), 12000);
    }
  }, [ix, goTo, arrivalFinal]);

  useEffect(() => {
    const g = returnNote(window.location.search);
    if (!g) return;
    window.history.replaceState(null, "", pageAddress("/profile") + withoutNotes(window.location.href).replace(/^[^?#]*/, ""));
    setGoogleNote(g);
    goTo(movePageId("/profile"));
    const t = setTimeout(() => setGoogleNote(null), 12000);
    return () => clearTimeout(t);
    // once, on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const askOne = useCallback(
    async (q: string) => {
      const question = q.trim();
      if (!question || asking) return;
      // "Hey Pulse, I have a doctor's appointment 8 to 9... plan around that": the Day Clock takes it
      if (soundsLikeDay(question)) {
        setAskOpen(false);
        setTellText(question);
        setClockOpen(true);
        return;
      }
      // "Take me to the calendar": a place on the map opens straight away (lib/ask.ts navTargetOf)
      const place = navTargetOf(question, ix);
      if (place) {
        setAskOpen(false);
        setAsk(null);
        goToNode(place);
        return;
      }
      setTour(null);
      setWhen(0);
      setAskText(question);
      setAskOpen(false);
      setAsking(true);
      setAskErr(null);
      try {
        const r = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, package: pkg, demo: !live }),
        });
        const a = (await r.json()) as AskAnswer & { error?: string };
        if (!r.ok || a.error) throw new Error(a.error ?? "no answer");
        setHighlight(null);
                setAsk(a);
      } catch {
        setAskErr("ONE couldn't answer that just now. Try again.");
      } finally {
        setAsking(false);
      }
    },
    [asking, pkg, ix, goToNode],
  );
  // Zoom about the middle of the clear band, then keep the orbs clear of the Pulse bar (ONE YOU stays clickable).
  const zoom = (f: number) => {
    const s = sceneRef.current;
    if (!s) return;
    const band = clearBand();
    const c = band ? zoomAt(s.camera, s.viewport, f, s.viewport.width / 2, (band.top + band.bottom) / 2) : zoomAt(s.camera, s.viewport, f);
    s.setCamera(band ? keepInBand(c, s.viewport, placed.flatMap((p) => [p.y - p.r, p.y + p.r]), band.top, band.bottom) : c, true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (tourRef.current) {
        endTour();
        if (e.key === "Escape") return;
      }
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      if (e.key === "/") {
        e.preventDefault();
        askInputRef.current?.focus();
      } else if (e.key === "Escape" || e.key === "Backspace") {
        e.preventDefault();
        goBack();
      } else if (e.key === "+" || e.key === "=") zoom(1.25);
      else if (e.key === "-") zoom(0.8);
      else if (e.key === "0") goHome();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ---- gestures: drag to pan, wheel and pinch to zoom -------------------
  const onPointerDown = (e: React.PointerEvent) => {
    if (tourRef.current) endTour();
    const d = drag.current;
    d.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    d.down = true;
    d.moved = false;
    d.x = e.clientX;
    d.y = e.clientY;
    if (d.pointers.size === 2) {
      const [a, b] = [...d.pointers.values()];
      d.pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const s = sceneRef.current;
    if (!d.down || !s || !d.pointers.has(e.pointerId)) return;
    d.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (d.pointers.size === 2) {
      const [a, b] = [...d.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (d.pinch > 0) {
        const rect = hostRef.current!.getBoundingClientRect();
        s.setCamera(zoomAt(s.camera, s.viewport, dist / d.pinch, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top), false);
      }
      d.pinch = dist;
      d.moved = true;
      return;
    }
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    d.moved = true;
    s.setCamera(pan(s.camera, dx, dy), false);
    d.x = e.clientX;
    d.y = e.clientY;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    d.pointers.delete(e.pointerId);
    if (d.pointers.size === 0) d.down = false;
    d.pinch = 0;
  };
  const onWheel = (e: React.WheelEvent) => {
    if (tourRef.current) endTour();
    const s = sceneRef.current;
    if (!s) return;
    const rect = hostRef.current!.getBoundingClientRect();
    s.setCamera(zoomAt(s.camera, s.viewport, Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top), false);
  };
  // A row in a list opens its orb exactly as a tap on the orb does (audit stage 2: the "This week" row showed a panel
  // with no way to set commitments, while the orb opens Commitments).
  // The ONE MOVE open helper: a page inside the Brain, full window, even a panel-first one (lib/outreach.ts).
  const openMovePage = (path: string) => {
    setHrStart(null);
    setFullPage(path);
    goTo(movePageId(path));
  };
  // A row's own way in (rule 12, Parry 19 Oct): a ONE MOVE page inside the Brain; on the example agent, which has no such
  // page on its map, one line says what it opens when signed in.
  const goPage = (path: string, label?: string) => {
    if (ix.byId.has(movePageId(path))) return openMovePage(path);
    setSiteNote(`Example agent: signed in, this opens ${label ?? MOVE_MENU.find((m) => m.path === path)?.label ?? "that page"}.`);
  };
  // A number on an orb's panel opens what is behind it (lib/statOpen.ts); an orb not on the map, or no such page, opens nothing.
  const statOpens: Record<string, () => void> | undefined = (() => {
    const out: Record<string, () => void> = {};
    if (focus.id === "move" && life) out[DATES_STAT] = () => openOrb(LIFE_NODE);
    for (const st of focus.stats ?? []) {
      if (out[st.label]) continue;
      const g = statGo(focus.id, st.label);
      if (!g) continue;
      const orb = g.ids?.find((i) => ix.byId.has(i));
      if (orb) out[st.label] = () => openOrb(orb);
      else if (g.power) out[st.label] = () => setPowerOpen(true);
      else if (g.team && team) out[st.label] = () => setTeamOpen(true);
      else if (g.page) out[st.label] = () => goPage(g.page!);
    }
    return Object.keys(out).length ? out : undefined;
  })();
  // The Calendar, from the ONE YOU orb or the header button: ONE MOVE's Calendar inside the Brain.
  const openCalendar = () => {
    if (!live) return setSiteNote("Example agent: signed in, this opens your Calendar.");
    if (!ix.byId.has(movePageId("/calendar"))) return void window.open(moveMenuHref("/calendar"), "_blank", "noopener");
    setAsk(null);
    openMovePage("/calendar");
  };
  const openOrb = (id: string) => {
    drag.current.moved = false;
    clickNode(id);
  };
  const clickNode = (id: string) => {
    if (drag.current.moved) return; // that was a drag, not a tap
    // One of Pulse's people: open their card (it comes to the middle in Contacts), never a dead end on the map.
    if (ask && id.startsWith(ASK_PERSON)) return openPerson(id.slice(ASK_PERSON.length));
    if (ask) return id === graph.rootId ? goHome() : goTo(id);
    if (id === PLAN_NODE) return setClockOpen(true);
    if (id === CALENDAR_NODE) return openCalendar();
    if (id === WEEK_NODE) return setCmOpen(true);
    if (id === COACH_NODE) return setCoachOpen(true);
    if (id === REVIEW_NODE) return setReviewOpen(true);
    if (id === POWER_NODE) return setPowerOpen(true);
    if (id === REFERRALS_NODE) return setRefsOpen(true);
    if (id === HABITS_NODE) return openHabits();
    if (id === LIFE_NODE) return setLifeOpen(true);
    if (id === DEALS_NODE) return setDealsOpen("list");
    if (id === BROKER_NODE) return setBrokerOpen(true);
    if (id === LIKELY_NODE) return setLikelyOpen(true);
    // The Team orb's Leaderboard and War room come to the middle with their side panel (orbs hard rule); the full
    // screens open from the panel.
    if (id === REVIEW_CALLS_NODE) return setRcOpen(true);
    if (id === graph.rootId && state.focusId === graph.rootId && !tour) return setIntro(true); // Parry, 14 Oct: "centre orb opens meet pulse"
    if (id !== state.focusId) goTo(id);
  };

  // ---- Morning Pulse (Parry, 16 Oct 21:14 MT) ------------------------------------------------------------------------
  // About a minute over the live graph: ONE MOVE's GET /api/brain/morning (?evening=1 after 5 pm Denver) turned into beats
  // (lib/morningPulse.ts). The example agent gets invented people, labelled "Example". If the route fails, Pulse says less
  // from what the Brain already knows (today's plan, the top needs) and still ends on the plan.
  const mpStarting = useRef(false);
  const startMorningPulse = async () => {
    if (mpStarting.current) return;
    mpStarting.current = true;
    setTour(null);
    setAsk(null);
    setMpOffer(false);
    try {
      localStorage.setItem(MP_OFFER_KEY, localDay(new Date()));
    } catch {}
    const late = evening;
    let morning = null;
    let eveningAnswer = null;
    if (live) {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 8000);
      try {
        const r = await fetch(late ? mpEveningUrl : mpMorningUrl, { credentials: "include", cache: "no-store", signal: ctl.signal });
        const j = r.ok ? await r.json() : null;
        if (late) eveningAnswer = readMpEvening(j);
        else morning = readMpMorning(j);
      } catch {
        // the Brain's own knowledge below
      } finally {
        clearTimeout(t);
      }
    } else if (late) eveningAnswer = demoEvening();
    else morning = demoMorning();
    const beats = buildMorningPulse({
      firstName: agent.firstName,
      greeting: greeting(),
      evening: late,
      morning,
      eveningAnswer,
      known: {
        planCount: slots.length,
        needs: topIds.map((id) => ix.byId.get(id)).filter((n): n is NonNullable<typeof n> => !!n).map((n) => ({ label: n.label, why: factsFor(ix, n.id)[0] ?? n.secondaryLabel ?? null })),
      },
      approved: thePlanState === "approved",
      broker: brokerSummaryLine(broker),
    });
    mpStarting.current = false;
    setMp({ beats, example: !live });
  };
  // The camera follows Pulse: home for the openers and the plan, to the orb it names (which pulses) for each change.
  // Reduced motion: no flight and no pulse, the captions only.
  const mpBeat = (b: MpBeat, reduced: boolean) => {
    if (reduced) return;
    if (b.home) {
      if (state.focusId !== graph.rootId) goTo(graph.rootId);
      return;
    }
    const id = mpOrbFor(b.orb, (x) => ix.byId.has(x));
    if (!id) return;
    if (state.focusId !== id) goTo(id);
    setTimeout(() => sceneRef.current?.ping([id]), 900);
  };
  // A beat's button: call opens the person's card, deal the Deals orb, task the task (else the person).
  const mpTool = (t: MpTool) => {
    if (t.kind === "deal") {
      if (ix.byId.has(DEALS_NODE)) openOrb(DEALS_NODE);
      return;
    }
    const task = t.kind === "task" ? graph.nodes.find((n) => n.contactId === t.contactId && n.taskId) : null;
    if (task) return goTo(task.id);
    const person = graph.nodes.find((n) => n.contactId === t.contactId && n.type === "person");
    if (live && ix.byId.has(movePageId("/contacts"))) return openPerson(t.contactId);
    if (person) return goTo(person.id);
    // the example agent's people are on screen only: their lead orb
    const leads = mpOrbFor("leads", (x) => ix.byId.has(x));
    if (leads) goTo(leads);
  };
  const mpStartRef = useRef(startMorningPulse);
  mpStartRef.current = startMorningPulse;
  useEffect(() => {
    if (!ready) return;
    // Offered on the morning note once a day (this browser), until it has been played today.
    let seen: string | null = null;
    try {
      seen = localStorage.getItem(MP_OFFER_KEY);
    } catch {}
    setMpOffer(seen !== localDay(new Date()));
    // ?morningpulse=1 starts it (a link, or a screen check), after the morning fly-through would have begun.
    if (new URLSearchParams(window.location.search).get("morningpulse") === "1") setTimeout(() => void mpStartRef.current(), 1200);
  }, [ready]);

  // The Growth orb's pieces: one button each, to a real place. The example agent (demo, tour) gets a plain note for
  // anything that would reach a real site or ONE MOVE, never a call to them.
  const growthPiece = isGrowthChild(state.focusId) ? growthChildren(growthState).find((c) => c.id === state.focusId) ?? null : null;
  const runGrowth = (a: GrowthAction) => {
    const demoNote = live ? null : growthDemoNote(a);
    if (demoNote) return setSiteNote(demoNote);
    if (a.kind === "site") return void editSite(a.host, a.next);
    if (a.kind === "likely") return likely ? setLikelyOpen(true) : undefined;
    if (a.kind === "join") return void window.open(a.href, "_blank", "noopener");
    if (a.kind === "movePage") {
      const page = movePageId(a.path);
      return ix.byId.has(page) ? openMovePage(a.path) : void window.open(moveMenuHref(a.path), "_blank", "noopener");
    }
    // My Profile on that tab: the page reads the tab from the address when it opens.
    const page = movePageId("/profile");
    if (!ix.byId.has(page)) return window.location.assign(`${pageAddress("/profile")}#${a.tab}`);
    try {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${a.tab}`);
    } catch {}
    goTo(page);
  };

  // Getting started: each step's one button goes to the Brain's own place when it has one (My Profile and its Pulse
  // section, Goals, Plan my day, This week, the 90-Day Challenge), else to the route's link, a ONE MOVE page opening
  // inside the Brain when the Brain has it.
  const startPlaceOf = (step: StartStep) => placeFor(step, { goals: GOALS_NODE, plan: PLAN_NODE, week: WEEK_NODE, challenge: CHALLENGE_NODE });
  const openStartPlace = (place: StartPlace, step: StartStep) => {
    if (place.kind === "profile") {
      const page = movePageId("/profile");
      const hash = place.hash ? `#${place.hash}` : "";
      if (!ix.byId.has(page)) return window.location.assign(`${pageAddress("/profile")}${hash}`);
      try {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${hash}`);
      } catch {}
      return goTo(page);
    }
    if (place.kind === "orb" && ix.byId.has(place.id)) return openOrb(place.id);
    const url = place.kind === "url" ? place.url : step.url;
    if (!url) return;
    const path = movePathOf(url);
    if (path && ix.byId.has(movePageId(path))) return goTo(movePageId(path));
    window.open(url, "_blank", "noopener");
  };
  const reopenStart = () => {
    startPending.current = true;
    setStartReopen(true);
  };
  // Step 11: a tour film played to the end is recorded in MASTER by the Brain's server (app/api/start/film); quiet on
  // failure, and nothing is sent for the example agent.
  const markFilm = (film: "a" | "b") => {
    if (!live) return;
    fetch(filmUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ film }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.ok) loadStart();
      })
      .catch(() => {});
  };

  // ---- view ---------------------------------------------------------------
  const path = pathTo(ix, focus.id);
  // My Profile belongs to all of ONE, not ONE MOVE (walker 14 Oct, Parry approved): "ONE / My Profile".
  const crumbPath = focus.id === movePageId("/profile") && path.length > 2 ? [path[0], path[path.length - 1]] : path;
  const kids = childrenOf(ix, focus.id);
  // ONE YOU's tools in one list, grouped as the map is (Parry, 19 Oct): Today, This week, Goals and Coaching, each group's
  // tools under it, the same on a phone and on the desktop. A row opens its tool as tapping its orb does.
  const youRow = (k: GraphNode) => (
    <li key={k.id}>
      <button onClick={() => openOrb(k.id)}>
        <i style={{ background: hex(PRODUCT_COLOR[k.product]) }} />
        <span>
          <b>{k.label}</b>
          {k.locked ? <small>{lockedLine(k)}</small> : k.secondaryLabel && <small>{k.secondaryLabel}</small>}
        </span>
        <RowMark n={k} need={needs.get(k.id)} />
      </button>
    </li>
  );
  const youTools =
    focus.id === "go" ? (
      <>
        {kids.filter((k) => !isYouGroup(k.id)).length > 0 && <ul>{kids.filter((k) => !isYouGroup(k.id)).map(youRow)}</ul>}
        {kids.filter((k) => isYouGroup(k.id)).map((grp) => (
          <div key={grp.id} className="you-group">
            <ul>{youRow(grp)}</ul>
            <ul className="you-group-kids" aria-label={grp.label}>{childrenOf(ix, grp.id).map(youRow)}</ul>
          </div>
        ))}
      </>
    ) : null;
  const related = (ix.links.get(focus.id) ?? [])
    .map((e) => ix.byId.get(e.source === focus.id ? e.target : e.source))
    .filter((n): n is GraphNode => !!n);
  const productHref = PRODUCT_HREF[focus.product];
  // Actions that live on the focused orb itself (and in the card as well).
  const orbActions: { label: string; run?: () => void; href?: string; primary?: boolean; pressed?: boolean }[] = [];
  // Inside ONE MOVE (Parry, 3 Oct): no buttons on the orb; everything about it,
  // and what to do, sits in the panel on the right.
  // No "Open ONE MOVE" anywhere, the ONE MOVE orb included (Parry, 3 Oct: "get
  // rid of them everywhere"); its pages open inside the Brain.
  const moveQuiet = focus.product === "move";
  if (ask || moveQuiet) {
    // The answer panel carries the actions while ONE is answering.
  }
  // No "Why?" or "Show me" (Parry, 6 Oct: "they really dont show you anything... the why button just
  // repeats what it says above").
  // No "Open in ONE GO" either (Parry, 20 Oct: "remove the open in go button"): ONE GO is the phone app, and an orb
  // with a person behind it opens their full card in the panel.
  const goQuiet = focus.product === "go";
  if (!ask && !moveQuiet && !goQuiet && focus.href && !focus.locked) orbActions.push({ label: `Open in ${productName(focus.product)} ↗`, href: productLink(focus.href) });
  else if (!ask && !moveQuiet && !goQuiet && productHref && focus.type !== "core" && !focus.locked && !isMoveGroup(focus.id)) orbActions.push({ label: `Open ${productName(focus.product)} ↗`, href: productHref });
  if (!ask && focus.locked) orbActions.push(focus.id === GROWTH_NODE ? { label: GROWTH_JOIN_BUTTON.label, href: GROWTH_JOIN_BUTTON.action.kind === "join" ? GROWTH_JOIN_BUTTON.action.href : UPGRADE_URL } : { label: "Add with Complete", href: UPGRADE_URL });
  const again = !ask && !focus.locked ? hostAgainHref(focus.id) : undefined;
  if (again) orbActions.push({ label: "Host it again ↗", href: again });

  // ONE MOVE's menu in the rail: one link per page, groups as drop-downs.
  const moveLink = (m: MovePage) => {
    // Opportunities, Life Events and Deals open their native orb (lib/moveMenu.ts MENU_ORB), with the orb's own dot.
    const orb = MENU_ORB[m.path];
    const orbNode = orb ? ix.byId.get(orb) : undefined;
    const inner = (
      <>
        <span className="rail-icon" style={{ color: hex(PRODUCT_COLOR.move) }}>
          <Icon kind={m.path === "/dashboard" ? "move" : iconForText(m.label)} size={16} />
        </span>
        <span className="rail-text">
          <span>{m.label}</span>
        </span>
        {orbNode?.status && orbNode.status !== "healthy" && <i className="rail-dot" style={{ background: hex(STATUS[orbNode.status].color) }} aria-label={STATUS[orbNode.status].label} />}
      </>
    );
    return (
      <li key={m.path}>
        {orb ? (
          orbNode ? (
            <button className="rail-btn rail-link" onClick={() => openOrb(orb)}>{inner}</button>
          ) : (
            <a className="rail-btn rail-link" href={moveMenuHref(m.path)}>{inner}</a>
          )
        ) : IN_BRAIN.has(m.path) ? (
          <button className="rail-btn rail-link" onClick={() => goTo(menuTarget(m.path, (id) => ix.byId.has(id)))}>{inner}</button>
        ) : (
          <a className="rail-btn rail-link" href={moveMenuHref(m.path)}>{inner}</a>
        )}
      </li>
    );
  };
  // A ONE MOVE page that opens inside the Brain (lib/moveMenu.ts IN_BRAIN).
  // the example agent's New to Sort orb (lib/graph/move.ts) opens the same native view as the live one
  const rawPage = !ask && !tour ? inBrainPage(state.focusId) ?? (state.focusId === DEMO_NTS_NODE ? { label: "New to Sort", path: NTS_PATH } : null) : null;
  // The example agent's Drop-By Map, Referral Network... open on their side panel (lib/examples/move2.ts), not a sign-in page.
  const pagePanel = rawPage && !(!live && M2_PATHS.has(rawPage.path)) && (!(PANEL_FIRST.has(rawPage.path) || LEARN_PANEL_FIRST.has(rawPage.path)) || fullPage === rawPage.path) ? rawPage : null;
  // A page opened for one person (the person panel's Refer / Post a need): its query rides on the frame's address.
  // Each opening starts behind the veil again, even for the same page.
  const panelPath = pagePanel?.path ?? null;
  useEffect(() => {
    setFrameReady(null);
    setVipClassic(false);
    setPageQuery((q) => (q && q.path === panelPath ? q : null));
  }, [panelPath]);
  // The address follows the open page: /dashboard/profile, /dashboard/weekly...
  const arrived = useRef(false);
  useEffect(() => {
    if (!arrived.current) {
      // let the arrival effects open the page the address names first
      arrived.current = true;
      if (!panelPath && (arrival || pageFromAddress(window.location.pathname))) return;
    }
    const want = pageAddress(panelPath);
    if (window.location.pathname !== want) window.history.replaceState(null, "", want + window.location.search + window.location.hash);
    // Land where they last were (audit stage 1, 14 Oct): the next sign-in comes back to this page.
    if (live) document.cookie = `${LAST_COOKIE}=${encodeURIComponent(want)}; path=/; max-age=${LAST_MAX_AGE}; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
  }, [panelPath, live]);
  // ONE MOVE pages drawn natively: VIP Management (the VIP rings, §3d) and the
  // Daily Tracker (§3e). The Classic page stays one click away, and is the
  // fallback until ONE MOVE's route answers.
  // Home Reports (HOME-REPORT §5.4, 16 Oct): this month's reports and the bulk start, from ONE MOVE's routes.
  // Your listings (Parry, 18 Oct: "we have pics and whatnot"): the agent's listings as photo cards (components/brain/ListingCards.tsx).
  const NATIVE: Record<string, "vip" | "daily" | "weekly" | "audit" | "rolodex" | "profile" | "hwc" | "contacts" | "homereports" | "nts" | "listings"> = { "/listings": "listings", "/contacts/visitors": "nts", "/contacts": "contacts", "/contacts/vip": "vip", "/daily": "daily", "/weekly": "weekly", "/contacts/audit": "audit", "/rolodex": "rolodex", "/profile": "profile", "/hot-warm-cold": "hwc", "/home-reports": "homereports" };
  const [vipClassic, setVipClassic] = useState(false);
  const nativeKind = panelPath ? NATIVE[panelPath] : undefined;
  const vipNative = !!nativeKind && !vipClassic;
  const vipUnavailable = useCallback(() => setVipClassic(true), []);
  const toggleGroup = (key: string) =>
    setOpenGroups((gs) => {
      const next = gs.includes(key) ? gs.filter((k) => k !== key) : [...gs, key];
      try {
        localStorage.setItem("one.moveMenu.open", JSON.stringify(next));
      } catch {}
      return next;
    });

  // VIP-SUMMARY §3b: Accept or Dismiss a suggestion here, with the agent's own
  // sign-in. Then the Brain steps back up and reloads the summary.
  const decide = async (n: GraphNode, accept: boolean) => {
    if (!n.decide) return;
    setDeciding(true);
    setDecideErr(null);
    try {
      const r = await fetch("/api/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.decide.id, accept, gci: accept && n.decide.askGci && gci ? gci : null }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Something went wrong.");
      const msg = j.status === "accepted" ? `Done: ${n.decide.acceptLabel.toLowerCase()}.` : j.status === "dismissed" ? "Dismissed." : "Already decided.";
      setDecided((d) => ({ ...d, [n.id]: msg }));
      setGci("");
      setTimeout(() => {
        const up = n.parentId ? ix.byId.get(n.parentId)?.parentId ?? n.parentId : n.product;
        goTo(up ?? n.product);
        refreshLive();
      }, 1200);
    } catch (e) {
      setDecideErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setDeciding(false);
    }
  };

  // Delete a person from their orb's card (walker 2026-10-17-0042): off the map at once, "Deleted Rosa. Undo" for 6
  // seconds, then ONE MOVE's route; Undo or a refusal puts them back. The example agent's saves nothing.
  const heldDel = useHeldDelete({ demo: !live });
  const deleteOrb = (n: GraphNode) => {
    const cid = n.contactId;
    const match = (x: GraphNode) => (cid ? x.contactId === cid : x.id === n.id);
    const { removed } = dropPeople(graph, match);
    goTo(n.parentId ?? graph.rootId);
    setGraph((g) => dropPeople(g, match).graph);
    heldDel.start({
      ids: [cid ?? n.id],
      first: firstOf(cleanName(n.label)),
      restore: () => {
        setGraph((g) => putBack(g, removed));
        refreshLive();
      },
      onDone: refreshLive,
    });
  };

  const orderedForTab = [...vs.nodes].sort((a, b) => roleRank(a.role) - roleRank(b.role) || a.order - b.order);

  return (
    <div className={`brain ${tour ? "touring" : ""}`}>
      {heldDel.toast}
      <header className="bar">
        <button className="brand brand-logo" onClick={goHome} aria-label="VIP-50 ONE, home">
          <img src="/brand/vip50-one.webp" alt="VIP-50 ONE" width={70} height={48} />
        </button>
        <nav className="crumbs" aria-label="Where you are">
          {crumbPath.map((n, i) => (
            <span key={n.id}>
              {i > 0 && <span className="sep">/</span>}
              {i === crumbPath.length - 1 ? (
                <span aria-current="page">{n.label}</span>
              ) : (
                <button onClick={() => goTo(n.id)}>{n.label}</button>
              )}
            </span>
          ))}
        </nav>
        {next && (
          <button className={`next-pill${ringing ? " ringing" : ""}`} onClick={openYourDay} title="Your day" aria-live="polite">
            {next}
          </button>
        )}
        <button className="cal-btn" onClick={openCalendar} title="Your calendar" aria-label="Open your calendar">
          Calendar
        </button>
        {live && (
          <nav className="dash-switch" aria-label="Dashboard version">
            <span aria-current="page">ONE Brain</span>
            <a href={CLASSIC_DASHBOARD_URL}>Classic</a>
          </nav>
        )}
        {live || productTour ? (
          <form className="me-form" method="post" action="/auth/signout">
            <button type="button" className="me me-btn" onClick={() => goTo(movePageId("/profile"))} title="My Profile" aria-label={`My Profile, ${agent.label}`}>
              {agent.photo ? <img className="me-pic" src={agent.photo} alt="" /> : agent.initials}
            </button>
            {/* Every website, team, ad and sign-out link lives in the menu by the photo (lib/phoneMenu.ts), never loose in
                the header (Parry, 15 Oct). Team rows show only to the team's owner and admins (lib/siteEdit.ts). */}
            <button type="button" className="me-menu" onClick={() => setMenuOpen(true)} aria-haspopup="dialog" aria-expanded={menuOpen} aria-label={`Menu, ${agent.label}`}>
              {agent.photo ? <img className="me-pic" src={agent.photo} alt="" /> : <span className="me-ini">{agent.initials}</span>}
              <span className="me-burger" aria-hidden="true">☰</span>
            </button>
          </form>
        ) : (
          <span className="me" aria-label={agent.label}>{agent.initials}</span>
        )}
      </header>
    {menuOpen && (
      <div className="pmenu-back" onClick={() => setMenuOpen(false)}>
        <div className="pmenu pop" role="dialog" aria-modal="true" aria-label="Menu" onClick={(e) => e.stopPropagation()}>
          <div className="pmenu-head">
            <b>
              {agent.name ?? agent.label}
              {agent.plan ? <small className="pmenu-plan">{agent.plan}</small> : null}
            </b>
            <button type="button" className="pmenu-x" onClick={() => setMenuOpen(false)} aria-label="Close">×</button>
          </div>
          <ul>
            {menuRows({ live: live || productTour, start: start && start.folded && !startReopen ? startMenuLine(start) : null, growth: agent.growth === true, siteHost: productTour ? "sarah-bennett.vip50homes.com" : siteHost, teamHosts: productTour ? ["summit-home.vip50homes.com"] : teamSites.map((t) => t.host), agentTeamHrefs: productTour ? [] : agentSites.map((t) => siteOpenHref(t.slug)), classicUrl: CLASSIC_DASHBOARD_URL, products: childrenOf(ix, graph.rootId).filter((k) => k.type === "product").map((k) => ({ id: k.id, label: k.label, line: k.locked ? lockedLine(k) : k.secondaryLabel ?? "Open it on the map.", locked: k.locked })) }).map((r: MenuRow, i: number, all: MenuRow[]) => (
              <li key={r.key}>
                {r.key.startsWith("product:") && !all[i - 1]?.key.startsWith("product:") ? <p className="pmenu-sec">Products</p> : null}
                {r.action.kind === "signout" ? (
                  <form method="post" action="/auth/signout">
                    <button type="submit" className="pmenu-row">
                      <b>{r.label}</b>
                      <small>{r.line}</small>
                    </button>
                  </form>
                ) : r.action.kind === "href" ? (
                  <a className="pmenu-row" href={r.action.href}>
                    <b>{r.label}</b>
                    <small>{r.line}</small>
                  </a>
                ) : (
                  <button
                    type="button"
                    className="pmenu-row"
                    onClick={() => {
                      const a = r.action;
                      setMenuOpen(false);
                      if (a.kind === "profile") goTo(movePageId("/profile"));
                      else if (a.kind === "gbp") openGbp();
                      else if (a.kind === "start") reopenStart();
                      else if (a.kind === "help") setGuide(true);
                      else if (a.kind === "goTour") setGoTour(true);
                      else if (a.kind === "oneTour") setOneTour(true);
                      else if (a.kind === "websiteFilm") setWebFilm(true);
                      else if (a.kind === "billing") void openBilling();
                      else if (a.kind === "addons") setAddonsOpen(true);
                      else if (a.kind === "site") void editSite(a.host, a.next);
                      else if (a.kind === "orb") openOrb(a.id);
                    }}
                  >
                    <b>{r.label}</b>
                    <small>{r.line}</small>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    )}
      {siteNote && (
        <div className="vr-bar pop" role="status">
          <span>{siteNote}</span>
          <button className="chip-btn" onClick={() => setSiteNote(null)}>OK</button>
        </div>
      )}

      <div className="stage">
        <section className="canvas-wrap" aria-label="ONE Brain map">
          <div
            ref={hostRef}
            className="canvas"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
          >
            <svg className="leader" aria-hidden="true">
              <line ref={leaderRef} />
              {railNodes.map((k) => (
                <line
                  key={k.id}
                  className={`rail-line ${railHover === k.id ? "lit" : ""}`}
                  style={{ stroke: hex(PRODUCT_COLOR[k.product]) }}
                  ref={(el) => {
                    if (el) railLineRefs.current.set(k.id, el);
                    else railLineRefs.current.delete(k.id);
                  }}
                />
              ))}
            </svg>
            <div className="overlay">
              {orderedForTab.map((v) => (
                <button
                  key={v.node.id}
                  ref={(el) => {
                    if (el) btnRefs.current.set(v.node.id, el);
                    else btnRefs.current.delete(v.node.id);
                  }}
                  className={`node-btn ${v.role === "focus" ? "is-focus" : ""}`}
                  style={{ visibility: "hidden" }}
                  aria-label={nodeLabel(v.node, v.role, v.hasChildren, needs.get(v.node.id))}
                  aria-current={v.role === "focus" ? "true" : undefined}
                  onClick={() => clickNode(v.node.id)}
                  onPointerEnter={() => sceneRef.current?.setHover(v.node.id)}
                  onPointerLeave={() => sceneRef.current?.setHover(null)}
                  onFocus={() => sceneRef.current?.setHover(v.node.id)}
                  onBlur={() => sceneRef.current?.setHover(null)}
                />
              ))}
            </div>

            {ready && (orbActions.length > 0) && (
              <div ref={chipsRef} key={`chips-${state.focusId}`} className="chips pop" role="group" aria-label={`${focus.label} actions`} style={{ visibility: "hidden" }}>
                {orbActions.map((a) =>
                  a.href ? (
                    <a key={a.label} className="chip-btn" href={a.href} target="_blank" rel="noreferrer">
                      {a.label}
                    </a>
                  ) : (
                    <button key={a.label} className={`chip-btn ${a.primary ? "primary" : ""}`} aria-pressed={a.pressed} onClick={a.run}>
                      {a.label}
                    </button>
                  ),
                )}
              </div>
            )}

            {!ready && <div className="loading">Waking ONE…</div>}
          </div>
          {moveMenu && (
            <nav className="rail rail-menu pop" key="rail-move-menu" aria-label="ONE MOVE menu">
              <p className="rail-head">ONE MOVE</p>
              <p className="rail-sub">Main menu</p>
              <ul>
                {MOVE_TOP.map(moveLink)}
                {/* Opportunities (Parry, 17 Oct): the orb on the ring that holds New leads, New to Sort, Looks Hot
                    and Likely to move; its row opens the orb (it comes to the middle with the four round it). */}
                {ix.byId.has(OPP_NODE) ? (() => {
                  const on = ix.byId.get(OPP_NODE)!;
                  return (
                    <li key="opportunities">
                      <button className="rail-btn rail-link" onClick={() => goTo(OPP_NODE)}>
                        <span className="rail-icon" style={{ color: hex(PRODUCT_COLOR.move) }}>
                          <Icon kind={iconForText(OPP_LABEL)} size={16} />
                        </span>
                        <span className="rail-text">
                          <span>{OPP_LABEL}</span>
                          {on.secondaryLabel && <small>{on.secondaryLabel}</small>}
                        </span>
                        {on.status && on.status !== "healthy" && <i className="rail-dot" style={{ background: hex(STATUS[on.status].color) }} aria-label={STATUS[on.status].label} />}
                      </button>
                    </li>
                  );
                })() : null}
                {moveGroupsFor(admin).map((g) => {
                  const gn = ix.byId.get(moveGroupId(g.key));
                  const open = openGroups.includes(g.key);
                  return (
                    <li key={g.key} className={`rail-group ${open ? "open" : ""}`}>
                      {/* A group head opens its group (walker 18 Oct): the orb comes to the middle with its panel; the caret
                          only folds the list. */}
                      <button
                        className="rail-btn rail-group-btn"
                        aria-expanded={open}
                        onClick={() => {
                          if (!gn) return toggleGroup(g.key);
                          if (!open) toggleGroup(g.key);
                          goTo(gn.id);
                        }}
                      >
                        <span className="rail-text">
                          <span>{g.label}</span>
                          {gn?.status && gn.secondaryLabel && <small>{gn.secondaryLabel}</small>}
                        </span>
                        {gn && <RowMark n={gn} need={needs.get(gn.id)} />}
                        <span
                          className="rail-caret"
                          aria-hidden
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleGroup(g.key);
                          }}
                        >
                          {open ? "▾" : "▸"}
                        </span>
                      </button>
                      {open && (
                        <ul className="rail-sublist">
                          {/* Follow-ups under People (Parry, 16 Oct): no ONE MOVE page of its own yet, so the row opens the orb */}
                          {g.key === "people" && (ix.byId.has(FOLLOW_NODE) || ix.byId.has(DEMO_FOLLOW_NODE)) ? (
                            <li key="follow-ups">
                              <button className="rail-btn rail-link" onClick={() => goTo(ix.byId.has(FOLLOW_NODE) ? FOLLOW_NODE : DEMO_FOLLOW_NODE)}>
                                <span className="rail-icon" style={{ color: hex(PRODUCT_COLOR.move) }}>
                                  <Icon kind={iconForText("Follow-ups")} size={16} />
                                </span>
                                <span className="rail-text">
                                  <span>Follow-ups</span>
                                </span>
                              </button>
                            </li>
                          ) : null}
                          {g.pages.map(moveLink)}
                          {/* Opportunities' other three parts (Parry, 17 Oct: the People menu keeps a link to each) */}
                          {g.key === "people"
                            ? PEOPLE_MENU_PARTS.filter((pt) => ix.byId.has(pt.id)).map((pt) => (
                                <li key={pt.id}>
                                  <button className="rail-btn rail-link" onClick={() => openOrb(pt.id)}>
                                    <span className="rail-icon" style={{ color: hex(PRODUCT_COLOR.move) }}>
                                      <Icon kind={iconForText(pt.label)} size={16} />
                                    </span>
                                    <span className="rail-text">
                                      <span>{pt.label}</span>
                                    </span>
                                  </button>
                                </li>
                              ))
                            : null}
                        </ul>
                      )}
                    </li>
                  );
                })}
                {MOVE_BOTTOM.map(moveLink)}
              </ul>
            </nav>
          )}
          {railCount > 0 && (
            <nav className={`rail pop${railCount > 9 ? " rail-full" : ""}`} key={`rail-${ask ? `ask-${ask.question}` : state.focusId}`} aria-label={ask ? "Pulse's answer" : `Inside ${focus.label}`}>
              <p className="rail-head">{tour ? "Today's three" : ask ? "Pulse" : focus.type === "core" ? "Your business" : focus.label}</p>
              {!ask && !tour && focus.type !== "core" && focus.secondaryLabel && <p className="rail-sub">{focus.secondaryLabel}</p>}
              <ul>
                {railNodes.map((k) => (
                  <li key={k.id}>
                    <button
                      ref={(el) => {
                        if (el) railRefs.current.set(k.id, el);
                        else railRefs.current.delete(k.id);
                      }}
                      className={`rail-btn ${railHover === k.id || highlight?.includes(k.id) || (tour && tour.ids[tour.step - 1] === k.id) ? "on" : ""} ${k.locked ? "locked" : ""}`}
                      onClick={() => goTo(k.id)}
                      onPointerEnter={() => {
                        setRailHover(k.id);
                        sceneRef.current?.setHover(k.id);
                      }}
                      onPointerLeave={() => {
                        setRailHover(null);
                        sceneRef.current?.setHover(null);
                      }}
                      onFocus={() => {
                        setRailHover(k.id);
                        sceneRef.current?.setHover(k.id);
                      }}
                      onBlur={() => {
                        setRailHover(null);
                        sceneRef.current?.setHover(null);
                      }}
                    >
                      <span className="rail-icon" style={{ color: hex(PRODUCT_COLOR[k.product]) }}>
                        {k.image && !k.locked ? <img className="rail-pic" src={k.image} alt="" /> : k.type === "person" ? <b>{initialsOf(k.label)}</b> : <Icon kind={iconFor(k)} size={18} />}
                      </span>
                      <span className="rail-text">
                        <span>{k.label}</span>
                        {k.locked ? <small>{lockedLine(k)}</small> : k.secondaryLabel && <small>{k.secondaryLabel}</small>}
                      </span>
                      <RowMark n={k} need={needs.get(k.id)} />
                    </button>
                  </li>
                ))}
              </ul>
              {!ask && !tour && childrenOf(ix, focus.id).length > railCount ? (
                <p className="rail-more">+{childrenOf(ix, focus.id).length - railCount} more in the panel</p>
              ) : null}
            </nav>
          )}

          <form
            className={`ask ${askOpen ? "open" : ""}`}
            role="search"
            aria-label="Ask Pulse"
            onSubmit={(e) => {
              e.preventDefault();
              askOne(askText);
            }}
          >
            <div className="ask-field">
              <PulseMark beating={asking} />
              <input
                ref={askInputRef}
                value={askText}
                onChange={(e) => setAskText(e.target.value)}
                onFocus={() => setAskOpen(true)}
                onBlur={() => setTimeout(() => setAskOpen(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setAskOpen(false);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                placeholder="Ask Pulse about your business…"
                aria-label="Ask Pulse a question about your business"
                maxLength={300}
                enterKeyHint="search"
              />
              {(ask || askText) && !asking ? (
                <button type="button" className="ask-go ghost" onClick={clearAsk} aria-label="Clear the question and the answer">
                  ✕
                </button>
              ) : null}
              {ask && !asking ? null : (
                <button type="submit" className="ask-go" disabled={asking || !askText.trim()} aria-busy={asking}>
                  {asking ? "…" : "Ask"}
                </button>
              )}
            </div>
            {askOpen && (
              <ul className="ask-sugs pop" aria-label="Suggested questions">
                {(live ? LIVE_SUGGESTED : SUGGESTED).map((q) => (
                  <li key={q}>
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => askOne(q)}>
                      {q}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {asking && <p className="ask-status" role="status">Pulse is thinking…</p>}
            {askErr && <p className="ask-status err" role="alert">{askErr}</p>}
          </form>

          {tour && (() => {
            const id = tour.step > 0 ? tour.ids[tour.step - 1] : null;
            const n = id ? ix.byId.get(id) : null;
            return (
              <div className="tour-card pop" key={`tour-${tour.step}`} role="status" aria-live="polite">
                <p className="tour-kicker">
                  Today's three{n ? ` · ${tour.step} of ${tour.ids.length}` : ""}
                </p>
                {n ? (
                  <>
                    <p className="tour-title" style={{ color: hex(PRODUCT_COLOR[n.product]) }}>{n.label}</p>
                    {n.secondaryLabel && <p className="tour-sub">{n.secondaryLabel}</p>}
                    {factsFor(ix, n.id)[0] && <p className="tour-why">{factsFor(ix, n.id)[0]}</p>}
                  </>
                ) : (
                  <>
                    <p className="tour-title">{hello} Here are your three for today.</p>
                    {/* The morning's offer (once a day: this fly-through plays on the first visit of the day). */}
                    <button type="button" className="ln-btn" onClick={() => void startMorningPulse()}>
                      <span aria-hidden="true">▶</span> Play Morning Pulse
                    </button>
                  </>
                )}
                <button className="tour-skip" onClick={endTour}>
                  {tour.step >= tour.ids.length ? "Done" : "Skip"}
                </button>
              </div>
            );
          })()}

          {!tour && (
            <div className={`timeline${when ? " on" : ""}`}>
              <span className="tl-end">Past</span>
              <div className="tl-track">
                <input
                  type="range"
                  min={-RANGE}
                  max={RANGE}
                  step={1}
                  value={when}
                  aria-label="Timeline"
                  aria-valuetext={offsetLabel(when)}
                  onChange={(e) => {
                    setAsk(null);
                    setWhen(Number(e.target.value));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setWhen(0);
                  }}
                  style={{ ["--pos" as string]: `${((when + RANGE) / (2 * RANGE)) * 100}%` }}
                />
                <span className="tl-today" aria-hidden="true" />
              </div>
              <span className="tl-end">Future</span>
              <button className={`tl-now${when ? "" : " is-now"}`} onClick={() => setWhen(0)} aria-label="Back to today">
                {offsetLabel(when)}
              </button>
            </div>
          )}

          <div className="signal-live" role="status" aria-live="polite">
            {googleNote && (
              <div className="signal-card pop" key="google-note">
                <i style={{ background: googleNote.ok ? "#3fbf7f" : "#e4574a" }} aria-hidden="true" />
                <div>
                  <p className="signal-kicker" style={{ color: hex(PRODUCT_COLOR.move) }}>{googleNote.kicker}</p>
                  <p className="signal-what">{googleNote.what}</p>
                </div>
                <button className="signal-x" onClick={() => setGoogleNote(null)} aria-label="Dismiss">
                  ×
                </button>
              </div>
            )}
            {toast && !tour && (
              <div className="signal-card pop" key={toast.id}>
                <i style={{ background: hex(PRODUCT_COLOR[toast.product]) }} aria-hidden="true" />
                <div>
                  <p className="signal-kicker" style={{ color: hex(PRODUCT_COLOR[toast.product]) }}>
                    {productName(toast.product)} · just now
                  </p>
                  <p className="signal-what">{toast.what}</p>
                </div>
                <button
                  onClick={() => {
                    setToast(null);
                    goTo(toast.nodeId);
                  }}
                >
                  Go to
                </button>
                <button className="signal-x" onClick={() => setToast(null)} aria-label="Dismiss">
                  ×
                </button>
              </div>
            )}
          </div>

          {focus.id === graph.rootId && !tour && !ask && !timeline && <p className="orb-hint">{HINT}</p>}

          <div className="controls map-ctrls" role="toolbar" aria-label="Map controls">
            <button onClick={goBack} disabled={!ask && focus.id === graph.rootId} aria-label="Back" data-tip="Back">
              ←
            </button>
            {/* + before −, as on every other map view (Day Clock, Weekly Review, Power Hour ...): same spot, same order. */}
            <button className="zoom-btn" onClick={() => zoom(1.25)} aria-label="Zoom in" data-tip="Zoom in">
              +
            </button>
            <button className="zoom-btn" onClick={() => zoom(0.8)} aria-label="Zoom out" data-tip="Zoom out">
              −
            </button>
            <button onClick={goHome} aria-label="Centre on ONE" data-tip="Centre">
              ◎
            </button>
            <button className="help-btn" onClick={() => setGuide(true)} aria-label="What everything means" data-tip="What everything means">
              ?
            </button>
          </div>
        </section>

        {ask ? (
          <aside ref={drawerRef} key={`ask-${ask.question}`} className="drawer pop" aria-label="Pulse's answer" aria-live="polite">
            <div className="d-head">
              <span className="chip" style={{ color: hex(PRODUCT_COLOR.one), borderColor: hex(PRODUCT_COLOR.one) }}>
                <PulseMark label={false} /> Ask Pulse
              </span>
            </div>
            <p className="ask-q">{ask.question}</p>
            <p className="ask-a">{ask.answer}</p>
            {ask.source === "ai" && <p className="d-src">Answered from your business, just now</p>}
            {ask.people?.length ? (
              <div className="d-recs">
                <h2>People</h2>
                <ul>
                  {ask.people.map((p) => (
                    <li key={p.contactId} className="rec">
                      <p className="rec-title">{p.name}</p>
                      {p.reasons.length ? <p className="ask-sub">{p.reasons.join(" · ")}</p> : null}
                      <div className="rec-actions">
                        <button className="link" onClick={() => openPerson(p.contactId)}>
                          Open {p.name} →
                        </button>
                        {p.phone ? (
                          <a className="ask-call" href={`tel:${p.phone}`} aria-label={`Call ${p.name}`} title={`Call ${p.name}`}>
                            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" /></svg>
                            Call
                          </a>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {ask.results.length > 0 && (
              <div className="d-recs">
                <h2>Pulse found</h2>
                <ul>
                  {ask.results.map((r) => {
                    const n = ix.byId.get(r.id);
                    if (!n) return null;
                    return (
                      <li key={r.id} className="rec">
                        <p className="rec-state" style={{ color: hex(PRODUCT_COLOR[n.product]) }}>
                          <i style={{ borderColor: hex(PRODUCT_COLOR[n.product]) }} />
                          {productName(n.product)}
                          {n.status && <span style={{ color: hex(STATUS[n.status].color) }}> · {STATUS[n.status].label}</span>}
                        </p>
                        <p className="rec-title">{n.label}</p>
                        {n.secondaryLabel && <p className="ask-sub">{n.secondaryLabel}</p>}
                        <div className="rec-actions">
                          <button className="link" onClick={() => goToNode(n.id)}>
                            {n.contactId ? `Open ${cleanName(n.label)}` : `Go to ${cleanName(n.label)}`} →
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <button className="btn btn-wide ghost-btn" onClick={clearAsk}>
              ← Back to the map
            </button>
          </aside>
        ) : timeline ? (
          <aside ref={drawerRef} className="drawer" aria-label="Timeline" aria-live="polite">
            <div className="d-head">
              <span className="chip" style={{ color: hex(PRODUCT_COLOR.one), borderColor: hex(PRODUCT_COLOR.one) }}>
                {when < 0 ? "Looking back" : "Looking ahead"}
              </span>
            </div>
            <h1 className="d-title">{windowTitle(when)}</h1>
            <p className="d-sum">
              {live && feed === null
                ? "Reading your history and what is coming..."
                : dated.length
                ? when < 0
                  ? `${dated.length} ${dated.length === 1 ? "thing" : "things"} happened across your business.`
                  : `${dated.length} ${dated.length === 1 ? "thing is" : "things are"} coming up.`
                : when < 0
                  ? "Nothing recorded in this stretch."
                  : "Nothing on the calendar yet."}
            </p>
            {byWeek(dated, now).map((wk) => (
              <div key={wk.label} className="tl-week">
                <p className="tl-week-h">{wk.label}</p>
                <ul className="tl-list">
                  {wk.rows.map((d, k) => {
                    const n = ix.byId.get(d.id);
                    return (
                      <li key={`${d.id}-${d.at}-${k}`}>
                        <button onClick={() => (d.contactId ? openPerson(d.contactId) : goTo(d.id))}>
                          <span className="tl-day">{dayLabel(d.day, d.at)}</span>
                          <span className="tl-body">
                            <small style={{ color: hex(PRODUCT_COLOR[d.product]) }}>{whereLabel(d.product)}</small>
                            {d.what}
                          </span>
                          <em aria-label={d.contactId ? "Open their card" : `Go to ${n?.label ?? whereLabel(d.product)}`}>→</em>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <button className="btn btn-wide ghost-btn" onClick={() => setWhen(0)}>
              ← Back to today
            </button>
          </aside>
        ) : (
        <aside ref={drawerRef} key={state.focusId} className="drawer pop" aria-label={`${focus.label} details`} aria-live="polite">
          <div className="d-head">
            <span className="chip" style={{ color: hex(PRODUCT_COLOR[focus.product]), borderColor: hex(PRODUCT_COLOR[focus.product]) }}>
              {/* ONE YOU is the desktop orb and its groups; a single task or person still says where it came from */}
              {isHubPart(focus) ? "Team" : focus.product === "go" && ["product", "feature", "category", "goal"].includes(focus.type) ? "ONE YOU" : productName(focus.product)}
            </span>
            {focus.status && !focus.locked && (
              <span className="state" style={{ color: hex(STATUS[focus.status].color) }}>
                <i style={{ background: hex(STATUS[focus.status].color) }} />
                {STATUS[focus.status].label}
              </span>
            )}
          </div>
          <h1 className="d-title">{focus.type === "core" ? hello : focus.label}</h1>
          {focus.secondaryLabel && focus.type !== "core" && <p className="d-sub">{focus.secondaryLabel}</p>}
          {/* ONE YOU on a phone (Parry, 16 Oct, Plan my day audit 3.1.8: 8 of its 20 tools showed round the orb, labels about
              6 px): every tool in a readable list right under the orb view; a row opens the tool as tapping its orb does.
              Phones only (globals.css .phone-tools); desktop unchanged. */}
          {/* Away (Parry, 16 Oct): one line in ONE YOU, linking to the Time off card on My Profile; no orb. */}
          {focus.id === "go" && awayLine(timeOff) && !ask && (
            <p className="d-sub d-away">
              <button
                className="link"
                onClick={() => {
                  try {
                    window.history.replaceState(null, "", "#time-off");
                  } catch {}
                  goTo(movePageId("/profile"));
                }}
              >
                {awayLine(timeOff)}
              </button>
            </p>
          )}
          {focus.id === "go" && kids.length > 0 && !ask && (
            <div className="d-list phone-tools">
              <h2>Your ONE YOU tools</h2>
              {youTools}
            </div>
          )}
          {focus.type === "core" && note ? (
            <>
              <p className="d-sum">{note.note}</p>
              {note.source === "ai" && <p className="d-src">Pulse wrote this for you this morning</p>}
              {mpOffer && (
                <button type="button" className="ln-btn" onClick={() => void startMorningPulse()}>
                  <span aria-hidden="true">▶</span> Play Morning Pulse
                </button>
              )}
            </>
          ) : (
            focus.summary && !isMoveGroup(focus.id) && <p className="d-sum">{focus.summary}</p>
          )}

          {isMoveGroup(focus.id) && !ask && <GroupPanel node={focus} ix={ix} today={localDay(new Date())} goTo={goTo} demo={!live} events={eventsNow} learn={learn} />}

          {/* the demo's example lead: the lead card on screen only (there is no ONE MOVE contact behind it) */}
          {!live && focus.id.startsWith(`${LEADS_NODE}:`) && leadOf(newLeads, focus.contactId) && !ask ? (
            <LeadCard
              key={focus.id}
              lead={leadOf(newLeads, focus.contactId)!}
              phone="(801) 555-0142"
              email={null}
              tel="8015550142"
              agentFirst={agent.firstName}
              live={false}
              onOutcome={(o, when) => leadOutcome(focus.contactId!, o, when)}
            />
          ) : null}

          {/* A person's card: ONE MOVE's people and tasks, and ONE GO's VIP touches with a person behind them (Parry, 20 Oct:
              "it's only bringing up their name in the side panel box. It should open their full panel"). */}
          {(focus.contactId || focus.taskId) && (focus.product === "move" || (focus.product === "go" && !!focus.contactId && live)) && !focus.locked && !ask && (live || !focus.id.startsWith(`${LEADS_NODE}:`)) && (
            <PersonPanel
              key={focus.id}
              contactId={focus.contactId}
              taskId={focus.taskId}
              title={focus.label}
              lead={focus.contactId ? leadOf(newLeads, focus.contactId) : null}
              agentFirst={agent.firstName}
              onLeadOutcome={leadOutcome}
              onChanged={refreshLive}
              openContacts={() => goTo(movePageId("/contacts"))}
              onOpenPage={(path, query) => {
                setPageQuery({ path, query });
                goTo(movePageId(path));
              }}
            />
          )}

          {/* "..." > Delete contact on a person's card (live: one of the agent's contacts; demo: on screen only) */}
          {focus.type === "person" && focus.product === "move" && !focus.locked && !ask && !tour && (live ? !!focus.contactId : true) ? (
            <div className="pmenu-row">
              <PersonMenu key={focus.id} first={firstOf(cleanName(focus.label))} onDelete={() => deleteOrb(focus)} />
            </div>
          ) : null}

          {focus.id === REVSHARE_NODE && rezen.r && !ask ? <RevsharePanel r={rezen.r} plans={rezen.p} /> : null}
          {focus.id === NETWORK_NODE && rezen.n && !ask ? <NetworkPanel n={rezen.n} /> : null}

          {focus.id === START_NODE && start && !ask ? (
            <GettingStartedPanel s={start} placeOf={startPlaceOf} onOpen={openStartPlace} onFilm={(f) => (f === "a" ? setGuide(true) : f === "c" ? setWebFilm(true) : setGoTour(true))} />
          ) : null}

          {isFollowUpsOrb(focus.id) && !ask ? (
            <FollowUpsPanel
              key={focus.id}
              f={follow && focus.id === FOLLOW_NODE ? mergeFollowUps(follow, followSumRef.current?.rows) : rowsFromKids(kids, todayIn())}
              today={todayIn()}
              live={live}
              onOpen={openOrb}
              onLogged={() => {
                refreshLive();
                loadFollow();
              }}
            />
          ) : null}

          {(focus.id === TEAM_HUB || focus.id === TEAM_NODE || focus.id === WAR_NODE || focus.id === ONB_NODE) && !ask ? (
            <TeamHubPanel id={focus.id} team={team} war={war} onb={onbShown} removed={onbRemovedRef.current} now={Date.now()} needs={needs} openOrb={openOrb} people={teamPeople} />
          ) : null}

          {focus.id === WAR_NODE && war30 && !ask ? (
            <TeamWarPanel
              war={war30}
              agents={(teamPeople?.people ?? war30.byAgent).map((a) => ({ id: a.id, first: a.first }))}
              now={Date.now()}
              live={live}
              onChanged={() => {
                loadWar30();
                loadWar();
              }}
              onTeamLeads={() => goTo(movePageId(TEAM_LEADS_PATH))}
            />
          ) : null}

          {agentIdOf(focus.id) && !ask && (() => {
            const p = teamPeople?.people.find((x) => x.id === agentIdOf(focus.id));
            return p ? <TeamAgentPanel key={focus.id} p={p} example={!!teamPeople?.example} /> : null;
          })()}

          {focus.id === TEAM_HUB && attraction?.teamLead && !ask ? <AttractionSection a={attraction} live={live} /> : null}
          {/* The team's deals from the leader's reZEN: never in their own goals (Parry, 21 Oct). Owner and admin only. */}
          {focus.id === TEAM_HUB && !ask && !tour ? <TeamRezenSection live={live} /> : null}

          {partOf(focus.id) && focus.product === "move" && !focus.locked && !ask && !tour ? (
            <OutreachPanel
              key={focus.id}
              part={partOf(focus.id)!}
              outreach={outreach}
              events={eventsNow}
              live={live}
              onOpenPage={(path, query) => {
                // the example agent opens only what the Brain draws itself (Market Reports); nothing reaches ONE MOVE
                if (!live && path !== HOME_REPORTS_PATH) return setSiteNote(`Example agent: signed in, this opens ${partOf(focus.id)!.label} in ONE MOVE.`);
                if (!ix.byId.has(movePageId(path))) return void window.open(moveMenuHref(path) + (query ? `?${query}` : ""), "_blank", "noopener");
                setPageQuery(query ? { path, query } : null);
                openMovePage(path);
              }}
              onBulk={() => {
                openMovePage(HOME_REPORTS_PATH);
                setHrStart("vips");
              }}
              onOpenPerson={(id) => {
                const page = movePageId("/contacts");
                if (!ix.byId.has(page)) return;
                setContactOpen({ id, k: Date.now() });
                goTo(page);
              }}
            />
          ) : null}

          {/* Action Plans drawn natively (lib/actionPlans.ts): the part's note, a plan's panel, a face's step */}
          {partOf(focus.id)?.key === "action_plans" && focus.product === "move" && !focus.locked && !ask && !tour ? <PlansPartNote plans={plans} /> : null}
          {planOf(focus.id) && !ask && !tour && (() => {
            const at = planOf(focus.id)!;
            const plan = at.planId === "example" ? examplePlan() : plans?.find((p) => p.id === at.planId);
            if (!plan) return null;
            if (!isPlanNode(focus.id)) return at.contactId ? <PlanPersonLine key={focus.id} plan={plan} contactId={at.contactId} /> : null;
            return (
              <PlanPanel
                key={focus.id}
                plan={plan}
                live={live}
                onEnrolled={(p) => setPlans((l) => withPlan(l ?? [], p))}
                onOpenPlans={() => (live ? openMovePage("/action-plans") : setSiteNote("Example agent: signed in, this opens Action Plans in ONE MOVE."))}
              />
            );
          })()}

          {/* Learn shows what is inside (lib/learn.ts): the search box on the Learn orb, a panel on each part */}
          {focus.id === moveGroupId("learn") && !ask && !tour ? <LearnSearch live={live} learn={learn} onOpenPage={openMovePage} /> : null}
          {learnPartOf(focus.id) && !ask && !tour ? (
            <LearnPartPanel
              key={focus.id}
              part={learnPartOf(focus.id)!}
              learn={learn}
              live={live}
              onOpenPage={(path) => (live ? openMovePage(path) : setSiteNote("Example agent: signed in, this opens it in ONE MOVE."))}
              onFilm={(f) => (f === "a" ? setGuide(true) : f === "c" ? setWebFilm(true) : setGoTour(true))}
            />
          ) : null}

          {onbIdOf(focus.id) && !ask && (() => {
            const m = onbShown?.find((x) => x.id === onbIdOf(focus.id));
            return m ? <OnboardingPanel key={focus.id} m={m} /> : null;
          })()}

          {(isLooksHotOrb(focus.id) || looksIdOf(focus.id)) && !ask ? (
            <LooksHotPanel
              key={focus.id}
              list={looks}
              person={looksIdOf(focus.id) ? looks?.find((x) => x.id === looksIdOf(focus.id)) ?? null : null}
              live={live}
              onOpen={(p) => goTo(looksNodeId(p.id))}
              onDone={looksDone}
              onOpenPage={(path, query) => {
                setPageQuery({ path, query });
                goTo(movePageId(path));
              }}
            />
          ) : null}

          {launchRefOf(focus.id) && focus.product === "marquee" && !focus.locked && !ask && (
            <LaunchPanel
              listingRef={launchRefOf(focus.id)!}
              launch={launches?.find((l) => l.listingRef === launchRefOf(focus.id)) ?? null}
              live={live}
              onLaunched={(l) => setLaunches((ls) => upsertLaunch(ls, l))}
              onOpenPage={(path, query) => {
                setPageQuery({ path, query });
                goTo(movePageId(path));
              }}
            />
          )}

          {/^marquee:listing:/.test(focus.id) && launchRefOf(focus.id) && focus.product === "marquee" && !focus.locked && !ask && (
            <ListingFitsSection listingId={launchRefOf(focus.id)!} live={live} address={focus.label} />
          )}

          {focus.decide && !focus.locked && !ask && (
            <div className="decide">
              {decided[focus.id] ? (
                <p className="decide-done" role="status">{decided[focus.id]}</p>
              ) : (
                <>
                  {focus.decide.askGci && (
                    <label className="decide-gci">
                      <span>GCI for this closing (optional)</span>
                      <input inputMode="decimal" placeholder="$" value={gci} onChange={(e) => setGci(e.target.value.replace(/[^0-9.]/g, ""))} />
                    </label>
                  )}
                  <div className="decide-btns">
                    <button className="btn" disabled={deciding} onClick={() => decide(focus, true)}>{focus.decide.acceptLabel}</button>
                    <button className="btn ghost-btn" disabled={deciding} onClick={() => decide(focus, false)}>Dismiss</button>
                  </div>
                  {decideErr && <p className="decide-err" role="alert">{decideErr}</p>}
                </>
              )}
            </div>
          )}

          {focus.id === REVIEW_NODE && theReview && !tour && (
            <button className="pi-film pm-open" onClick={() => setReviewOpen(true)}>
              <span className="pi-play" aria-hidden="true">☰</span>
              <span>
                <b>Open Weekly Review</b>
                <span>Your week, Pulse&apos;s read on the last 8 weeks, and three things for next week you can make commitments.</span>
              </span>
            </button>
          )}


          {focus.id === POWER_NODE && !tour && (
            <button className="pi-film pm-open" onClick={() => setPowerOpen(true)}>
              <span className="pi-play" aria-hidden="true">☎</span>
              <span>
                <b>Start a Power Hour</b>
                <span>Your day's one Power Hour: today's VIP touches (calls, video texts, social), with a countdown and what got done.</span>
              </span>
            </button>
          )}

          {focus.id === REVIEW_CALLS_NODE && rcAgents && !tour && (
            <button className="pi-film pm-open" onClick={() => setRcOpen(true)}>
              <span className="pi-play" aria-hidden="true">✓</span>
              <span>
                <b>Open Review calls</b>
                <span>The call guide for the done-for-you site and SOI setup. Saved on the agent's record.</span>
              </span>
            </button>
          )}
          {focus.id === WAR_NODE && war && !tour && (
            <button className="pi-film pm-open" onClick={() => setWarOpen(true)}>
              <span className="pi-play" aria-hidden="true">!</span>
              <span>
                <b>Open the war room</b>
                <span>Team leads, who has them and how fast they were reached. Reassign in ONE MOVE.</span>
              </span>
            </button>
          )}
          {focus.id === TEAM_NODE && team && !tour && (
            <button className="pi-film pm-open" onClick={() => setTeamOpen(true)}>
              <span className="pi-play" aria-hidden="true">#</span>
              <span>
                <b>Open the Team screen</b>
                <span>The week's leaderboard. Show it full screen on the office TV.</span>
              </span>
            </button>
          )}
          {focus.id === GROWTH_NODE && focus.locked && !tour && GROWTH_JOIN_BUTTON.action.kind === "join" && (
            <a className="pi-film pm-open" href={GROWTH_JOIN_BUTTON.action.href} target="_blank" rel="noreferrer">
              <span className="pi-play" aria-hidden="true">↗</span>
              <span>
                <b>{GROWTH_JOIN_BUTTON.label}</b>
                <span>{GROWTH_JOIN_BUTTON.note}</span>
              </span>
            </a>
          )}
          {mqKeyOf(focus.id) && !tour && !ask ? (
            <MarqueePanel tool={mqKeyOf(focus.id)!} today={todayIn()} example={!live || !!focus.secondaryLabel?.startsWith("Example")} onOpen={(deck, tool) => setMqOpen({ tool: tool ?? mqKeyOf(focus.id)!, deck, href: focus.href })} />
          ) : null}
          {/* Each Growth piece shows its example in the panel and opens its full view inside the Brain (Parry, 18 Oct);
              the real place (studio, ONE MOVE, My Profile) stays as the secondary button. */}
          {growthPiece && <GrowthPanel childKey={growthPiece.key} showOpen={!tour} onOpen={() => setGrowthOpen(growthPiece.key)} />}
          {growthPiece && !tour && (growthPiece.button ? (
            <button type="button" className="chip-btn gv-real" title={growthPiece.button.note} onClick={() => runGrowth(growthPiece.button!.action)}>
              {realLabel(growthPiece.button.action.kind)} ↗
            </button>
          ) : null)}
          {focus.id === LIKELY_NODE && !tour && (
            <button className="pi-film pm-open" onClick={() => setLikelyOpen(true)}>
              <span className="pi-play" aria-hidden="true">⌂</span>
              <span>
                <b>Open likely to move</b>
                <span>Past clients whose homes suggest a move may be coming, with the reasons and a check-in.</span>
              </span>
            </button>
          )}
          {focus.id === BROKER_NODE && broker && !tour && (
            <button className="pi-film pm-open" onClick={() => setBrokerOpen(true)}>
              <span className="pi-play" aria-hidden="true">B</span>
              <span>
                <b>Open the Broker view</b>
                <span>Offices with their agents, who has gone quiet and who needs a word, each team's war room. Seats {broker.brokerage.seatsUsed} of {broker.brokerage.seatsIncluded}.</span>
              </span>
            </button>
          )}
          {focus.id === DEALS_NODE && deals && !tour && (
            <>
              <button className="pi-film pm-open" onClick={() => setDealsOpen("list")}>
                <span className="pi-play" aria-hidden="true">◆</span>
                <span>
                  <b>Open deals</b>
                  <span>Every REPC deadline with days left; red on the day, yellow the day before.</span>
                </span>
              </button>
              <button className="pi-film pm-open" onClick={() => setDealsOpen("add")}>
                <span className="pi-play" aria-hidden="true">+</span>
                <span>
                  <b>Add a deal</b>
                  <span>Type the REPC dates, or upload the signed REPC and Pulse fills them for you to check.</span>
                </span>
              </button>
            </>
          )}
          {focus.id === LIFE_NODE && life && !tour && (
            <button className="pi-film pm-open" onClick={() => setLifeOpen(true)}>
              <span className="pi-play" aria-hidden="true">♡</span>
              <span>
                <b>Open life events</b>
                <span>Birthdays, anniversaries, home anniversaries and news from your notes, soonest first, with the touch to make.</span>
              </span>
            </button>
          )}
          {focus.id === HABITS_NODE && theHabits.length > 0 && !tour && (
            <button className="pi-film pm-open" onClick={openHabits}>
              <span className="pi-play" aria-hidden="true">♥</span>
              <span>
                <b>Open your Habits</b>
                <span>Your morning habits as one ring. Tick them here and they tick on your Daily Tracker.</span>
              </span>
            </button>
          )}
          {focus.id === REFERRALS_NODE && refs && !tour && (
            <button className="pi-film pm-open" onClick={() => setRefsOpen(true)}>
              <span className="pi-play" aria-hidden="true">★</span>
              <span>
                <b>Open the Referral Scoreboard</b>
                <span>
                  {refs.thankOwed || refs.readyToAsk
                    ? `${thankCount(refs, todayIn())} thank-you${thankCount(refs, todayIn()) === 1 ? "" : "s"} owed · ${refs.readyToAsk?.length ?? 0} ready to ask. Log a thank-you or add an ask task; ONE sends nothing.`
                    : "Who sent you business, who is likely next, and how many of your VIPs refer."}
                </span>
              </span>
            </button>
          )}
          {/* Goals, one orb in three parts (Parry, 16 Oct 13:38 MT: "yes do that"): a line from each part here; opening it
              shows all three. Each goal orb keeps its own Closings / Referrals / GCI panel with pace and "Change goal". */}
          {focus.id === GOALS_NODE && !focus.locked && !ask && (
            <>
              <ul className="pm-list pm-compact gl-three" aria-label="Goals, in three parts">
                {[
                  { k: "1", t: "Closed so far", l: theGoals.closed.line, refs: true },
                  { k: "2", t: "Likely next 3 months", l: theGoals.likely?.line ?? "Coming once you have deals under contract or Hot people in ONE MOVE" },
                  { k: "3", t: "What to do each week", l: theGoals.weekly?.line ?? "Set a GCI or closings goal to see your weekly numbers" },
                ].map((r) => (
                  <li key={r.k}>
                    <span className="pm-time">{r.k}</span>
                    <span className="pm-body">
                      <b>{r.t}</b>
                      <small>{r.l}</small>
                      {"refs" in r && refs && !tour ? (
                        <button className="link gl-refs" onClick={() => setRefsOpen(true)} aria-label={`Open Referrals: ${yearLine(refs)}`}>
                          {`Referrals: ${yearLine(refs)} →`}
                        </button>
                      ) : null}
                    </span>
                    {!tour ? (
                      <span className="pm-acts">
                        <button onClick={() => setGoalsOpen(true)} data-act="goals-part" aria-label={`Open Goals: ${r.t}`}>→</button>
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
              {!tour && (
                <button className="pi-film pm-open" onClick={() => setGoalsOpen(true)}>
                  <span className="pi-play" aria-hidden="true">$</span>
                  <span>
                    <b>Open Goals</b>
                    <span>Closed so far, likely in the next 3 months, and what to do each week to close the gap.</span>
                  </span>
                </button>
              )}
            </>
          )}
          {/* The Scoreboard (Parry, 16 Oct: "yes on combining into Scoreboard"), live and demo. */}
          {focus.id === SCORE_NODE && !focus.locked && !ask && (
            <ScoreboardPanel
              key={focus.id}
              node={focus}
              nodes={graph.nodes}
              live={live}
              today={todayIn()}
              team={team}
              partners={partners}
              wins={wins}
              weekWins={weekWinsLive}
              scoreboard={live ? scoreLive : null}
              weekScores={history?.weeks ?? null}
              onPartner={partnerAct}
              onOpenPartners={() => setPartnersOpen(true)}
              onOpenWins={() => setWinsOpen(true)}
              onOpenTeam={team ? () => setTeamOpen(true) : undefined}
              onPage={(path) => goPage(path)}
              onWhere={(w) => {
                if (w === "badges") {
                  try {
                    window.history.replaceState(null, "", "#badges");
                  } catch {}
                  return goTo(movePageId("/profile"));
                }
                if (w === "referrals") return refs ? setRefsOpen(true) : goTo(REFERRALS_NODE);
                if (w === "goals") return goTo(GOALS_NODE);
                setWinsOpen(true);
              }}
            />
          )}
          {/* The 90-Day Challenge in full (Parry, 16 Oct 13:43 MT: "it needs to go much deeper"), live and demo. */}
          {focus.id === CHALLENGE_NODE && !focus.locked && !ask && (
            <ChallengePanel key={focus.id} node={focus} data={shownChallenge} tour={!!tour} onOpenView={() => setChOpen(true)} />
          )}
          {focus.type === "goal" && focus.goal && !focus.locked && !tour && !ask && (
            <GoalsPanel
              goals={withReferralCount(goalFacts(graph.nodes), refs)}
              today={todayIn()}
              demo={!live}
              rezenConnected={rezenOn}
              only={focus.type === "goal" ? focus.goal!.key : undefined}
              onSave={saveGoal}
              onProfile={() => goTo(movePageId("/profile"))}
              onReferrals={() => (refs ? setRefsOpen(true) : goTo(REFERRALS_NODE))}
              onReferralLogged={loadRefs}
              onSetStart={setGoalStart}
            />
          )}

          {focus.id === COACH_NODE && !tour && (
            <button className="pi-film pm-open" onClick={() => setCoachOpen(true)}>
              <span className="pi-play" aria-hidden="true">☰</span>
              <span>
                <b>Open coaching</b>
                <span>Each agent you coach: their week, their check-ins and how many they keep.</span>
              </span>
            </button>
          )}

          {(focus.type === "core" || focus.id === "go") && !tour && (thePlanState === "approved" ? (
            // Approved: the card steps aside to one green line (audit stage 2).
            <div className="plan-ok">
              <span>
                <i aria-hidden="true">✓</i> Plan approved{theDay.approvedAt && /^\d{4}-/.test(theDay.approvedAt) ? ` ${clock12(new Intl.DateTimeFormat("en-GB", { timeZone: "America/Denver", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(theDay.approvedAt)))}` : ""}
              </span>
              <button className="link" onClick={() => setClockOpen(true)}>Change order</button>
            </div>
          ) : (
            <button className="pi-film pm-open" onClick={() => setClockOpen(true)}>
              <span className="pi-play" aria-hidden="true">☰</span>
              <span>
                <b>Plan my day</b>
                <span>
                  {dayBegins.kind === "off"
                    ? `${dayBegins.line}. ${dayBegins.button}.`
                    : dayOver
                    ? "Today's working day is over. Open it to see tomorrow's plan."
                    : dayBegins.kind === "before"
                      ? `${dayBegins.line}. ${thePlanState === "ready" ? "Pulse planned it round your calendar. Look it over and tap Looks good." : "Open it and Pulse plans today round your calendar."}`
                    : thePlanState === "ready"
                      ? "Pulse planned today round your calendar. Look it over and tap Looks good."
                      : "Not planned yet. Open it and Pulse plans today round your calendar."}
                </span>
              </span>
            </button>
          ))}

          {/* The Plan my day orb's own panel has a real button (Parry, 16 Oct, Plan my day audit 3.1.5: "Tap to plan" and no
              button); it does what tapping the orb does. */}
          {focus.id === PLAN_NODE && !tour && (
            <button className="pi-film pm-open" onClick={() => openOrb(PLAN_NODE)}>
              <span className="pi-play" aria-hidden="true">☰</span>
              <span>
                <b>Plan my day</b>
                <span>{dayBegins.kind === "off" ? `${dayBegins.line}. ${dayBegins.button}.` : dayOver ? "See tomorrow's plan, built from what moves to tomorrow." : dayBegins.kind === "before" ? `${dayBegins.line}. Open the Day Clock: today planned round your calendar.` : "Open the Day Clock: today planned round your calendar."}</span>
              </span>
            </button>
          )}

          {focus.type === "core" && slots.length > 0 && (
            <div className="day">
              <h2>{planned?.items.length ? "Your plan" : "Your day"}</h2>
              {evening || day.done === day.total ? (
                <div className="day-recap pop">
                  <p className="day-recap-k">Your day, compiled</p>
                  <p className="day-recap-t">
                    {day.done} of {day.total} done. {day.vipTouches} VIP {day.vipTouches === 1 ? "touch" : "touches"}.{" "}
                    {tomorrow.length ? `${tomorrow.length} ${tomorrow.length === 1 ? "moves" : "move"} to tomorrow.` : "Nothing missed."}
                  </p>
                </div>
              ) : (
                <>
                  <p className="day-when">
                    {day.done} of {day.total} done · about {duration(day.minutesLeft)} left
                  </p>
                  <div className="day-bar" role="progressbar" aria-valuemin={0} aria-valuemax={day.total} aria-valuenow={day.done} aria-label="Done today">
                    <i style={{ width: `${day.total ? Math.round((day.done / day.total) * 100) : 0}%` }} />
                  </div>
                </>
              )}
              {dayGroups.map((g) => (
                <section key={g.key} className={`day-group${g.now ? " is-now" : ""}`} aria-label={groupHead(g)}>
                  {g.rows[0]?.touchBlock && g.key !== "done" && g.key !== "tomorrow" ? (
                    <h3 className="day-head">
                      <button className="day-head-open" onClick={() => setTouchOpen(g.rows[0].touchBlock!)}>{groupHead(g)} · Open →</button>
                    </h3>
                  ) : (
                    <h3 className="day-head">{groupHead(g)}</h3>
                  )}
                  <ol>
                    {g.rows.map((x) => (
                      <li key={x.id} className={`${x.done ? "is-done" : ""}${x.isNow ? " is-now" : ""}`}>
                        <button
                          className="day-done"
                          aria-pressed={x.done}
                          aria-label={x.done ? `Done: ${x.what}. Tap to undo.` : `Mark done: ${x.what}`}
                          onClick={() => {
                            if (!x.done) setDoneAt((m) => ({ ...m, [x.id]: theDay.now ?? "" }));
                            const item = x.touchBlock ? touchItemOf(x.touchBlock, x.ref ?? "") : null;
                            if (item) void tickTouch(item, !x.done);
                            else tickDay(x.id, !x.done);
                          }}
                        >
                          <span aria-hidden="true">✓</span>
                          <small>{x.done ? (doneAt[x.id] ? `Done ${clock12(doneAt[x.id])}` : "Done") : "Done"}</small>
                        </button>
                        <button className="day-item" onClick={() => (x.touchBlock ? setTouchOpen(x.touchBlock) : goTo(x.nodeId))}>
                          <span className="day-time">{x.isNow ? "NOW" : clock(x.start)}</span>
                          <span className="day-body">
                            <small style={{ color: hex(PRODUCT_COLOR[x.product]) }}>
                              {productName(x.product)} · {duration(x.minutes)}
                              {x.movedFrom ? ` · Moved from ${clock(x.movedFrom)}` : ""}
                            </small>
                            {x.what}
                          </span>
                          <em aria-hidden="true">→</em>
                        </button>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
              <button className="link" onClick={() => setDayMap((v) => !v)}>
                {dayView ? "← Back to the map" : "▶ Show my day on the map"}
              </button>
              {/* One Morning Pulse (Parry, 16 Oct 21:14 MT) replaces "Watch Pulse work on my day" and Listen. */}
              <button className="link" onClick={() => void startMorningPulse()}>
                ▶ Play Morning Pulse
              </button>
            </div>
          )}

          {focus.type === "core" && !ask && <ClosedCards live={live} />}
          {/* Log a referral from the home panel too, not only Goals and the Scoreboard (Parry, 21 Oct: "both classic and
              one brain"). */}
          {focus.type === "core" && !ask && !tour ? <LogReferral demo={!live} onLogged={loadRefs} /> : null}

          {focus.type === "core" && !ask && (() => {
            // One morning (CONNECTIONS gap 7): the one thing in each product that needs you today.
            const picks = perProduct(graph.nodes);
            return picks.length ? (
              <div className="since one-morning">
                <h2>Today in each product</h2>
                <ul>
                  {picks.map((p) =>
                    p.level === "ok" ? (
                      <li key={p.product} className="pick-ok">
                        <span className="pick-quiet">
                          <i className="row-mark ok" style={{ borderColor: "#3fbf7f" }} aria-hidden="true" />
                          <span>
                            <small style={{ color: hex(PRODUCT_COLOR[p.product]) }}>{p.productName}</small>
                            All good
                          </span>
                        </span>
                      </li>
                    ) : (
                      <li key={p.product}>
                        <button onClick={() => openOrb(p.id)}>
                          <i style={{ background: hex(STATUS[p.level].color) }} aria-hidden="true" />
                          <span>
                            <small style={{ color: hex(PRODUCT_COLOR[p.product]) }}>{p.productName}</small>
                            {p.label}{p.line ? `, ${p.line}` : ""}
                            {p.more ? <span className="pick-more"> +{p.more} more</span> : null}
                          </span>
                          <em aria-label={`Open ${p.label}`}>→</em>
                        </button>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            ) : null;
          })()}

          {focus.type === "core" && since && (
            <div className="since">
              {since.changes.length > 0 && (
                <>
                  <h2>Since you were last here</h2>
                  <p className="since-when">{since.label}</p>
                  {groupChanges(since.changes).map((g) => (
                    <div key={g.product} className="since-group">
                      <h3 style={{ color: hex(PRODUCT_COLOR[g.product as keyof typeof PRODUCT_COLOR]) }}>
                        {productName(g.product as never)} · {g.count} new
                      </h3>
                      <ul>
                        {g.items.slice(0, 5).map((c) => {
                          const n = ix.byId.get(c.id)!;
                          return (
                            <li key={`${c.id}-${c.at}`}>
                              <button onClick={() => openOrb(c.id)}>
                                <i style={{ background: hex(PRODUCT_COLOR[c.product]) }} aria-hidden="true" />
                                <span>{c.what}</span>
                                <em aria-label={`Open ${n.label}`}>→</em>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                      {g.items.length > 5 && <p className="since-none">+{g.items.length - 5} more</p>}
                    </div>
                  ))}
                </>
              )}
              {teamPosts && (
                <div className="since-posts">
                  <h3>Pulse posted on your team site</h3>
                  <ul>
                    {teamPosts.posts.slice(0, 3).map((p) => (
                      <li key={p.url}>
                        <a href={p.url} target="_blank" rel="noopener noreferrer">
                          <small>{postDay(p.publishedAt)}{p.byPulse ? " · by Pulse" : ""}</small>
                          {p.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                  {teamPosts.posts.length > 3 && <p className="since-none">+{teamPosts.posts.length - 3} more</p>}
                  <button className="link" onClick={() => void editSite(teamPosts.host, "/builder/posts")}>
                    See all / Pause blog posts
                  </button>
                </div>
              )}
              {topIds.length > 0 && (
                <button className="link" onClick={startTour}>
                  ▶ Replay my morning
                </button>
              )}
            </div>
          )}

          {/* Showly and ONE Open tools: the example (or the agent's own rows) in the panel, and a full view inside the Brain (Parry, 18 Oct). */}
          {!ask && !tour && SHOWLY_TOOL.test(focus.id) ? <ShowlyTools node={focus} kids={kids} live={live} /> : null}
          {!ask && !tour && OPEN_TOOL.test(focus.id) ? <OpenTools node={focus} kids={kids} live={live} /> : null}
          {!ask && !tour && !live && m2KeyOf(focus.id) ? <MoveTools node={focus} /> : null}

          {focus.locked && focus.id !== GROWTH_NODE && (
            <a className="btn" href={UPGRADE_URL}>
              Add with Complete
            </a>
          )}

          {focus.stats?.length ? <Stats stats={focus.stats} color={hex(PRODUCT_COLOR[focus.product])} ticked={(l) => ticked.has(`${focus.id}|${l}`)} open={statOpens} /> : null}

          {focus.pace && !focus.locked && focus.type !== "goal" && (
            <div className="pace">
              <p className="pace-head">{focus.pace.headline}</p>
              {focus.pace.detail && (
                <p className="pace-detail">
                  <span className="pace-mark" aria-hidden="true" />
                  {focus.pace.detail}
                </p>
              )}
            </div>
          )}

          {moveQuiet && focus.recommendations?.length ? (
            <div className="d-why">
              <h2>Why it's here</h2>
              <ul>
                {[...new Set(focus.recommendations.flatMap((r) => r.why))].map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          ) : null}


          {focus.recommendations && !moveQuiet && (
            <div className="d-recs">
              <h2>ONE recommends</h2>
              <ul>
                {focus.recommendations.map((r, i) => {
                  const target = r.targetId ? ix.byId.get(r.targetId) : undefined;
                  const st = target?.status ?? focus.status;
                  return (
                    <li key={r.title} className="rec">
                      {st && (
                        <p className="rec-state" style={{ color: hex(STATUS[st].color) }}>
                          <i style={{ borderColor: hex(STATUS[st].color) }} />
                          {STATUS[st].label}
                        </p>
                      )}
                      <p className="rec-kicker">Recommended action</p>
                      <p className="rec-title">{r.title}</p>
                      <div className="rec-actions">
                        {target && target.id !== focus.id ? (
                          <button className="link" onClick={() => goToNode(target.id)}>
                            {target.contactId ? "Open" : "Go to"} {target.label.replace(/^(Call|Text|Face-to-face:|Send note to)\s*/i, "")} →
                          </button>
                        ) : null /* already here: the orb's own "Open in <product>" button covers it (audit stage 2) */}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {kids.length > 0 && !isMoveGroup(focus.id) && !isFollowUpsOrb(focus.id) && !isLooksHotOrb(focus.id) && focus.id !== GOALS_NODE && focus.id !== SCORE_NODE && focus.id !== CHALLENGE_NODE && focus.id !== TEAM_HUB && focus.id !== ONB_NODE && (
            <div className={`d-list inside ${railCount > childrenOf(ix, focus.id).length - 1 && !moveQuiet ? "" : "keep"}${focus.id === "go" ? " go-inside" : ""}`}>
              <h2>{focus.type === "core" ? "Your products" : "Inside"}</h2>
              {focus.id === "go" ? youTools : (
              <ul>
                {kids.map((k) => (
                  <li key={k.id}>
                    {/* inside a ONE YOU group a row opens its tool exactly as tapping the orb does */}
                    <button onClick={() => (isYouGroup(focus.id) ? openOrb(k.id) : goTo(k.id))}>
                      <i style={{ background: hex(PRODUCT_COLOR[k.product]) }} />
                      <span>
                        <b>{k.label}</b>
                        {k.locked ? <small>{lockedLine(k)}</small> : k.secondaryLabel && <small>{k.secondaryLabel}</small>}
                      </span>
                      <RowMark n={k} need={needs.get(k.id)} />
                    </button>
                  </li>
                ))}
              </ul>
              )}
            </div>
          )}

          {related.length > 0 && (
            <div className="d-list">
              <h2>Connected</h2>
              <ul>
                {related.map((k) => (
                  <li key={k.id}>
                    <button onClick={() => goTo(k.id)}>
                      <i style={{ background: hex(PRODUCT_COLOR[k.product]) }} />
                      <span>
                        <b>{k.label}</b>
                        <small>{productName(k.product)}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
        )}
        {pagePanel && (
          <section className={`page-panel pop${vipNative ? " page-panel-native" : ""}`} key={pagePanel.path} aria-label={`${pagePanel.label} in ONE MOVE`}>
            {!vipNative && (
            <header className="page-panel-bar">
              <p className="page-panel-title">
                <span style={{ color: hex(PRODUCT_COLOR.move) }}>ONE MOVE</span> · {pagePanel.label}
              </p>
              {nativeKind && (
                <button className="page-panel-classic" onClick={() => setVipClassic((v) => !v)}>
                  {vipClassic ? "ONE Brain view" : "Classic page"}
                </button>
              )}
              <button className="page-panel-close" onClick={() => goTo(focus.parentId ?? "move")} aria-label={`Close ${pagePanel.label}`}>×</button>
            </header>
            )}
            <div ref={frameBoxRef} className="page-panel-body">
              {/* the example agent: ONE MOVE's answers from invented data, so the native view draws filled (lib/examples/move2.ts) */}
              {!live && vipNative && nativeKind && EXAMPLE_NATIVE.has(nativeKind) ? <MoveExampleFetch /> : null}
              {vipNative && nativeKind === "audit" ? (
                <TouchAudit
                  onUnavailable={vipUnavailable}
                  onChanged={refreshLive}
                  onBack={() => goTo(focus.parentId ?? "move")}
                  onClassic={() => setVipClassic(true)}
                  celebrate={graph.celebrate}
                  due={ix.byId.get("move-audit")?.dueContacts}
                />
              ) : vipNative && nativeKind === "contacts" ? (
                <Contacts
                  openId={contactOpen}
                  onUnavailable={vipUnavailable}
                  onChanged={refreshLive}
                  onBack={() => goTo(focus.parentId ?? "move")}
                  onClassic={() => setVipClassic(true)}
                  celebrate={graph.celebrate}
                />
              ) : vipNative && nativeKind === "nts" ? (
                <NewToSort
                  data={nts}
                  live={live}
                  onSorted={(id) => {
                    setNtsGone((g) => new Set(g).add(id));
                    if (live) refreshLive();
                  }}
                  onBack={() => goTo(focus.parentId ?? "move")}
                  onClassic={() => setVipClassic(true)}
                />
              ) : vipNative && nativeKind === "hwc" ? (
                <HotWarmCold
                  onUnavailable={vipUnavailable}
                  onChanged={refreshLive}
                  onBack={() => goTo(focus.parentId ?? "move")}
                  onClassic={() => setVipClassic(true)}
                  celebrate={graph.celebrate}
                />
              ) : vipNative && nativeKind === "profile" ? (
                <MyProfile
                  demo={!live}
                  gbpDemo={!live}
                  onOpenGbp={openGbp}
                  onUnavailable={vipUnavailable}
                  onChanged={refreshLive}
                  onBack={() => goTo(focus.parentId ?? "move")}
                  onClassic={() => setVipClassic(true)}
                  askAi={askAi ? cardFor(askCheck, askAi) : undefined}
                  onOpenAskAi={() => setAiOpen(true)}
                />
              ) : vipNative && nativeKind === "homereports" ? (
                <HomeReports
                  key={hrStart ?? "all"}
                  startAt={hrStart ?? undefined}
                  demo={!live && !productTour}
                  onUnavailable={vipUnavailable}
                  onBack={() => goTo(focus.parentId ?? "move")}
                  onClassic={() => setVipClassic(true)}
                  onOpenPerson={(id) => {
                    const page = movePageId("/contacts");
                    if (!ix.byId.has(page)) return;
                    setContactOpen({ id, k: Date.now() });
                    goTo(page);
                  }}
                />
              ) : vipNative && nativeKind === "listings" ? (
                <ListingsPage
                  nodes={graph.nodes}
                  launches={launches}
                  onOpen={(id, part) => {
                    if (!ix.byId.has(id)) return;
                    goTo(id);
                    // the orb's side panel already holds Launch and "Who of mine fits"; bring the asked part into sight
                    if (part) setTimeout(() => document.querySelector(part === "fits" ? ".fits-card" : ".launch")?.scrollIntoView({ block: "start", behavior: "smooth" }), 450);
                  }}
                  onClose={() => goTo(focus.parentId ?? "move")}
                  onClassic={() => setVipClassic(true)}
                />
              ) : vipNative && nativeKind === "rolodex" ? (
                <Rolodex
                  onUnavailable={vipUnavailable}
                  onBack={() => goTo(focus.parentId ?? "move")}
                  onClassic={() => setVipClassic(true)}
                />
              ) : vipNative && nativeKind === "weekly" ? (
                <WeeklyTracker
                  onUnavailable={vipUnavailable}
                  example={live ? undefined : demoWeeklyRaw(todayIn())}
                  onChanged={refreshLive}
                  onBack={() => goTo(focus.parentId ?? "move")}
                  onClassic={() => setVipClassic(true)}
                />
              ) : vipNative && nativeKind === "daily" ? (
                <DailyTracker
                  onUnavailable={vipUnavailable}
                  example={live ? undefined : demoDailyRaw(todayIn())}
                  onChanged={refreshLive}
                  onBack={() => goTo(focus.parentId ?? "move")}
                  onClassic={() => setVipClassic(true)}
                />
              ) : vipNative ? (
                <VipRings
                  today={localDay(new Date())}
                  onUnavailable={vipUnavailable}
                  onChanged={refreshLive}
                  onBack={() => goTo(focus.parentId ?? "move")}
                  onClassic={() => setVipClassic(true)}
                  referred={referredMap}
                  celebrate={graph.celebrate}
                />
              ) : (
              <>
              {frameReady !== pagePanel.path && (
                <div className="page-panel-veil" role="status">
                  <span className="page-panel-spin" aria-hidden="true" />
                  Opening {pagePanel.label}…
                </div>
              )}
              <iframe
                className={`page-panel-frame ${frameReady === pagePanel.path ? "ready" : ""}`}
                src={moveEmbedHref(pageQuery?.path === pagePanel.path ? `${pagePanel.path}?${pageQuery.query}` : pagePanel.path)}
                title={`${pagePanel.label} in ONE MOVE`}
                onLoad={() => {
                  // ONE MOVE switches to the Brain look as it starts; give it a
                  // beat so the old colours never show (Parry, 3 Oct).
                  const path = pagePanel.path;
                  setTimeout(() => setFrameReady(path), 120);
                }}
                style={
                  frameScale < 1
                    ? { width: `${100 / frameScale}%`, height: `${100 / frameScale}%`, transform: `scale(${frameScale})`, transformOrigin: "0 0" }
                    : undefined
                }
              />
              </>
              )}
            </div>
          </section>
        )}
      </div>
      {intro && (
        <PulseIntro
          pkg={pkg}
          growth={agent.growth === true}
          total={needs.get(graph.rootId)}
          onClose={() => setIntro(false)}
          onAsk={() => {
            setIntro(false);
            askInputRef.current?.focus();
          }}
          onMorning={() => {
            setIntro(false);
            void startMorningPulse();
          }}
          onGuide={() => {
            setIntro(false);
            setGuide(true);
          }}
        />
      )}
      {mp && (
        <MorningPulse
          key={mp.beats.map((b) => b.id).join(",")}
          beats={mp.beats}
          example={mp.example}
          onBeat={mpBeat}
          onTool={mpTool}
          onFinish={() => {
            setMp(null);
            goTo(graph.rootId);
            setClockOpen(true);
          }}
          onClose={() => setMp(null)}
        />
      )}
      {oneTour && <SignalsFilm film={ONE_TOUR_FILM} onClose={() => setOneTour(false)} onNext={{ label: "See the website film", open: () => { setOneTour(false); setWebFilm(true); } }} />}
      {webFilm && <SignalsFilm film={WEBSITE_FILM} onClose={() => setWebFilm(false)} />}
      {goTour && <SignalsFilm film={GO_TOUR_FILM} onClose={() => setGoTour(false)} onEnded={() => markFilm("b")} />}
      {reviewOpen && theReview ? <ReviewView review={theReview} read={thePulseRead} week={weekScore} demo={!live} onClose={() => setReviewOpen(false)} onCommit={commitThing} onChanged={refreshRoster} onAction={reviewAct} demoStore={reviewDemoStore} /> : null}
      {chOpen && focus.id === CHALLENGE_NODE && !tour ? (
        <ChallengeView
          data={shownChallenge}
          demo={!live}
          onData={(c) => {
            if (live) setChallenge(c);
          }}
          onCompleted={reloadChallenge}
          onOpenPage={(url) => {
            // The route's own link (on ONE MOVE): inside the Brain when that page is in its ONE MOVE menu.
            const path = new URL(url).pathname;
            const page = movePageId(path);
            if (ix.byId.has(page)) return goTo(page);
            window.open(url, "_blank", "noopener,noreferrer");
          }}
          onClose={() => setChOpen(false)}
        />
      ) : null}
      {goalsOpen ? (
        <GoalsView
          three={theGoals}
          goals={shownGoals.goals}
          map={shownGoals.income}
          today={todayIn()}
          demo={!live}
          rezenConnected={rezenOn}
          onSaveGoal={saveGoal}
          onSetStart={setGoalStart}
          onClosingLogged={() => Promise.all([refreshLive(), loadGoalsPlan()])}
          onProfile={() => {
            setGoalsOpen(false);
            goTo(movePageId("/profile"));
          }}
          onReferrals={() => (refs ? setRefsOpen(true) : goTo(REFERRALS_NODE))}
          referralsLine={refs ? yearLine(refs) : null}
          onPerson={(id) => {
            const page = movePageId("/contacts");
            if (!ix.byId.has(page)) return;
            setGoalsOpen(false);
            setContactOpen({ id, k: Date.now() });
            goTo(page);
          }}
          onPage={(path) => {
            setGoalsOpen(false);
            goPage(path);
          }}
          onForecast={shownGoals.forecast ? () => setForecastOpen(true) : undefined}
          onIncomeMap={theIncome ? () => setIncomeOpen(true) : undefined}
          deals={deals}
          hot={hotPeople}
          refs={refs}
          looks={looks}
          avgGci={shownGoals.income?.avgGci.value ?? forecastAvg.value}
          onAddDeal={() => {
            setGoalsOpen(false);
            if (deals) setDealsOpen("add");
            else goPage("/deals");
          }}
          onLooksHot={() => {
            setGoalsOpen(false);
            goTo(LOOKS_NODE);
          }}
          onClose={() => setGoalsOpen(false)}
        />
      ) : null}
      {growthOpen ? <GrowthView start={growthOpen} keys={growthChildren(growthState).map((c) => c.key)} live={live} onClose={() => setGrowthOpen(null)} /> : null}
      {powerOpen ? (
        <PowerHourView
          calls={calls}
          session={session}
          live={live}
          onSession={savePower}
          onTick={(ref, on) => {
            const item = theDay.touch.flatMap((b) => b.items ?? []).find((i) => i.ref === ref);
            return item ? tickTouch(item, on) : Promise.resolve(null);
          }}
          onClose={() => setPowerOpen(false)}
          contactCard={(contactId, name) => (
            <PersonPanel
              key={contactId}
              contactId={contactId}
              title={name}
              agentFirst={agent.firstName}
              onLeadOutcome={leadOutcome}
              onChanged={refreshLive}
              openContacts={() => {
                setPowerOpen(false);
                goTo(movePageId("/contacts"));
              }}
              onOpenPage={(path, query) => {
                setPowerOpen(false);
                setPageQuery({ path, query });
                goTo(movePageId(path));
              }}
            />
          )}
        />
      ) : null}
      {forecastOpen && shownGoals.forecast ? (
        <ForecastView
          f={shownGoals.forecast}
          avgFrom={(shownGoals.income?.avgGci.from ?? forecastAvg.from) === "you" ? "your number in the Income Map" : (shownGoals.income?.avgGci.from ?? forecastAvg.from) === "closings" ? "your average so far" : "a starting number: set yours in the Income Map"}
          demo={!live}
          onClose={() => setForecastOpen(false)}
        />
      ) : null}
      {incomeOpen && theIncome ? <IncomeMapView map={theIncome} assume={assume} kept={assumeKept} goals={withReferralCount(goalFacts(graph.nodes), refs)} demo={!live} onAssume={saveAssume} onSaveGoal={saveGoal} onClose={() => setIncomeOpen(false)} /> : null}
      {coachOpen && coached?.length && !agentRead ? <CoachView agents={coached} hour={denverHour()} demo={!live} onClose={() => setCoachOpen(false)} onPulse={readAgent} squad={team} /> : null}
      {rcOpen && rcAgents ? <ReviewCallsView agents={rcAgents} demo={!live} onClose={() => setRcOpen(false)} onSearch={loadRcAgents} /> : null}
      {warOpen && war ? <WarRoomView room={war} demo={!live} onClose={() => setWarOpen(false)} onTeamLeads={() => { setWarOpen(false); goTo(movePageId(TEAM_LEADS_PATH)); }} /> : null}
      {teamOpen && team ? <TeamView team={team} demo={!live && !productTour} scope={teamScope} onScope={live ? setTeamScope : undefined} onClose={() => setTeamOpen(false)} canAdd={teamSites.length > 0 || productTour} /> : null}
      {linkContact && !touchShown ? <ContactLinkView id={linkContact} demo={!live} onBack={() => setLinkContact(null)} onChanged={refreshRoster} /> : null}
      {aiOpen && askAi ? <AskAiView name={live ? askCheck?.name || agent.label.split(",")[0] : "Sarah Bennett"} area={askArea} results={askAi} demo={!live} deviceOnly={live && askDevice} onArea={saveArea} onMark={markAi} onClose={() => setAiOpen(false)} /> : null}
      {likelyOpen ? (
        <MoveLikelyView
          data={likely ?? emptyMoveLikely()}
          demo={!live}
          mlsMissing={mlsMissing}
          pastClients={pastClients}
          routeReason={likelyReasonWord}
          onNotUseful={likelyNotUseful}
          onProfile={() => {
            setLikelyOpen(false);
            goTo(movePageId("/profile"));
          }}
          onCall={likelyCall}
          onClose={() => setLikelyOpen(false)}
        />
      ) : null}
      {brokerOpen && broker ? <BrokerView broker={broker} demo={!live} now={Date.now()} onClose={() => setBrokerOpen(false)} /> : null}
      {dealsOpen && deals ? <DealsView deals={deals} today={todayIn()} demo={!live} onStatus={setDealStatus} onClientPage={setDealClientPage} onClose={() => setDealsOpen(false)} onAdded={dealAdded} startAdding={dealsOpen === "add"} /> : null}
      {lifeOpen && life ? <LifeUpcomingView data={life} demo={!live} onTask={lifeTask} onClose={() => setLifeOpen(false)} /> : null}
      {winsOpen && wins ? (
        <WinsView
          data={wins}
          fresh={[]}
          today={todayIn()}
          demo={!live}
          onClose={closeWins}
          onContact={(id) => {
            const page = movePageId("/contacts");
            if (!ix.byId.has(page)) return;
            closeWins();
            setContactOpen({ id, k: Date.now() });
            goTo(page);
          }}
        />
      ) : null}
      {partnersOpen && partners ? <PartnersView state={partners} me={weekScore} today={todayIn()} demo={!live} onClose={() => setPartnersOpen(false)} onAct={partnerAct} /> : null}
      {habitsOpen && theHabits.length ? <HabitsView habits={theHabits} demo={!live} onClose={() => setHabitsOpen(false)} onTick={tickHabit} onOwn={ownHabit} /> : null}
      {mqOpen ? <MarqueeView tool={mqOpen.tool} deck={mqOpen.deck} href={mqOpen.href} today={todayIn()} onClose={() => setMqOpen(null)} /> : null}
      {refsOpen && refs ? <ReferralsView onLogged={loadRefs} network={network} onNetwork={() => { setRefsOpen(false); goTo(movePageId("/referral-network")); }} data={refs} today={todayIn()} demo={!live} onClose={() => setRefsOpen(false)} onAsk={askReferral} onThank={thankReferral} onThanked={thankedReferral} onPerson={openReferralPerson} /> : null}
      {agentRead ? <PulseCoachView read={agentRead.read} who={agentRead.who} demo={!live} onClose={() => setAgentRead(null)} /> : null}
      {cmOpen && commitments && (
        <CommitmentsView initial={commitments} live={live} hour={denverHour()} onClose={() => setCmOpen(false)} onChanged={setCommitments} />
      )}
      {clockOpen && (
        <DayClock
          day={theDay}
          live={live}
          tellText={tellText}
          tomorrow={tomorrow}
          dated={graph.dated}
          vipsNoVideo={roster ? roster.vip50.filter((p) => !p.month?.video_text).length : undefined}
          commitments={commitments}
          titles={dayTitles}
          onOpenCalendar={(d) => {
            setClockOpen(false);
            setPageQuery({ path: "/calendar", query: `date=${d}` });
            openCalendar();
          }}
          onClose={() => {
            setClockOpen(false);
            setTellText(undefined);
          }}
          onTick={(refs, on) => refs.forEach((r) => tickDay(`day:${r}`, on))}
          onTouch={setTouchOpen}
          onClassic={() => {
            setClockOpen(false);
            setPlanOpen(true);
          }}
        />
      )}
      {touchShown ? <TouchPanel block={touchShown} demo={!live} covered={!!linkContact} onClose={() => setTouchOpen(null)} onTick={tickTouch} onContact={setLinkContact} /> : null}
      {/* a contact opened from the Power Hour's panel opens on top of it; Back returns to the panel */}
      {linkContact && touchShown ? <ContactLinkView id={linkContact} demo={!live} backLabel="Back to the Power Hour" onBack={() => setLinkContact(null)} onChanged={refreshRoster} /> : null}
      {planOpen && (
        <PlanMyDay
          today={graph.today ?? []}
          week={graph.week}
          live={live}
          onClose={() => setPlanOpen(false)}
          onGo={(id) => {
            setPlanOpen(false);
            goTo(id);
          }}
          onPage={(path) => {
            setPlanOpen(false);
            goPage(path);
          }}
          onSaved={setPlanned}
          onTick={(ref, on) => tickDay(`day:${ref}`, on)}
        />
      )}
      {addonsOpen && <AddonsPanel onClose={() => setAddonsOpen(false)} />}
      {gbpOpen && <GbpScreen demo={!live} onClose={closeGbp} />}
      {guide && (
        <SignalsFilm
          onClose={() => setGuide(false)}
          onEnded={() => markFilm("a")}
          onMeet={() => {
            setGuide(false);
            setIntro(true);
          }}
        />
      )}
    </div>
  );
}

/** The row's mark: the orb's own colour and count (red 27, yellow 3), a still green ring when all is good. */
function RowMark({ n, need }: { n: GraphNode; need: Need | undefined }) {
  const r = rowState(n, need);
  if (r.kind === "none") return null;
  if (r.kind === "ok") return <i className="row-mark ok" style={{ borderColor: ROW_COLOR.ok }} aria-label={r.label} title={r.label} />;
  if (r.kind === "opportunity") return <i className="rail-dot" style={{ background: ROW_COLOR.opportunity }} aria-label={r.label} title={r.label} />;
  return (
    <b className={`row-mark ${r.kind}`} style={{ background: ROW_COLOR[r.kind] }} aria-label={r.label} title={r.label}>
      {r.count}
    </b>
  );
}

function roleRank(r: string) {
  return { focus: 0, child: 1, related: 2, ancestor: 3, sibling: 4 }[r] ?? 5;
}

function productName(p: GraphNode["product"]) {
  return { one: "ONE", go: "ONE GO", move: "ONE MOVE", marquee: "Marquee", showly: "Showly", open: "ONE Open", growth: "ONE Growth" }[p];
}

function nodeLabel(n: GraphNode, role: string, hasChildren: boolean, need?: Need) {
  const parts = [n.label];
  if (n.secondaryLabel) parts.push(n.secondaryLabel);
  if (n.type === "core") {
    if (role === "focus") parts.push("about Pulse");
  } else if (need && !n.locked) parts.push(needWords(need, !hasChildren));
  else if (n.status && !n.locked) parts.push(STATUS[n.status].label);
  if (n.locked) parts.push("not in your package");
  if (role === "focus") parts.push("selected");
  else if (role === "ancestor") parts.push("go back up");
  else if (hasChildren) parts.push("open");
  return parts.join(", ");
}

function Stats({ stats, color, ticked = () => false, open }: { stats: { label: string; value: string }[]; color: string; ticked?: (label: string) => boolean; open?: Record<string, () => void> }) {
  const [hero, ...rest] = stats;
  const m = /^\s*(\d+)\s*\/\s*(\d+)/.exec(hero.value);
  return (
    <div className="stats">
      {(() => {
        const go = open?.[hero.label];
        const body = m ? (
          <div className="hero">
            <Ring value={Number(m[1])} max={Number(m[2])} color={color} />
            <div>
              <p className="hero-label">{hero.label}</p>
              <p className={`hero-value${ticked(hero.label) ? " tick" : ""}`}>{hero.value}</p>
            </div>
          </div>
        ) : (
          <div className="row">
            <span>{hero.label}</span>
            <b className={ticked(hero.label) ? "tick" : undefined}>{hero.value}</b>
          </div>
        );
        return go ? (
          <button type="button" className="row-open hero-open" onClick={go} aria-label={`${hero.label}: ${hero.value}, open`}>
            {body}
          </button>
        ) : (
          body
        );
      })()}
      {rest.map((s) => {
        const body = (
          <>
            <span className="row-label">
              <Icon kind={iconForText(s.label)} size={16} color="var(--text-2)" />
              {s.label}
            </span>
            <b className={ticked(s.label) ? "tick" : undefined}>{s.value}</b>
          </>
        );
        // A row with an orb behind it opens that orb (ONE MOVE's birthdays line opens Life events).
        return open?.[s.label] ? (
          <button type="button" className="row row-open" key={s.label} onClick={open[s.label]} aria-label={`${s.label}: ${s.value}, open`}>
            {body}
          </button>
        ) : (
          <div className="row" key={s.label}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

function Ring({ value, max, color }: { value: number; max: number; color: string }) {
  const r = 30, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, value / max));
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden="true">
      <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(79,127,224,0.45)" strokeWidth="7" />
      <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} transform="rotate(-90 38 38)" />
    </svg>
  );
}

const PRODUCT_HREF: Partial<Record<GraphNode["product"], string>> = {
  move: "https://move.vip50one.com",
  // ENTITLEMENT §6b: into ONE Open, Marquee and Showly through the one sign-in hop.
  marquee: goHref("marquee"),
  open: goHref("vip-open"),
  showly: goHref("showly"),
};

function clip(t: string, n: number) {
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
}

function cleanName(label: string) {
  return label.replace(/^(Call|Text|Face-to-face:|Send note to|Social touch:)\s*/i, "");
}

function initialsOf(label: string) {
  return cleanName(label).replace(/^the\s+/i, "").split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

// Good morning / afternoon / evening, by the agent's day (Mountain time for now).
function greeting(now = new Date()): string {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", hour: "numeric", hourCycle: "h23" }).format(now));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
