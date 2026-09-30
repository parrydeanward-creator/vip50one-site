import { tree, type Add } from "./go.ts";

// ONE MOVE in depth, modelled on vip50-web-crm main (read 30 Sep): the app's
// own areas and labels (Contacts tiers and smart lists, VIP Management, Touch
// Audit, Mixer with RSVPs, Newsletter, Action Plans, Hot/Warm/Cold, "Your
// relationships are producing"). "Fully touched" follows Parry's rule (30 Sep):
// all five monthly touches; face-to-face, note and drop-by count per quarter.
// Numbers and names are a made-up agent's.

export function addMove(add: Add) {
  tree(
    add,
    "move",
    [
      {
        id: "move-3",
        label: "Follow-ups",
        sub: "4 overdue",
        status: "action",
        summary: "Tasks past their day. Log the touch and the task closes itself.",
        kids: [
          { id: "mv-f1", label: "Call back Rosa Diaz", sub: "3 days overdue", type: "task", status: "action" },
          { id: "mv-f2", label: "Send CMA to the Hendersons", sub: "2 days overdue", type: "task", status: "action" },
          { id: "mv-f3", label: "Text Priya Shah", sub: "Yesterday", type: "task", status: "attention" },
          { id: "mv-f4", label: "Check in with Luis Ortega", sub: "Yesterday", type: "task", status: "attention" },
        ],
      },
      {
        id: "move-4",
        label: "New to sort",
        sub: "3 from Saturday",
        status: "attention",
        summary: "Visitors from Saturday's open house, tagged open-house. They are not in your VIP-50; ONE suggests a follow-up and you decide.",
        kids: [
          { id: "mv-n1", label: "Kim Reyes", sub: "open-house · 5 stars", type: "person", status: "opportunity" },
          { id: "mv-n2", label: "Sam Patel", sub: "open-house · neighbor", type: "person" },
          { id: "mv-n3", label: "Jordan Lee", sub: "open-house", type: "person" },
        ],
      },
      {
        id: "move-1",
        label: "Touch Audit",
        sub: "68% fully touched",
        status: "attention",
        summary: "September, VIP-50 only. Fully touched = call, video text, social, newsletter and mixer invite all done this month.",
        stats: [{ label: "Fully touched", value: "32 / 47" }, { label: "Partly touched", value: "12" }, { label: "Untouched", value: "3" }],
        kids: [
          { id: "mv-t-call", label: "Phone Call", sub: "41 / 47" },
          { id: "mv-t-video", label: "Video Text", sub: "38 / 47", status: "attention" },
          { id: "mv-t-social", label: "Social Media", sub: "44 / 47" },
          { id: "mv-t-news", label: "Newsletter", sub: "47 / 47", status: "healthy" },
          { id: "mv-t-mixer", label: "Mixer Invite", sub: "40 / 47" },
          { id: "mv-t-quarter", label: "This quarter", sub: "Face-to-Face · Note · Drop-By" },
        ],
      },
      {
        id: "move-0",
        label: "Contacts",
        sub: "1,284 contacts",
        summary: "Everyone you know. The VIP-50 lives in ONE GO too; everyone else lives here.",
        kids: [
          { id: "mv-c-vip50", label: "VIP-50", sub: "47" },
          { id: "mv-c-vip100", label: "VIP-100", sub: "38" },
          { id: "mv-c-clients", label: "Past clients", sub: "112" },
          { id: "mv-c-new", label: "New leads", sub: "6" },
          { id: "mv-c-cold", label: "No contact 30d", sub: "41", status: "attention" },
        ],
      },
      {
        id: "move-2",
        label: "VIP Management",
        sub: "47 / 50 slots",
        summary: "Who sits in your VIP-50. Most overdue first.",
        kids: [
          { id: "mv-v-reserve", label: "VIP-100 · Your Reserve", sub: "38 to promote from" },
          { id: "mv-v-cands", label: "VIP-50 candidates", sub: "5 past clients", status: "opportunity" },
        ],
      },
      {
        id: "move-5",
        label: "Mixer",
        sub: "Oct 16 · 12 yes",
        summary: "Fall Client Mixer. Guests RSVP from the invite.",
        stats: [{ label: "Yes", value: "12" }, { label: "Maybe", value: "5" }, { label: "No", value: "3" }],
        kids: [
          { id: "mv-m-event", label: "Fall Client Mixer", sub: "Thu Oct 16 · The Grove", type: "event" },
          { id: "mv-m-rsvp", label: "RSVPs this month", sub: "12 yes · 5 maybe · 3 no" },
        ],
      },
      {
        id: "move-6",
        label: "Newsletter",
        sub: "2 failed to send",
        status: "attention",
        kids: [
          { id: "mv-nl-sep", label: "September", sub: "85 sent · 2 failed", status: "attention" },
          { id: "mv-nl-oct", label: "October", sub: "Draft" },
        ],
      },
      {
        id: "move-7",
        label: "Action Plans",
        sub: "3 active",
        kids: [
          { id: "mv-ap-oh", label: "Open House Follow-Up", sub: "3 enrolled" },
          { id: "mv-ap-closed", label: "Just Closed", sub: "1 enrolled" },
          { id: "mv-ap-vip", label: "Welcome to VIP-50", sub: "2 enrolled" },
        ],
      },
      {
        id: "move-8",
        label: "Your relationships are producing",
        sub: "9 referrals this year",
        status: "healthy",
        stats: [{ label: "Referrals this year", value: "9" }, { label: "Closed deals", value: "4" }, { label: "Referral GCI", value: "$38,400" }],
      },
      {
        id: "move-9",
        label: "Hot/Warm/Cold",
        sub: "4 hot",
        kids: [
          { id: "mv-h-hot", label: "Hot", sub: "4 · 1-3 months" },
          { id: "mv-h-warm", label: "Warm", sub: "11 · 3-12 months" },
          { id: "mv-h-cold", label: "Cold", sub: "23 · 12+ months" },
        ],
      },
    ],
    "move",
  );
}
