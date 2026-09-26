/**
 * Coach Interview — questions that draw out Ryan's coaching voice for the Parent Guide.
 *
 * This is the editable source for interview questions. Each section maps to a
 * Parent Guide lesson (see src/config/parentEducation.ts). Add, remove, or
 * reword questions here. Answers are stored in data/coach-interview.json.
 *
 * The point of these questions: get Ryan talking the way he talks on the gym
 * floor. No rewriting his answers into something that doesn't sound like him.
 */

export type InterviewQuestion = {
  id: string
  question: string
  hint?: string
}

export type InterviewSection = {
  lessonId: string
  lessonTitle: string
  intro: string
  questions: InterviewQuestion[]
}

export const COACH_INTERVIEW: InterviewSection[] = [
  {
    lessonId: 'what-progress-looks-like',
    lessonTitle: 'What Progress Looks Like',
    intro: 'How you see progress beyond the landing.',
    questions: [
      {
        id: 'progress-beyond-landing',
        question:
          'When a parent only asks about what new skill their kid got, what do you wish they understood about progress?',
        hint: 'Say it like you would on the gym floor.',
      },
      {
        id: 'quiet-improvements',
        question:
          'What are the quiet improvements you notice in an athlete that parents usually miss?',
      },
      {
        id: 'progress-question',
        question:
          'What is a question a parent could ask their athlete after practice that would actually tell them something useful?',
      },
    ],
  },
  {
    lessonId: 'why-still-working-on-basics',
    lessonTitle: 'Lesson 1: Why Are We Still Working on Basics?',
    intro: 'Perfection before progression — the order skills get built.',
    questions: [
      {
        id: 'basics-parent-asks',
        question:
          'A parent asks: "Why is my kid still doing handstands when they want to learn a back tuck?" What do you tell them?',
      },
      {
        id: 'basics-unlocked-skill',
        question:
          'Tell me about a time a basic unlocked a harder skill for one of your athletes. What was the basic, what was the skill, what changed?',
        hint: 'A real story beats an explanation.',
      },
      {
        id: 'perfection-before-progression',
        question: 'What does "perfection before progression" mean in your coaching? When did you learn that?',
      },
    ],
  },
  {
    lessonId: 'doing-it-once-vs-owning-it',
    lessonTitle: 'Lesson 2: Doing It Once and Owning It',
    intro: 'First landing versus true ownership.',
    questions: [
      {
        id: 'once-vs-owning',
        question:
          'How do you explain the difference between landing something once and actually owning it?',
      },
      {
        id: 'first-landing-parent',
        question:
          'A kid just landed a new skill and the parent immediately wants them competing it or moving up. What do you say?',
      },
      {
        id: 'stages-in-your-words',
        question:
          'Walk me through the stages an athlete goes through learning a skill, in your own words. What does each stage look like from where you stand?',
      },
    ],
  },
  {
    lessonId: 'why-not-just-try-the-skill',
    lessonTitle: 'Lesson 3: Why Doesn’t the Coach Just Let Them Try It?',
    intro: 'Why a drill instead of the full skill.',
    questions: [
      {
        id: 'drill-decision',
        question:
          'When you choose a drill instead of letting them throw the full skill, what are you seeing that makes that call?',
      },
      {
        id: 'specific-explanation',
        question:
          'Give me an example of a specific explanation you have given a parent about what you are building and why. The more concrete the better.',
      },
      {
        id: 'more-attempts',
        question: 'What do you think when you hear "they just need more reps of the full skill"?',
      },
    ],
  },
  {
    lessonId: 'small-habits-big-skills',
    lessonTitle: 'Lesson 4: Small Habits Build Big Skills',
    intro: 'Progress, not perfection — the athlete’s mindset.',
    questions: [
      {
        id: 'useful-homework',
        question:
          'What does useful homework look like? And when does homework cross the line into pressure?',
      },
      {
        id: 'progress-not-perfection',
        question: 'What does "progress, not perfection" mean to you as the mindset you want in your athletes?',
      },
      {
        id: 'one-small-thing',
        question:
          'If a parent asked you "what is the one small thing my kid should focus on this week," how do you come up with the answer?',
      },
    ],
  },
  {
    lessonId: 'time-to-move-up',
    lessonTitle: 'Lesson 5: How Do We Know It Is Time to Move Up?',
    intro: 'Your actual move-up criteria.',
    questions: [
      {
        id: 'move-up-criteria',
        question:
          'What are your actual criteria for moving an athlete up a class? Name the two or three things they have to show you.',
        hint: 'This replaces the placeholder in the Parent Guide.',
      },
      {
        id: 'delayed-move-up',
        question:
          'How do you explain to a parent that their kid is not ready to move up yet, without it feeling like bad news?',
      },
      {
        id: 'ready-looks-like',
        question: 'What does "ready for the next class" actually look like to you on the floor?',
      },
    ],
  },
  {
    lessonId: 'when-a-skill-feels-scary',
    lessonTitle: 'Lesson 6: When a Skill Suddenly Feels Scary',
    intro: 'Fear, hesitation, and getting it back.',
    questions: [
      {
        id: 'skill-goes-away',
        question:
          'An athlete who could do a skill suddenly can’t. Walk me through what you do, and what you tell the parent.',
      },
      {
        id: 'fear-parents',
        question: 'What do you wish parents understood about fear in this sport?',
      },
      {
        id: 'small-wins',
        question: 'What does rebuilding confidence look like day to day? Give me a real example if you have one.',
      },
    ],
  },
  {
    lessonId: 'what-to-praise',
    lessonTitle: 'Lesson 7: What Should I Praise After Practice?',
    intro: 'The car ride home.',
    questions: [
      {
        id: 'car-ride-home',
        question: 'What should a parent say in the car ride home? What should they not say?',
      },
      {
        id: 'worth-beyond-performance',
        question: 'How do you keep an athlete’s sense of worth separate from whether they landed something that day?',
      },
    ],
  },
  {
    lessonId: 'plateaus-are-information',
    lessonTitle: 'Lesson 8: Plateaus Are Information',
    intro: 'When progress stalls.',
    questions: [
      {
        id: 'plateau-process',
        question:
          'When an athlete plateaus, what is your process for figuring out what is actually stuck?',
      },
      {
        id: 'plateau-parent',
        question: 'What do you tell the parent of an athlete who has been in the same place for a while?',
      },
      {
        id: 'plateau-story',
        question: 'Tell me about a plateau that taught you something. What was stuck, and what unlocked it?',
      },
    ],
  },
  {
    lessonId: 'choosing-a-class',
    lessonTitle: 'Lesson 9: Choosing a Class That Serves the Athlete',
    intro: 'Matching the class to the athlete.',
    questions: [
      {
        id: 'choosing-class',
        question: 'How do you help a parent choose the right class for their athlete?',
      },
      {
        id: 'class-purpose',
        question: 'What do you wish parents knew about what your different classes are actually for?',
      },
      {
        id: 'faster-not-better',
        question: 'What do you say to the parent who thinks the faster or harder class is automatically better?',
      },
    ],
  },
]
