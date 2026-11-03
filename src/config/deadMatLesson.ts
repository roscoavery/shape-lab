/**
 * Dead Mat parent education lesson (build 1202).
 *
 * Single source for the lesson copy, so the text stays editable in one
 * place instead of scattered through the renderer. The renderer is
 * DeadMatLesson.tsx. The lesson is listed in parentEducation.ts as a
 * `lesson` article, which is how it appears in the signed-in Parent
 * Education desk and in the public parent Learn desk.
 *
 * Copy rules that apply to every string here:
 * - No em dashes or en dashes (Ryan's standing app-copy rule). Use
 *   periods and commas instead.
 * - No injury-prevention promises, no universal spring-to-dead-mat ratio,
 *   no invented statistics, quotes, or citations. Every reference states
 *   only what its source actually establishes, plus its limitation.
 * - The Instagram reel is an athlete perspective, not evidence. Its
 *   caption themes are paraphrased, never quoted, and no athlete is
 *   named from it.
 */

export type DeadMatBullet = { title: string; text: string }

export type DeadMatSection = {
  id: string
  heading: string
  paragraphs: string[]
  bullets?: DeadMatBullet[]
}

export type DeadMatSurface = {
  name: string
  purposes: string
  advantages: string
  limitations: string
  deadMatSupport: string
}

export type DeadMatStage = {
  name: string
  description: string
  note?: string
}

export type DeadMatQuizQuestion = {
  question: string
  options: string[]
  answerIndex: number
  explanation: string
}

export type DeadMatReference = {
  kind: string
  title: string
  description: string
  url: string
  limitation?: string
}

export const DEAD_MAT_LESSON = {
  title: 'Training for Dead Mat',
  subtitle:
    'Why spring floors, mats, and proper progressions can help develop excellent dead mat tumbling.',
  readingTime: 'Approximately 6 to 8 minutes',
  categoryLabel: 'Parent Education',

  introHeading: 'Should School Cheerleaders Only Train on Dead Mat?',
  intro: [
    'If your athlete performs their tumbling on dead mat during school cheerleading, you might wonder why their tumbling classes involve spring floors, trampolines, rod floors, soft mats, and other equipment.',
    'Wouldn\u2019t practicing on dead mat all the time make them better at dead mat tumbling? It is a reasonable question.',
    'Athletes absolutely need to practice on their performance surface as they become ready for it. However, the most effective place to perform a skill is not always the most effective place to learn that skill.',
    'A major purpose of a quality tumbling program is to develop strong, efficient techniques and then progressively teach athletes to apply those techniques in more demanding environments.',
    'Our goal is to help athletes become better dead mat tumblers, not simply to accumulate more dead mat repetitions.',
  ],

  sections: [
    {
      id: 'repetitions',
      heading: 'More Repetitions Do Not Automatically Mean Better Technique',
      paragraphs: [
        'Tumbling improvement depends on what the athlete is practicing, how the movement is being performed, the feedback they receive, and whether they are ready for the demands of that exercise.',
        'When an athlete struggles to generate enough power on dead mat, they may discover movement strategies that help them complete a skill immediately but become obstacles later.',
        'These compensations are possible on every surface. They may become particularly tempting when athletes are repeatedly attempting skills under conditions that exceed their current abilities. Practicing these habits repeatedly may make them more familiar without making them more effective.',
        'Making a skill happen is different from developing excellent technique.',
      ],
      bullets: [
        {
          title: 'Excessive bending and jumping between skills',
          text: 'Athletes may bend deeply and produce an additional jump during connections rather than learning to use the preceding skill\u2019s momentum and an efficient block.',
        },
        {
          title: 'Cutting off the set',
          text: 'Athletes may initiate rotation too early because they are worried about completing the flip. This can interfere with the height and trajectory they need.',
        },
        {
          title: 'Losing power during connections',
          text: 'Excessive pauses, unnecessary movements, and inefficient body positions can waste momentum that should transfer into the next skill.',
        },
        {
          title: 'Harsh or uncontrolled landings',
          text: 'Athletes may repeatedly experience difficult impacts while attempting skills that require more strength, control, or technical development.',
        },
      ],
    },
    {
      id: 'surfaces',
      heading: 'Why We Use Different Training Surfaces',
      paragraphs: [
        'Different equipment offers different learning opportunities. The value of equipment comes from the coach\u2019s ability to use it appropriately.',
        'Additional bounce changes timing, forces, and movement demands. Athletes must learn how to control those differences. More bounce is not automatically safer or better for every skill.',
      ],
    },
    {
      id: 'stages',
      heading: 'The Four Stages of Tumbling Development',
      paragraphs: [
        'Shape Lab uses four stages to describe how a skill develops. The stages help coaches determine how athletes should practice, rather than expecting every athlete to perform the complete skill under competition conditions immediately.',
        'Skill performance can vary, and athletes may need to revisit earlier stages. An athlete performing a skill successfully on one occasion or one particular surface does not automatically establish mastery.',
      ],
    },
    {
      id: 'power',
      heading: 'The Power Tumbling Connection',
      paragraphs: [
        'Some exceptional dead mat tumblers have backgrounds in gymnastics and power tumbling. Those backgrounds can involve extensive training on trampolines, rod floors, spring floors, and specialized landing equipment.',
        'Power tumblers frequently develop sophisticated techniques for generating speed, directing momentum, maintaining efficient body positions, and connecting skills. These abilities can be extremely valuable when transitioning to dead mat.',
      ],
      bullets: [
        {
          title: 'Speed',
          text: 'Appropriate horizontal velocity can provide momentum for a connected pass. Athletes must learn to generate and control that velocity. More speed is not always better. Effective speed must be matched with technical control and the demands of the particular skill.',
        },
        {
          title: 'Blocking angles',
          text: 'Well timed contact positions and effective force application allow athletes to redirect motion and generate the trajectory needed for a skill.',
        },
        {
          title: 'Momentum preservation',
          text: 'Efficient connections help athletes avoid unnecessarily losing speed and energy between skills.',
        },
        {
          title: 'Body positioning',
          text: 'Strong, coordinated body shapes can help athletes manage rotation, minimize inefficient movement, and transfer momentum.',
        },
        {
          title: 'Timing',
          text: 'The correct sequencing of body movements is necessary to make effective use of both the athlete\u2019s momentum and the surface response.',
        },
      ],
    },
    {
      id: 'spring-floor-struggle',
      heading: 'Why Some Dead Mat Tumblers Struggle on Spring Floor',
      paragraphs: [
        'Some athletes who primarily train on dead mat or grass can develop impressive abilities. However, athletes who have little experience with responsive training surfaces may initially struggle with spring floor, tumble tracks, or rod floors.',
        'Additional rebound changes the timing and demands of their movements. They may feel uncomfortable, lose coordination, or struggle to use the additional energy effectively. This can make it harder for coaches to introduce tools that could help correct technique or develop specific skills.',
        'Developing proficiency across different training environments expands the athlete\u2019s options. It also helps athletes learn to adjust their mechanics appropriately without abandoning the technical principles they have developed.',
        'This is not a statement about who is more capable. Self taught athletes are not necessarily less capable, and power tumblers do not always have superior technique.',
      ],
    },
    {
      id: 'transfer',
      heading: 'How We Gradually Transfer Skills to Dead Mat',
      paragraphs: [
        'A coach may use a different power setup on dead mat than on spring floor. For example, an athlete might practice a skill with a reduced approach on spring floor before attempting a more powerful approach on dead mat, provided the athlete is technically prepared and properly supervised.',
        'Additional secured layers of suitable matting or less responsive padded landing surfaces may sometimes be useful transitional tools, subject to equipment compatibility and safe setup.',
        'This is an illustrative progression, not a universal prescription for every skill. Additional speed, stacked mats, or decreased assistance are not automatically safe.',
      ],
    },
    {
      id: 'demands',
      heading: 'Physical Demands and Long Term Athletic Development',
      paragraphs: [
        'Tumbling places substantial demands on the body. Each takeoff and landing involves forces that the athlete must generate, absorb, or redirect. The ankles, knees, hips, spine, and other structures must tolerate those demands repeatedly.',
        'Surface construction can influence peak landing forces, loading rates, and landing mechanics. When an athlete is repeatedly practicing demanding skills with poor technique, inadequate preparation, or fatigue, the cumulative training demands can become concerning.',
        'Thoughtfully selected equipment can help coaches adjust task difficulty and landing demands during technical development. However, overall injury risk depends on multiple factors, including technique, skill difficulty, readiness, training volume, recovery, equipment, and supervision.',
        'Spring floor does not eliminate injuries, and no specific number of dead mat repetitions causes injury on its own. Building strength, developing technique, managing fatigue, and selecting the right surfaces can all contribute to a more sustainable training approach. Strength training should complement technical training and appropriate surface exposure.',
      ],
    },
    {
      id: 'perspective',
      heading: 'A Coach\u2019s Perspective',
      paragraphs: [],
    },
    {
      id: 'avoid-dead-mat',
      heading: 'Does This Mean Athletes Should Avoid Dead Mat?',
      paragraphs: [
        'Absolutely not. Dead mat training is important for athletes who perform on dead mat. They need to develop confidence, consistency, strength, control, and surface specific timing.',
        'But dead mat is one component of the developmental process. The important question is not simply how often an athlete practices there. It is whether the athlete\u2019s training is helping them develop better technique and prepare appropriately for performance.',
      ],
    },
  ] as DeadMatSection[],

  surfaces: [
    {
      name: 'Trampoline',
      purposes: 'Develop spatial awareness, body positioning, rotational control, and understanding of movement.',
      advantages: 'Greater airtime gives athletes more time to feel a position and complete a rotation while learning.',
      limitations: 'Timing and forces differ greatly from a floor. Skills learned here still need to transfer to firmer surfaces.',
      deadMatSupport: 'Builds the air awareness and body control that dead mat tumbling later demands without the floor\u2019s help.',
    },
    {
      name: 'Tumble Track',
      purposes: 'Practice connected movements, body shapes, and timing with repeated rebound.',
      advantages: 'Athletes can repeat connections many times in a row and feel how one skill feeds the next.',
      limitations: 'The rebound assists the connection, so timing learned here must be re-learned for a less responsive surface.',
      deadMatSupport: 'Teaches connection rhythm and shape discipline that carries into dead mat passes.',
    },
    {
      name: 'Rod Floor',
      purposes: 'Learn efficient momentum transfer, acceleration, blocking, and connected tumbling techniques.',
      advantages: 'Responds enough to reward a good block, which makes blocking mechanics easier to feel and correct.',
      limitations: 'Still more responsive than dead mat, so the block must later be proven without that help.',
      deadMatSupport: 'Develops the blocking and acceleration habits that generate power when the surface gives less back.',
    },
    {
      name: 'Spring Floor',
      purposes: 'Practice complete skills and develop technical consistency, movement timing, blocking mechanics, and controlled landings.',
      advantages: 'A responsive, familiar environment for full skills, with room to repeat good technique many times.',
      limitations: 'The floor contributes energy, so a skill that works here is not yet proven on dead mat.',
      deadMatSupport: 'Where complete skills become consistent before they are transferred to the performance surface.',
    },
    {
      name: 'Soft Mats and Landing Systems',
      purposes: 'Change landing demands and allow coaches to isolate movements and adjust skill difficulty.',
      advantages: 'Softer landings let coaches break a skill into parts and set suitable landing conditions during progressions.',
      limitations: 'Soft landings can hide landing errors that a firmer surface would expose.',
      deadMatSupport: 'Makes early attempts at a hard skill manageable while technique, not survival, stays the focus.',
    },
    {
      name: 'Dead Mat',
      purposes: 'Adapt and demonstrate technique, strength, power generation, and consistency on a less responsive surface.',
      advantages: 'It is the performance surface itself, so success here is the truest test of readiness.',
      limitations: 'It gives little back, so it is a poor place to first learn a skill an athlete cannot yet power or control.',
      deadMatSupport: 'The destination. Training elsewhere earns its value when technique arrives here intact.',
    },
  ] as DeadMatSurface[],

  stages: [
    {
      name: 'Introduction',
      description:
        'The athlete learns the skill\u2019s fundamental shapes, concepts, movement patterns, and prerequisites.',
    },
    {
      name: 'Approximation',
      description:
        'The athlete practices modified or assisted versions and individual components. Equipment, drills, and appropriate coaching assistance help them approximate the desired movement. Some athletes start doing a skill by themselves while still in this stage.',
    },
    {
      name: 'Acquisition',
      description:
        'The athlete can perform the skill in an appropriate controlled environment and is developing consistent technique, control, and independence. Landing it is not the same as owning it.',
    },
    {
      name: 'Mastery',
      description:
        'The athlete demonstrates consistent precision, intentional control, an understanding of the mechanics, and the ability to maintain technique across repetitions and appropriate changing conditions. All the little details feel controllable, and manipulating the skill in multiple ways feels easy.',
      note: 'Acquisition versus mastery is the distinction that matters most here. Performing a skill once, or on one surface, shows it is possible. Mastery shows it is reliable.',
    },
  ] as DeadMatStage[],

  transferSteps: [
    {
      title: 'Technical Foundation',
      text: 'Develop shapes, strength, blocking, control, and fundamental movement patterns using appropriate drills and equipment.',
    },
    {
      title: 'Skill Acquisition on Supportive Surfaces',
      text: 'Learn the complete skill on suitable equipment and build consistent execution.',
    },
    {
      title: 'Increase Technical Demands',
      text: 'Where appropriate, modify the spring floor setup to reduce available assistance while maintaining movement quality. For example, reduce a run or preceding power setup when the coach determines this is appropriate.',
    },
    {
      title: 'Introduce Less Responsive Surfaces',
      text: 'Begin transferring the skill to dead mat with suitable modifications, landing protection, or an appropriate approach.',
    },
    {
      title: 'Develop Performance Surface Proficiency',
      text: 'Gradually develop consistent technique and control under the actual surface and routine conditions the athlete will encounter.',
    },
    {
      title: 'Continue Refinement',
      text: 'Use spring floors, rod floors, and other equipment when necessary to refine technique, build skills, or manage training demands even after the athlete becomes proficient on dead mat.',
    },
  ],

  strengthItems: [
    'Lower body strength and force production',
    'Eccentric strength and landing control',
    'Trunk strength and coordination',
    'Ankle and calf capacity',
    'Appropriate range of motion and control',
    'Gradual exposure to the demands of the performance surface',
  ],

  coachPerspective: [
    'When I was in college, the majority of our tumbling practices took place on spring floor. We used that environment to maintain our technique and perform the repetitions necessary to keep developing. When our skills were strong and consistent, we incorporated dead mat full outs to prepare for performance.',
    'My experience was that this helped us manage the physical demands of training while maintaining the techniques we wanted to bring onto the competition surface.',
    'Throughout my coaching career, many of the strongest dead mat tumblers I have trained alongside have come from gymnastics or power tumbling backgrounds.',
    'I have also observed athletes who exclusively train on dead mat develop inefficient connections, excessive bending and jumping between skills, shortened sets, and difficult landings.',
    'That is why I believe in using the equipment available to teach efficient technique first and progressively transferring those skills to the surface where the athlete needs to perform.',
  ],
  coachPerspectiveNote:
    'This is coaching experience and perspective, not controlled research evidence.',

  powerTumblingConclusion:
    'Powerful dead mat tumbling can be built by developing efficient mechanics on specialized training equipment and progressively learning to apply those mechanics to less responsive surfaces.',

  reel: {
    url: 'https://www.instagram.com/reel/DeKX7uGPg8c/',
    label: 'Athlete perspective on Instagram',
    note: 'An athlete perspective, not scientific proof. The reel discusses three things that helped her dead mat tumbling: strength training, technique and timing, and mindset. Watch it on Instagram. No download, no rehost.',
  },

  baylor: {
    title: 'Baylor Acrobatics and Tumbling',
    text: 'Baylor has publicly recruited athletes with power tumbling backgrounds. In its 2026 roster announcement, the university noted that Lawrence Owens comes to Baylor from a power tumbling background, and that her specialty will be powerful whip passes among other big combinations. The same announcement says the program pulls from many different backgrounds, including competitive cheer, acrobatic gymnastics, artistic gymnastics, and power tumbling.',
    limitation:
      'Recruitment history shows Baylor values varied backgrounds. It does not prove any particular training method is superior.',
    url: 'https://baylorbears.com/news/2024/11/13/acrobatics-tumbling-a-t-signs-nine-for-2026-roster',
  },

  deeObservation:
    'Coaches have also observed athletes like Tumbling Dee, who practiced advanced tumbling on spring floors, rod floors, and trampoline equipment in his younger years and later became an exceptionally accomplished dead mat tumbler. This is a coach observation that illustrates how specialized equipment and dead mat excellence can coexist. It is not a documented career record.',

  finalTakeaway:
    'More dead mat tumbling does not automatically mean better dead mat tumbling.',
  finalClose: [
    'We want athletes to develop techniques that generate power efficiently, connect skills smoothly, maintain control, and manage unnecessary stress on their bodies.',
    'Using the right equipment at the right time can help athletes develop the mechanics they need and progressively apply them to dead mat.',
    'Train with the tools that develop great technique. Then learn to bring that technique to the performance floor.',
  ],

  quiz: [
    {
      question: 'If an athlete competes on dead mat, where should they learn a new advanced tumbling skill?',
      options: [
        'Only on dead mat',
        'Using appropriate equipment and progressions before gradually transitioning to dead mat',
        'Only on trampoline',
      ],
      answerIndex: 1,
      explanation:
        'New skills are best learned where the athlete can repeat good technique with the right support, then transferred to dead mat step by step.',
    },
    {
      question: 'Why are speed and angles important in connected tumbling?',
      options: [
        'They can help an athlete efficiently generate and redirect momentum',
        'Going as fast as possible always produces better skills',
        'Body positioning does not matter if an athlete is strong',
      ],
      answerIndex: 0,
      explanation:
        'Speed and angles let an athlete redirect momentum efficiently. More speed without control does not help, and body position matters at every speed.',
    },
    {
      question: 'Does performing a skill once on dead mat prove it is mastered?',
      options: [
        'Yes',
        'No, mastery requires reliable technique, control, and appropriate adaptability',
      ],
      answerIndex: 1,
      explanation:
        'One good rep shows the skill is possible. Mastery means reliable technique, control, and adaptability across reps and conditions.',
    },
    {
      question: 'Why might a coach continue using spring floor even after an athlete can perform a skill on dead mat?',
      options: [
        'To refine technique and manage training demands',
        'Because dead mat practice is never needed',
        'Because every skill is automatically safer on spring floor',
      ],
      answerIndex: 0,
      explanation:
        'Spring floor stays useful for refining technique and managing training load, even after an athlete performs the skill on dead mat. Dead mat practice is still needed too.',
    },
  ] as DeadMatQuizQuestion[],

  quizNote:
    'This check is for parent understanding, not for determining an athlete\u2019s readiness.',

  reflectionHeading: 'Questions to Ask Your Athlete\u2019s Coach',
  reflection: [
    'What technique is my athlete currently developing?',
    'Which parts of the skill still need improvement?',
    'How is the training equipment helping them develop those skills?',
    'What will indicate they are ready to begin transitioning to dead mat?',
    'How is their overall training load being managed?',
  ],

  evidenceTiers: [
    'Published biomechanical research',
    'Professional safety recommendations',
    'Athlete experiences and coaching observations',
    'Coaching interpretations or proposed best practices',
  ],

  references: [
    {
      kind: 'Published biomechanical research',
      title:
        'Brtva and colleagues, Scientific Reports, 2025: Modifying landing mat properties elicits different lower limb biomechanical responses in gymnasts and non-gymnasts.',
      description:
        'The study involved 11 trained gymnasts and 11 untrained participants performing standardized drop landings across different mat constructions. It found differences in peak vertical ground reaction forces, time to peak force, and lower limb mechanics depending on the surface and the participants\u2019 training backgrounds. It supports the point that mat properties meaningfully affect landing biomechanics.',
      url: 'https://www.nature.com/articles/s41598-025-26522-y',
      limitation:
        'This study does not directly compare long term injury rates, and it does not prove that exclusive spring floor training produces better dead mat tumblers.',
    },
    {
      kind: 'Professional safety recommendations',
      title:
        'American Academy of Pediatrics, Safety in Cheerleading: Epidemiology and Recommendations, 2024.',
      description:
        'Relevant principles include appropriate strength, skill progression, supervision, and suitable training conditions.',
      url: 'https://publications.aap.org/pediatrics/article/154/5/e2024068956/199651/Safety-in-Cheerleading-Epidemiology-and',
    },
    {
      kind: 'Professional safety recommendations',
      title: 'USA Cheer: Safety Education.',
      description:
        'Relevant principles include progressive development, equipment use, appropriate matting, supervision, and athlete readiness.',
      url: 'https://usacheer.org/safety/national-cheer-safety-month',
    },
    {
      kind: 'Collegiate example, not proof of a training method',
      title: 'Baylor Acrobatics and Tumbling signs nine for its 2026 roster, 2024.',
      description:
        'Use this as evidence that Baylor recruits athletes with different athletic backgrounds, including power tumbling.',
      url: 'https://baylorbears.com/news/2024/11/13/acrobatics-tumbling-a-t-signs-nine-for-2026-roster',
      limitation:
        'Do not present Baylor recruitment history as proof that any particular training method is superior.',
    },
    {
      kind: 'Athlete perspective, not a peer reviewed source',
      title: 'Instagram athlete perspective on dead mat tumbling.',
      description:
        'An athlete perspective and external media reference, not a peer reviewed scientific source. See the reel card above for what it covers.',
      url: 'https://www.instagram.com/reel/DeKX7uGPg8c/',
    },
  ] as DeadMatReference[],
}
