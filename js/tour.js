/* The quick tour: what each step says. The numbers come from the same constants the app uses,
   so the tour never drifts from how XP, streaks, and earned skills really work. */

import { XP, STREAK_MIN } from "./xp.js";
import { EARNED_AT } from "./stats.js";
import { SLOTS } from "./plan.js";

/* Each step: id, title, lead (one sentence), demo (a picture drawn in ui/tour.js), and points ({ b: bold start, t: the rest }). */
export const TOUR_STEPS = [
  {
    id: "loop",
    title: "Plan, skate, grow",
    lead: "MySkate is your practice notebook for the rink. Every visit goes the same way.",
    demo: "loop",
    points: [
      { b: "Plan", t: "what you will work on, before you step on the ice." },
      { b: "Skate", t: "with a clock and a rating for each skill. It works well on a phone at the rink." },
      { b: "Grow", t: "by watching your XP, levels, streak, and blade life build up." },
    ],
  },
  {
    id: "ice",
    title: "Find your ice time",
    lead: "Open the Ice tab to see every rink's sessions together, for the whole week.",
    demo: "ice",
    points: [
      { b: "Add your rinks and their sessions once.", t: "Pick the type, the days, and the times. Or upload the rink's calendar file (.ics), and upload a newer one later to update." },
      { b: "Star the ones you want.", t: "Switch to My picks to see only those, or filter by type and rink." },
      { b: "Tap a session, then Plan this", t: "to set your ice slot to its length." },
      { b: "Check the rink before you go.", t: "MySkate only knows what you put in, and rinks change their schedules." },
    ],
  },
  {
    id: "plan",
    title: "Plan your session",
    lead: "Open the Plan tab at home or on the way to the rink.",
    demo: "plan",
    points: [
      { b: "Pick your ice slot.", t: `Tap ${SLOTS.slice(0, -1).join(", ")}, or ${SLOTS[SLOTS.length - 1]} minutes. Booked something else? Type your own.` },
      { b: "Tap skills to add them.", t: "MySkate suggests what to try next from your level and what still needs work." },
      { b: "Check the plan.", t: "Your slot is shared evenly between the skills. Move one earlier or later, or take it out." },
      { b: "Set goals and add homework.", t: "Tap Add a goal for a skill, a rating, and a day, or Add homework for what your coach asks you to work on." },
    ],
  },
  {
    id: "compete",
    title: "Plan a competition",
    lead: "Open Competitions from Home or Plan to plan the skate for an event.",
    demo: "compete",
    points: [
      { b: "Add the competition.", t: "Tap New competition for its day and place, and MySkate counts down. Add its day, from check-in to awards, and a list of what to bring." },
      { b: "Make a program.", t: "Tap New program for your music, its length, and your elements. You can choose some from your own skills." },
      { b: "Lay it out, then set it to the music.", t: "Place each element on the rink. Then give each a start and a length, and tap Run it through to practice with a clock." },
      { b: "Write down how it went.", t: "After the event, record your placing, how each element went, and what your coach said. You can share a poster of the program too." },
      { b: "Your event's rules come first.", t: "MySkate keeps your plan, not the rules. Check them and ask your coach." },
    ],
  },
  {
    id: "skate",
    title: "On the ice",
    lead: "Open the Skate tab at the rink and tap Start session.",
    demo: "skate",
    points: [
      { b: "The clock counts only your time on ice.", t: "Tap pause when you rest." },
      { b: "Rate each skill with one to five skates.", t: `Tap the same skate again to clear it. ${EARNED_AT} skates or more earns the skill.` },
      { b: "Count jump tries.", t: "Tap + Landed or + Missed each time. Slipped? Tap Undo last try." },
      { b: "Move on.", t: "Tap Next skill. Add a note any time about what felt good or what to fix." },
    ],
  },
  {
    id: "finish",
    title: "Finish and watch it grow",
    lead: "When you step off the ice, tap End session.",
    demo: "grow",
    points: [
      { b: "Save the session.", t: "You see what you earned first, and can add what the ice cost. Keep skating if you ended too soon, or discard it." },
      { b: "XP rewards effort.", t: `${XP.session} XP for each session, ${XP.perMinute} per minute on ice, ${XP.perSkill} for each skill you practice, and ${XP.personalBest} for a new personal best.` },
      { b: "Close a figure eight each week.", t: `Each session you save traces one loop of the eight on Home. Skate ${STREAK_MIN} or more times in a week to close it, week after week, for bonus XP.` },
      { b: "See it all on Progress.", t: "Hours by week, what the ice costs, a practice calendar, every skill and session, an off-ice log (tap Log off-ice work on the Sessions tab), your progress toward a test on the Tests tab, a board of you and your friends on the Friends tab, and a trophy case on the Badges tab you can share from." },
    ],
  },
  {
    id: "blade",
    title: "Blade life",
    lead: "Blades go dull. MySkate keeps count so you know when to sharpen.",
    demo: "blade",
    points: [
      { b: "It adds up your time on ice.", t: "Every session you save counts toward the hours on your blades." },
      { b: "Set your own number.", t: "Most skaters sharpen after 20 to 35 hours. Tap the pencil on the Blade life tile on Home to change it." },
      { b: "Just sharpened?", t: "Tap I just got them sharpened and the count starts again." },
    ],
  },
  {
    id: "data",
    title: "Your data stays with you",
    lead: "There are no accounts. Everything is saved in this browser, on this device.",
    demo: "data",
    points: [
      { b: "Save a backup now and then.", t: "Open Me and tap Save a backup. The file keeps your progress safe and moves it to a new phone. You can lock it with a passphrase." },
      { b: "Restore it", t: "from the same screen. You choose whether to merge it with what is here or replace it." },
      { b: "Need this tour again?", t: "Open Me and tap Show me how MySkate works." },
    ],
  },
];
