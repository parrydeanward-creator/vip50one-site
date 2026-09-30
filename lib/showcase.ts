// Product showcase films (Parry, 30 Sep): each product's own screens on the
// device it runs on, with ONE Brain scenes between. The step data lives here
// so it can be tested; the screens are in components/film/.

export interface ShowStep {
  id: string;
  device: "phone" | "tablet" | "laptop" | "brain";
  screen: string; // which screen the product renders
  image?: string; // brain scenes: a still of the ONE Brain dashboard
  kicker: string;
  title: string;
  line: string;
  coming?: boolean;
  ms: number;
}

export const totalShowMs = (steps: ShowStep[]) => steps.reduce((t, s) => t + s.ms, 0);

// ONE Open: features read in vip-open main, 30 Sep. The hand-off of visitors
// into ONE MOVE waits on the event contract, so it says Coming.
export const OPEN_STEPS: ShowStep[] = [
  { id: "splash", device: "phone", screen: "splash", kicker: "ONE Open", title: "Every open house, from sign-in to signed.", line: "Plan it, host it, follow up, and turn visitors into clients.", ms: 4200 },
  { id: "brain", device: "brain", screen: "brain", image: "/film/brain-open.png", kicker: "ONE Brain", title: "ONE Open lives inside ONE Brain.", line: "Plan, Prepare, Host and Follow Up, next to the rest of your business.", ms: 5000 },
  { id: "home", device: "phone", screen: "home", kicker: "Home", title: "Open it and see what needs you.", line: "The next open house, what's left to prepare, and what slipped.", ms: 5000 },
  { id: "prep", device: "phone", screen: "prep", kicker: "Prepare", title: "Every task on its own clock.", line: "MLS live 72 hours before. Flyers, QR sign-in sheets, the kit. Tick them off.", ms: 5200 },
  { id: "neighbors", device: "phone", screen: "neighbors", kicker: "Neighbors", title: "Invite the whole street first.", line: "The Exclusive Neighborhood Tour. RSVPs come in, and who wants a home value.", ms: 5000 },
  { id: "kiosk", device: "tablet", screen: "kiosk", kicker: "Host", title: "Every visitor signs in at the door.", line: "Name, phone, email, when they're hoping to move. Then: next guest.", ms: 5600 },
  { id: "live", device: "phone", screen: "live", kicker: "Host live", title: "Watch your open house in real time.", line: "Visitors, neighbors, hot leads, appointments. Safety check-in on.", ms: 5000 },
  { id: "rate", device: "phone", screen: "rate", kicker: "Rate & notes", title: "Five stars means call first.", line: "Rate every visitor, flag the hot ones, jot what they said.", ms: 4800 },
  { id: "attack", device: "phone", screen: "attack", kicker: "Follow-Up Attack", title: "The follow-up is already planned.", line: "Day 0-1, days 2-7, weeks 2-4. Plus three emails that stop the moment they book.", ms: 5600 },
  { id: "reports", device: "phone", screen: "reports", kicker: "Reports", title: "Send the seller report in one tap.", line: "Visitors, hot leads, feedback and pipeline GCI from this open house.", ms: 4800 },
  { id: "score", device: "phone", screen: "score", kicker: "Scorecard", title: "Your business-building machine.", line: "Open houses to conversations to clients to referrals. Week after week.", ms: 5000 },
  { id: "flow", device: "brain", screen: "brain", image: "/film/brain-home.png", kicker: "Connected", coming: true, title: "Visitors flow into ONE MOVE, tagged.", line: "Never into your VIP-50. ONE suggests the follow-up; you decide.", ms: 5000 },
  { id: "outro", device: "phone", screen: "score", kicker: "", title: "", line: "", ms: 5200 },
];

// Showly: features read in showly main, 30 Sep. Answers are Yes / Maybe / No.
export const SHOWLY_STEPS: ShowStep[] = [
  { id: "splash", device: "phone", screen: "splash", kicker: "Showly", title: "Every buyer tour, captured.", line: "Show the homes. Showly writes the recap. Your buyer answers.", ms: 4200 },
  { id: "brain", device: "brain", screen: "brain", image: "/film/brain-showly.png", kicker: "ONE Brain", title: "Showly lives inside ONE Brain.", line: "Every tour and every answer, next to the rest of your business.", ms: 5000 },
  { id: "tours", device: "phone", screen: "tours", kicker: "Your tours", title: "One tour per showing day.", line: "Start it in the car. Add homes as you go.", ms: 4600 },
  { id: "sheet", device: "phone", screen: "sheet", kicker: "Capture", title: "Snap the listing sheet. Showly reads it.", line: "Address, price, beds, baths and square feet, filled in for you.", ms: 5200 },
  { id: "voice", device: "phone", screen: "voice", kicker: "Voice note", title: "Talk while you walk through.", line: "Record what they said, with their okay. Tap what they liked and what worried them.", ms: 5200 },
  { id: "draft", device: "phone", screen: "draft", kicker: "Write-up", title: "Showly drafts the write-up.", line: "You read it before anything goes to your buyer.", ms: 4800 },
  { id: "recap", device: "phone", screen: "recap", kicker: "The recap", title: "One recap for the whole tour.", line: "Every home, photos and notes. Publish and send, by text.", ms: 4800 },
  { id: "answer", device: "phone", screen: "answer", kicker: "Your buyer", title: "They answer on every home.", line: "Yes, maybe or no, and a note. Right from the recap.", ms: 5200 },
  { id: "back", device: "phone", screen: "back", kicker: "What came back", title: "See their answers the moment they land.", line: "And who hasn't opened the recap yet.", ms: 4800 },
  { id: "learn", device: "phone", screen: "learn", kicker: "Your buyer", title: "Learn what they want, tour after tour.", line: "What they're telling you, and what they're approved to.", ms: 5000 },
  { id: "letter", device: "phone", screen: "letter", kicker: "Pre-approval", title: "Ask the lender for a letter, from the home.", line: "See the moment it's ready. Your lender never sees your notes.", ms: 5000 },
  { id: "flow", device: "brain", screen: "brain", image: "/film/brain-home.png", kicker: "Connected", coming: true, title: "Their answers reach ONE.", line: "A Yes on a home becomes ONE's next best step for you.", ms: 5000 },
  { id: "outro", device: "phone", screen: "back", kicker: "", title: "", line: "", ms: 5200 },
];

// ONE MOVE: features read in vip50-web-crm main, 30 Sep. It runs in the
// browser, so it is shown on a laptop. Open house visitors and tour buyers
// arriving tagged waits on the event contract, so it says Coming.
export const MOVE_STEPS: ShowStep[] = [
  { id: "splash", device: "laptop", screen: "splash", kicker: "ONE MOVE", title: "Every relationship, working for you.", line: "Your whole database, and the AI that tells you who to talk to next.", ms: 4200 },
  { id: "brain", device: "brain", screen: "brain", image: "/film/brain-move.png", kicker: "ONE Brain", title: "ONE MOVE lives inside ONE Brain.", line: "Your people, your pipeline and your touches, next to the rest of your business.", ms: 5000 },
  { id: "brief", device: "laptop", screen: "brief", kicker: "Intelligence brief", title: "Your morning brief, written for you.", line: "Who's heating up, who's gone quiet, and who to call first.", ms: 5800 },
  { id: "next", device: "laptop", screen: "next", kicker: "What's my next move?", title: "Ask. ONE answers, and drafts the words.", line: "A talk track for the call or the text. Send it, then log it in one click.", ms: 5600 },
  { id: "board", device: "laptop", screen: "board", kicker: "Relationships", title: "Move people up, one stage at a time.", line: "New Connection to VIP-50 to Mayor's Circle. Drop someone on VIP-50 and their onboarding plan starts.", ms: 5800 },
  { id: "touch", device: "laptop", screen: "touch", kicker: "Touch Audit", title: "See every VIP's touches for the month.", line: "Five monthly, three quarterly. Log one in a click. Nobody slips.", ms: 5200 },
  { id: "mixer", device: "laptop", screen: "mixer", kicker: "Mixer Hub", title: "Design the mixer invite with AI.", line: "Three concepts in seconds. Refine it, send it by text or email, watch the RSVPs.", ms: 5600 },
  { id: "news", device: "laptop", screen: "news", kicker: "Newsletter", title: "A newsletter in minutes, not hours.", line: "Market numbers pulled in. Fill the rest with AI. You press send.", ms: 5400 },
  { id: "pages", device: "laptop", screen: "pages", kicker: "Landing pages", title: "Pages that bring you leads.", line: "Home value, buyer guide, open house sign-in. Every lead lands tagged and on a plan.", ms: 5200 },
  { id: "plans", device: "laptop", screen: "plans", kicker: "Action Plans", title: "Follow-up that runs itself.", line: "Emails, texts and tasks on a schedule you set once.", ms: 5000 },
  { id: "calendar", device: "laptop", screen: "calendar", kicker: "Calendar", title: "Gold is money time.", line: "Time-block the week and see where your hours really went.", ms: 5000 },
  { id: "report", device: "laptop", screen: "report", kicker: "Market report", title: "Their neighborhood's numbers, every month.", line: "Subscribe a client to their neighborhood. On the 1st they get its sales and prices, from you.", ms: 5000 },
  { id: "flow", device: "brain", screen: "brain", image: "/film/brain-home.png", kicker: "Connected", coming: true, title: "Visitors and buyers arrive in ONE MOVE.", line: "From ONE Open and Showly, tagged by where they came from. Never into your VIP-50 on their own.", ms: 5400 },
  { id: "outro", device: "laptop", screen: "board", kicker: "", title: "", line: "", ms: 5200 },
];

// Marquee: features read in marquee-app main, 30 Sep. Posting straight to
// Instagram and Facebook waits on Meta's review, so it says Coming. Nothing
// posts unless the agent approved the piece and turned scheduled posting on.
export const MARQUEE_STEPS: ShowStep[] = [
  { id: "splash", device: "laptop", screen: "splash", kicker: "Marquee", title: "Every listing, marketed like a luxury listing.", line: "Win it, launch it, host it, report on it. Marquee builds the campaign.", ms: 4200 },
  { id: "brain", device: "brain", screen: "brain", image: "/film/brain-marquee.png", kicker: "ONE Brain", title: "Marquee lives inside ONE Brain.", line: "Every listing and every campaign, next to the rest of your business.", ms: 5000 },
  { id: "present", device: "laptop", screen: "present", kicker: "Win the listing", title: "Walk in with the presentation built.", line: "Eight pages, and comparable sales that are yours, not ours.", ms: 5400 },
  { id: "walk", device: "phone", screen: "walk", kicker: "Walkthrough", title: "Walk the home room by room.", line: "Notes and photos on your phone, as you go.", ms: 5000 },
  { id: "build", device: "laptop", screen: "build", kicker: "Won it", title: "Add the address and photos. Marquee builds the rest.", line: "About ten minutes from you. About an hour later, a text: it's ready.", ms: 5400 },
  { id: "campaign", device: "laptop", screen: "campaign", kicker: "Your campaign", title: "Your campaign, already built.", line: "Packet, flyer, open house kit, social, reel, sphere outreach and a calendar.", ms: 6000 },
  { id: "reel", device: "phone", screen: "reel", kicker: "Reel", title: "A reel ready to post.", line: "Fifteen seconds, made from your photos. Read it, approve it.", ms: 5000 },
  { id: "posting", device: "laptop", screen: "posting", kicker: "Posting", title: "You approve. You switch it on.", line: "Scheduled posting is off until you turn it on. Anything missed is never posted late.", ms: 5600 },
  { id: "social", device: "laptop", screen: "social", kicker: "Instagram and Facebook", coming: true, title: "Straight to your feed.", line: "Posting to Instagram and Facebook from Marquee, once Meta approves it.", ms: 4600 },
  { id: "door", device: "phone", screen: "door", kicker: "Open house", title: "The door does the sign-in.", line: "Room cards with QR codes. Every sign-in ranked hot, warm or cool.", ms: 5200 },
  { id: "live", device: "phone", screen: "live", kicker: "Seller live", title: "Let your seller watch it live.", line: "Who's in, which rooms they're in, and what they're asking.", ms: 5400 },
  { id: "recap", device: "phone", screen: "recap", kicker: "Recap", title: "Tell your seller how it went. One tap.", line: "The numbers and the comments, written up and ready.", ms: 5000 },
  { id: "report", device: "laptop", screen: "report", kicker: "Weekly report", title: "Six answers. The seller report writes itself.", line: "A Friday text asks six quick questions. Marquee turns your answers into the report.", ms: 5400 },
  { id: "home", device: "laptop", screen: "home", kicker: "Home", title: "Three things need you this week.", line: "About twelve minutes in all. Marquee does the rest.", ms: 5000 },
  { id: "outro", device: "laptop", screen: "campaign", kicker: "", title: "", line: "", ms: 5200 },
];
