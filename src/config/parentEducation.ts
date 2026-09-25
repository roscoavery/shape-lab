/**
 * Parent Guide — Ryan's coaching voice for parents.
 *
 * This is the single editable source for parent education copy. Each article
 * is a short readable page. Edit titles, summaries, and body paragraphs here.
 *
 * The previous placeholder articles are archived (not rendered) at
 * docs/parent-learn-topics-archive.md so their topics are not lost.
 *
 * Style: plainspoken, no em-dashes, no filler. A coach talking to a parent.
 */

export type ParentEducationCategory = 'guide'

export type ParentEducationArticle = {
  id: string
  category: ParentEducationCategory
  title: string
  summary: string
  body: string[]
}

export const PARENT_EDUCATION_CATEGORIES: { id: ParentEducationCategory; label: string }[] = [
  { id: 'guide', label: 'Parent Guide' },
]

export const PARENT_EDUCATION: ParentEducationArticle[] = [
  {
    id: 'what-progress-looks-like',
    category: 'guide',
    title: 'What Progress Looks Like',
    summary: 'A new skill is one moment in a longer process.',
    body: [
      'Landing a new skill is exciting. It is also one moment in a longer process. Before that landing, your athlete learned shapes, built strength, figured out timing, and practiced pieces with support. After that landing, there is still work to do. Control and consistency come next.',
      'Our goal is athletes who understand their skills and can use them with confidence. We celebrate the first landing. We also celebrate the quieter improvements that help future skills grow.',
      'Try asking: "What felt more controlled today?" Or: "What did you understand better?"',
      'Things you might notice: better body positions, steadier basics, improved control, your athlete explaining a correction in their own words, or confidence with a smaller step.',
    ],
  },
  {
    id: 'why-still-working-on-basics',
    category: 'guide',
    title: 'Lesson 1: Why Are We Still Working on Basics?',
    summary: 'Handstands, hollows, lunges, and landings show up inside harder skills.',
    body: [
      'A handstand, hollow shape, lunge, lever, or strong landing can look simple next to a flip. But these positions appear throughout harder skills. When an athlete can recognize and control them, the coach has more to build on.',
      'Repeating a basic does not mean starting over. Sometimes a small change in a familiar movement gives the athlete the missing piece for a skill they have been chasing.',
      'That is perfection before progression. We build the shapes first, in order, so the skill has something solid to stand on.',
      'Try asking: "Show me what changed in your handstand today."',
    ],
  },
  {
    id: 'doing-it-once-vs-owning-it',
    category: 'guide',
    title: 'Lesson 2: Doing It Once and Owning It',
    summary: 'Four stages of learning a skill, from first idea to true ownership.',
    body: [
      'Skills move through four stages. They do not always move in a straight line.',
      'Introduction. The athlete learns the idea, the key shapes, and watches demonstrations. The coach builds understanding and trust.',
      'Approximation. The athlete works on drills, modified versions, supported attempts, and pieces of the movement.',
      'Acquisition. The athlete performs the skill in a controlled practice setting and builds more reliable technique and control.',
      'Mastery. The athlete performs the skill confidently and consistently across appropriate settings, with greater independence.',
      'A first landing deserves celebration. It does not automatically mean the athlete is ready to perform the skill anywhere, connect it to another skill, or move to the next class.',
      'An athlete\u2019s needs can change after time away, a growth spurt, an injury, or a loss of confidence.',
      'Try asking: "That was a great first landing. What are you working on to make it feel consistent?"',
    ],
  },
  {
    id: 'why-not-just-try-the-skill',
    category: 'guide',
    title: 'Lesson 3: Why Doesn\u2019t the Coach Just Let Them Try It?',
    summary: 'A drill targets the piece that needs work. More full attempts is not always better practice.',
    body: [
      'Attempting the full skill can be useful when the athlete is ready for that attempt. A coach may choose a drill because one part needs attention first: the entry, the body shape, the strength, the timing, the orientation, the landing, or the confidence.',
      'More full attempts do not automatically make better practice. Quality repetitions of the right step can do more than repeating the same error at full speed.',
      'You deserve a specific explanation. For example: "We are improving the handstand position so they can push through their shoulders more consistently in the handspring."',
      'Try asking the coach: "Which piece are you building right now, and what would readiness for the next step look like?"',
    ],
  },
  {
    id: 'small-habits-big-skills',
    category: 'guide',
    title: 'Lesson 4: Small Habits Build Big Skills',
    summary: 'A long term goal gives direction. A short term habit gives this week a job.',
    body: [
      '"Get a back handspring" is an outcome. "Practice the assigned shapes with attention and apply one correction at a time" describes actions the athlete can actually work on. The coach decides which practice is appropriate and where it can be done safely.',
      'Consistency matters. So do rest, enjoyment, and a healthy relationship with the sport. Homework is a tool for learning, not a test of anyone\u2019s worth.',
      'That is progress, not perfection. The mindset is steady work on the right things, not a perfect streak.',
      'Try asking: "What is one small thing you are working on this week?"',
    ],
  },
  {
    id: 'time-to-move-up',
    category: 'guide',
    title: 'Lesson 5: How Do We Know It Is Time to Move Up?',
    summary: 'A class name or one landed skill cannot tell the whole story.',
    body: [
      'A coach considers prerequisite skills, quality, consistency, control, the ability to use corrections, and how the athlete handles the demands of the next class. The useful question is: "What does this athlete need to succeed in that environment?"',
      'When a move up is delayed, the coach should be able to explain the athlete\u2019s strengths, the specific criteria they are still building, and how the current class supports that work.',
      'RYAN: list your class move-up criteria here. What two or three things must an athlete show before moving to the next class? Replace this paragraph with your actual standards.',
      'Try asking the coach: "Which two or three things would show they are ready for the next class?"',
    ],
  },
  {
    id: 'when-a-skill-feels-scary',
    category: 'guide',
    title: 'Lesson 6: When a Skill Suddenly Feels Scary',
    summary: 'Fear can show up with new skills or old ones. It is information, not failure.',
    body: [
      'Fear can appear while learning something new. An athlete can also become hesitant with a skill they have done before. Their body, confidence, or circumstances may have changed. Pressure to perform can make the moment heavier.',
      'A coach can return to a manageable version, rebuild technical understanding, and help the athlete collect small successes. The goal is to rebuild confidence and trust in the skill.',
      'Parents can help by listening, acknowledging the feeling, and keeping support steady whether the athlete performs the skill that day or not.',
      'Try asking: "What smaller step felt manageable today?"',
    ],
  },
  {
    id: 'what-to-praise',
    category: 'guide',
    title: 'Lesson 7: What Should I Praise After Practice?',
    summary: 'If every conversation starts with "Did you get it?", landing can feel like the only thing that counts.',
    body: [
      'Notice effort with a direction: applying a correction, practicing with control, speaking up when something feels wrong, or returning to a challenge after a break. Celebrate the exciting skills too.',
      'An athlete\u2019s value and a parent\u2019s support should never depend on one performance.',
      'Try these swaps. Instead of "Did you get your tuck?" ask "What got better about your tuck work?"',
      'Instead of "Why didn\u2019t they let you try it?" ask "What is the coach helping you build first?"',
      'Instead of "When are you moving up?" ask "What are you working on to be ready?"',
      'Instead of "You used to be able to do that" ask "What smaller step felt good today?"',
    ],
  },
  {
    id: 'plateaus-are-information',
    category: 'guide',
    title: 'Lesson 8: Plateaus Are Information',
    summary: 'A stall gives the coach a reason to look closer, not to push harder.',
    body: [
      'An athlete can practice regularly and seem to stay in the same place for a while. That gives the coach a reason to look more closely. Which part is improving? Which part keeps limiting the skill? Have strength, coordination, confidence, or circumstances changed?',
      'A plateau should lead to a more specific plan, not endless unchanged attempts. Parents can support that plan by noticing smaller milestones and asking for an update when they cannot tell what the athlete is working toward.',
      'Try asking the coach: "What have you noticed, and what are we changing in the plan?"',
    ],
  },
  {
    id: 'choosing-a-class',
    category: 'guide',
    title: 'Lesson 9: Choosing a Class That Serves the Athlete',
    summary: 'The best class depends on what the athlete needs right now.',
    body: [
      'A class with many repetitions can be fun and useful for an athlete practicing skills they are ready to repeat. Another athlete may benefit more from targeted drills, technical feedback, and time to build prerequisites.',
      'Parents should know each class\u2019s purpose, entry expectations, what practice looks like, and how coaches evaluate progress. A faster class is not automatically better or worse for every athlete.',
      'Try asking: "What kind of practice would help my athlete most right now?"',
      'Celebrate the skill. Build the habits that make it last.',
    ],
  },
]
