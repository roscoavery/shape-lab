/**
 * Parent Guide — in Ryan's own words.
 *
 * Each article is interview Q&A: `question` is the interviewer prompt
 * (never Ryan's words), `answerKey` points at the live coach-interview answer,
 * and `answer` is a baked-in snapshot (2026-09-25) used only as a fallback when
 * the live answers are unreachable. The renderer styles questions
 * as prompts so they never read like something Ryan typed.
 * first-landing-parent is omitted — his answer pointed at another box.
 *
 * Live answers: useParentGuide() (src/lib/useParentGuide.ts) pulls the latest
 * from /api/coach-interview and merges them over this structure. Editing answers
 * in the Coach Interview updates the parent view automatically — no build step.
 */

export type ParentEducationCategory = 'guide'

export const PARENT_EDUCATION_CATEGORIES: { id: ParentEducationCategory; label: string }[] = [
  { id: 'guide', label: 'Parent Guide' },
]

export type ParentEducationQA = {
  /** The interviewer prompt. Not Ryan's words. Render as a prompt. */
  question: string
  /** Key into the live coach-interview answers (data/coach-interview.json). */
  answerKey: string
  /**
   * Baked-in snapshot of Ryan's answer (2026-09-25). Used as fallback when the
   * live interview answers are unreachable. The parent view pulls live answers
   * via useParentGuide() — edits in the Coach Interview update parents automatically.
   */
  answer: string[]
}

export type ParentEducationArticle = {
  id: string
  category: ParentEducationCategory
  title: string
  summary: string
  /** Ryan's opening words for the article (not tied to a question). */
  intro: string[]
  qa: ParentEducationQA[]
}

export const PARENT_EDUCATION: ParentEducationArticle[] = [
  {
    id: "what-progress-looks-like",
    category: 'guide',
    title: "What Progress Looks Like",
    summary: "Progress is not linear.",
    intro: [
      "One of the biggest things that leads to athlete's progress is an intrinsic pursuit of understanding. DETERMINATION and relentless pursuit of understanding.. That is one of the of the many important lessons that come with tumbling and gymnastics. The importance of consistent effort, celebrating small wins, a persistant drive for understanding, and overall pure determination.",
    ],
    qa: [
      {
        question: "When a parent only asks about what new skill their kid got, what do you wish they understood about progress?",
        answerKey: "progress-beyond-landing",
        answer: [
          "Progress is not linear. Every athlete will have ups and downs throughout their journey.",
          "I grew up hearing my dad frequently say that ther is nothing like doing the same job twice you could've done right the first time.. and I think he hit the nail on the head when it comes to tumbling progressions. If we focus too much on acquiring a skill and not how it affects the next one. We can slow our long term progress down drastically by rushing through the process.",
          "Fast is slow and slow is fast… \"Coach Jim\"",
          "Focusing on the right habits and consistency goes a much longer way than seeking shortcuts.",
          "Tumbling has its hazards. When I am aware that a progression is more likely to increase the risk of injury, I feel morally obligated to guide athletes through the ones that reduce those risks instead. The tricky part is that the safest progressions that benefit athletes long term aren't always the most exciting to watch or go through. A slower, more technical path can look/feel like holding an athlete back when it's actually is often what's best for their long term progression and safety. If more athletes and parents understood that, I think they'd value when coaches slow the process down a lot more. Progress is not all about leveling up and getting new skills. Putting in consistent effort and making improvements that can feel like getting 1% better are the ones that add up to real long term growth.",
          "Slow and steady wins the race. Mastering the basics can often open the door to higher level tumbling more than just sending skills til they get it.",
        ],
      },
      {
        question: "What are the quiet improvements you notice in an athlete that parents usually miss?",
        answerKey: "quiet-improvements",
        answer: [
          "Hand position, handstand lines, lunge lever handstand improvements. It's easy to overlook the small wins, but not every win is about getting a new skill. Speeding up a little on the handspring series, or hitting more accurate shapes in sequences we used last week, those are wins 100% worth acknowledging. Doing a few solid proper reps on a skill they've had for a while is still absolutely a win. I feel a real sense of gratification when I do a nice standing tuck even if it isnt my hardest skill.. Those reps are productive.",
        ],
      },
      {
        question: "What is a question a parent could ask their athlete after practice that would actually tell them something useful?",
        answerKey: "progress-question",
        answer: [
          "Did you learn anything?",
          "What's something that you know you can improve to get closer to your goal?",
          "What's something small you improved on?",
          "Ryan says tumbling is full of unnatural feeling techniques. Any unnatural feeling corrections you've noticed are difficult that you can improve on??",
        ],
      },
    ],
  },
  {
    id: "why-still-working-on-basics",
    category: 'guide',
    title: "Lesson 1: Why Are We Still Working on Basics?",
    summary: "The stronger the basics, the stronger the harder skills can be.",
    intro: [
    ],
    qa: [
      {
        question: "A parent asks: \"Why is my kid still doing handstands when they want to learn a back tuck?\" What do you tell them?",
        answerKey: "basics-parent-asks",
        answer: [
          "The handstand is a staple in tumbling. The stronger the basics, the stronger the harder skills can be.",
        ],
      },
      {
        question: "Tell me about a time a basic unlocked a harder skill for one of your athletes. What was the basic, what was the skill, what changed?",
        answerKey: "basics-unlocked-skill",
        answer: [
          "I had to go back to handsprings because I went straight to round off tucks. We can't really ever get a round off handspring double full if we never get a round off handspring. It's common for athletes to get stuck on round off handsprings because they learned their handspring before having a strong round off. It’s also common for athletes to get stuck on tucks because they worked it out of a round off before refining their round off handspring and series. Moving onto the RO hs lay without a strong round off handspring tuck creates challenges we can avoid by understanding and following the progression.",
          "The stronger my layout is, the stronger my fulls and dubs can be.",
          "The more accurate my shapes hit in a sequence like \"pike tuck hollow arch\", the stronger my shapes can be in an even faster tumbling sequence while passing through the upside down with a number of other things to think about.",
        ],
      },
      {
        question: "What does \"perfection before progression\" mean in your coaching? When did you learn that?",
        answerKey: "perfection-before-progression",
        answer: [
          "This is an order of operation. Nothing is ever perfect.. the expression is a reminder to walk before you run. Set your standards high with prerequisites and your higher level skills will be easier to learn and achieve. Both tumble doc (Alvin Davis) and coach sahil (addicted to tumbling) have this philosophy written publicly.",
          "There's a wabi-sabi saying I like: \"nothing is ever perfect, nothing is ever finished, and nothing lasts forever.\"",
        ],
      },
    ],
  },
  {
    id: "doing-it-once-vs-owning-it",
    category: 'guide',
    title: "Lesson 2: Doing It Once and Owning It",
    summary: "Landing it once or even 3 times should be celebrated but does not equal having the skill.",
    intro: [
    ],
    qa: [
      {
        question: "How do you explain the difference between landing something once and actually owning it?",
        answerKey: "once-vs-owning",
        answer: [
          "Some coaches say once is luck, twice is a coincidence, and 3 times is a skill. I see it a little differently. Landing something once or even 3 times should absolutely be celebrated, but it doesn't quite equal owning the skill yet. Assuming an athlete will be able to hit the skill they landed a few times in one day can set them up for a tumbling block, especially when a cheer coach puts it in the routine or expects them to hit it at practice on command. It can make the athlete feel conditionally accepted, lead to injuries, increase fear and stress around the skill, and completely take the fun out of it. It can become an emotional rollercoaster and cause the athlete to doubt themselves on skills they've previously mastered. Just because an athlete hits a skill 3 times at practice doesn't mean it's time to put it in the routine. It takes consistent effort in maintaining and refining the skill to be ready to compete. There is a place between skill acquisition and mastery where a skill can begin to feel like second nature and be performed with minimal attention to detail after it has been done hundreds to thousands of times intentionally. And some skills may never feel like second nature. They can always feel unnatural and weird to perform and require thought and intention indefinitely.",
        ],
      },
      {
        question: "Walk me through the stages an athlete goes through learning a skill, in your own words. What does each stage look like from where you stand?",
        answerKey: "stages-in-your-words",
        answer: [
          "Skill introduction, skill approximation, skill acquisition, skill mastery.",
        ],
      },
    ],
  },
  {
    id: "why-not-just-try-the-skill",
    category: 'guide',
    title: "Lesson 3: Why Doesn’t the Coach Just Let Them Try It?",
    summary: "If I have 20 details to think about in 2 seconds, I will fail.",
    intro: [
    ],
    qa: [
      {
        question: "When you choose a drill instead of letting them throw the full skill, what are you seeing that makes that call?",
        answerKey: "drill-decision",
        answer: [
          "The idea is that to perform a complex skill, we have to consider how quickly it happens and how much thought has to go into building the habits the movement requires. Our brain can't process more than 3-4 complex corrections, narrowed down to one word at a time, when the skill happens in less than 2 seconds. If we can break the movement into pieces, assign a handful of corrections to each piece, and build the habits to where we can do each piece correctly without having to think too much about it, then we can minimize how much simultaneous thought the skill demands. If I have 20 details to think about in 2 seconds, the details get lost. If I can master one piece of the movement with 2-3 corrections at a time, then another part, then another, at some point the skill becomes much easier for our brain to process and our body to perform. Training the full movement over and over without mastering its puzzle pieces can be a recipe for missing big important details because we are so focused on making it happen.. Deconstruction is an amazing tool for teaching and learning anything that requires complex understanding.",
        ],
      },
      {
        question: "Give me an example of a specific explanation you have given a parent about what you are building and why. The more concrete the better.",
        answerKey: "specific-explanation",
        answer: [
          "We learn the sequence \"pike hollow arch\" and we learn the cartwheel step in zombie so we can put them together as a connection drill. We build on the motions by doing the sequence out of a round off to zombie and eventually progress to a sweep through drill where we skip the zombie shape. This leads to athletes' ability to get their feet in front very easily when doing a round off back handspring connection.",
        ],
      },
      {
        question: "What do you think when you hear \"they just need more reps of the full skill\"?",
        answerKey: "more-attempts",
        answer: [
          "Repetition builds habits.. it's that simple.. repeating the same motion over and over and over and over does not always lead to improving the movement. It can actually be detrimental to the athlete's progress if they repeat the wrong motion over and over and build a habit that doesn't serve them. Repetition is important for building muscle memory and building habits. The movements we repeat need to be intentional in order for reps to build good habits.",
          "Practice itself doesn't always make perfect. Perfect practice makes perfect. I would much rather see an athlete do 5 clean and intentional handspring reps in a class that breaks the skill down than to see them send 15-20 reps that focus primarily on them getting a the flip over by themselves without preparing for what comes next.",
          "Sometimes, if an athlete has trained it correctly, built the right habits and has mastered the drills, then it can become extremely beneficial to focus on more reps of the full skill since we are enforcing the right habits. I wouldnt say to stop doing the drills just because you got it down. keeping that drill fresh in your mind while doing the skill is also important. Repetition is important for developoing muscle memory and correcting errors, but repetition could be the reason an athlete gets stuck with the wrong habits from doing them without correcting the movements which can be a real setback itself. it can sometimes take longer to correct bad habits than to teach good habits from the start. \"nothing like doing the same job twice you could have done right the first time\"",
        ],
      },
    ],
  },
  {
    id: "small-habits-big-skills",
    category: 'guide',
    title: "Lesson 4: Small Habits Build Big Skills",
    summary: "Perfection before progression does not contradict \"progress, not perfection\"",
    intro: [
    ],
    qa: [
      {
        question: "What does useful homework look like? And when does homework cross the line into pressure?",
        answerKey: "useful-homework",
        answer: [
          "Tumbling homework should always be something the athlete does because they are striving to improve, not because their parents make them do it. My hope is that as a coach, I tell the athletes why they need to work what they need to work well enough to the point they want to do it intrinsically on their own.  Useful homework is anything the athlete can do outside of classes/practice/lessons that will build up their tumbling. They could be doing intentional reps on the trampoline at home, practicing cartwheels, lunge lever handstands, studying shapes, watching reference videos, watching videos of their own tumbling, doing strength training, wall handstands.. drills you can do at home or even just intentionally focusing on the skill and thinking about how to improve it.",
        ],
      },
      {
        question: "What does \"progress, not perfection\" mean to you as the mindset you want in your athletes?",
        answerKey: "progress-not-perfection",
        answer: [
          "This is a mindset that encourages athletes to celebrate the small wins. Not prioritizing focus on leveling up rather than perfecting the skills they have. Perfection before progression does not contradict \"progress, not perfection\" the two mindsets can be held simultaneously. One is an order of operations, and one is a mindset. We don't skip the prerequisites that still need work and say \"progress not perfection\"…  and use that as a reason to stop striving to master the basics.",
        ],
      },
      {
        question: "If a parent asked you \"what is the one small thing my kid should focus on this week,\" how do you come up with the answer?",
        answerKey: "one-small-thing",
        answer: [
          "This depends on the athlete. I would look at what they need work on and base my answer off of that. Athletes generally can always improve their understanding of a skill by watching references.  Staying on top of some amount of conditioning and building up their hollow hold times, doing some extra work on core exercises or maybe I send them an arch to hollow exercise they can do for their back handsprings. sometimes I send a video that explains how twisting works.. Like most things, the answer is that it depends on the athlete.",
        ],
      },
    ],
  },
  {
    id: "time-to-move-up",
    category: 'guide',
    title: "Lesson 5: How Do We Know It Is Time to Move Up?",
    summary: "\"sometimes where an athlete wants to be is not where an athlete needs to be.\"",
    intro: [
    ],
    qa: [
      {
        question: "What are your actual criteria for moving an athlete up a class? Name the two or three things they have to show you.",
        answerKey: "move-up-criteria",
        answer: [
          "This depends on the athlete and the skill level and class that they are in. Not all gym’s require the same things for an athlete to move up. if they are ahead of the rest of the class and could benefit more from being in another class, this is more important than sticking to a clear criteria for them to master.. they need to be in an environment that challenges them and allows them to focus on what they need to be focused on. If they have mastered the criteria in the class and have what they need to work what is focused on in the next class, they move up.. sometimes we move an athlete up into a higher level class to keep them with athletes the same age as long as we can continue focusing on what that athlete needs.. the overal athlete experience is important to take into account for. What is best for the athlete’s progression is not always what is best to keep them in the program.. what is best for keeping them in the program is not always what is best for the athlete’s progression.",
        ],
      },
      {
        question: "How do you explain to a parent that their kid is not ready to move up yet, without it feeling like bad news?",
        answerKey: "delayed-move-up",
        answer: [
          "Coach Lain said this one best.. \"sometimes where an athlete wants to be is not where an athlete needs to be.\"  For teams, we want to put the aces in their places.  For progression, we need to be in a class best suited for where they are in their tumbling journey. For this to not be troubling for athletes and parents, it's helpful to be reminded that all we can do is what is within our control. We can't control how fast we pick up on the techniques given to us by our coaches. Coaches can't control how fast an athlete progresses. We just stay true to the process, put our best foot forward (not literally.. for my right handed left tumblers) and do everything within our control to maximize what we take from practice with effort, pursuit of understanding, celebrating progress and staying patient.",
        ],
      },
      {
        question: "What does \"ready for the next class\" actually look like to you on the floor?",
        answerKey: "ready-looks-like",
        answer: [
          "The athlete is killin it with the drills they're training, they have the skills the drills were meant to train them to perform and are performing the skills independently in ways that will complement the next skill. For teams, it is all based off of what their coaches decide. Sometimes gymnasts skip levels because of certain skills being too hard but harder skill being easier for them.. Sometimes a cheerleader moves up not because of tumbling, but because of stunting. Maybe they stay on a lower level team because they need more work in stunts even though they have the tumbling requirements for the next level. Sometimes an athlete is not mentally mature enough to move to a higher level team when their skills have advanced beyond their age. The goal is to put the athlete in a place that will maximize benefit for not only themselves, but for the team.",
        ],
      },
    ],
  },
  {
    id: "when-a-skill-feels-scary",
    category: 'guide',
    title: "Lesson 6: When a Skill Suddenly Feels Scary",
    summary: "be a safe place for them to talk. be their anchor.",
    intro: [
    ],
    qa: [
      {
        question: "An athlete who could do a skill suddenly can’t. Walk me through what you do, and what you tell the parent.",
        answerKey: "skill-goes-away",
        answer: [
          "There are several reasons this could happen.. trauma from falling or having an injury or watching someone get injured, maybe they are coming back from an injury and their body isnt physically ready.. Maybe they hit a growth spurt and the skill feels off. Pressure from coaches or parents or the feeling of conditional acceptance causes the athlete to shut down emotionally and enhances their self doubt. Bullying at school, getting a bad grade, overthinking, perfectionism and unwillingness to do a bad rep. maybe they didnt get it past the early acquisition phase and took some time off. Maybe they mastered it, hit puberty and then their hormones go haywire and affect their tumbling confidence.. sometimes the physiological responses we get from our nervous system can be completely out of our control and can hinder our ability to perform regardless of how well we understand the skill, how much we have trained it. whether or not we are prepared and have mastered it at practice. sometimes the environment can make an athlete struggle to perform a skill they have mastered. sometimes they just lose the feeling of skill because when they had it, they had a mental understanding of it that they are having trouble grasping again.. There are a number of reasons this could happen and every situation can be unique. Some of the most gratifying moments are when these types of athletes make a breakthrough.",
          "What should they do? It depends on the athlete and the reason why the skill feels lost. Sometimes it is a technique gap that needs filled in.. sometimes they just need a coach to listen to them. Sometimes they need to condition so they can gain the strength required for the skill if its from an injury or a growth spurt. There are many solutions to point to and pointing at the right one genuinely depends on the athlete and their situation.",
        ],
      },
      {
        question: "What do you wish parents understood about fear in this sport?",
        answerKey: "fear-parents",
        answer: [
          "Unconditional support involves separating an athlete's value as a human from how they perform as an athlete. Be a safe place for them to talk. Be their anchor. Be the person that always is supportive not by providing coaching cues or telling them not to be scared.. but by listening and putting effort into understanding and helping them find resources that will help support their growth. Taking away all pressure and expectations of performance and providing hope, love, acceptance for where they are in the process, what they're going through emotionally, mentally and just being there to help however they can. Reminding them what is within their control and what is not and helping them to let go of outcomes out of their control and to focus solely on the process and things within their control that they can do.",
        ],
      },
      {
        question: "What does rebuilding confidence look like day to day? Give me a real example if you have one.",
        answerKey: "small-wins",
        answer: [
          "Remind them that consistent effort over time plus small wins adds up over time. I was talking with Levi about this the other day.. It's almost like consistent progress focusing on the process like that can be like compounded interest. It stacks and stacks and the better they get, the more progress they make with the effort put in. I think there is like an S curve in the sense that it exponentially stacks progress but you can get to a point where you have gotten to such a high level of tumbling that any progress can only be small things. Adding a half turn to a triple full is much harder than adding a half twist to a layout. The main point is that explaining to athletes how those small wins are exactly what to be aiming for, it will help the athlete to focus on those kinds of wins and acknowledge and appreciate them.",
        ],
      },
    ],
  },
  {
    id: "what-to-praise",
    category: 'guide',
    title: "Lesson 7: What Should I Praise After Practice?",
    summary: "It always comes back to doing what is within our control and trying not to get too hung up on outcomes we can't control.",
    intro: [
    ],
    qa: [
      {
        question: "What should a parent say in the car ride home? What should they not say?",
        answerKey: "car-ride-home",
        answer: [
          "This depends on the athlete, like most things. It depends on how they seem emotionally and what kind of adversities they could be going through, what has been going on surrounding practice or life. Some days for some athletes you might just wanna listen to music. You might ask them how it went, if they learned some good stuff or did any cool tricks. If you are a parent of an athlete who is struggling with fear on a skill and seems emotionally drained by it, these sometimes could be moments that open the door to conversations where you have to acknowledge the thing that must be frustrating, be as encouraging and supportive as you can, reminding them that as long as they are doing their best that is all they can do. It always comes back to doing what is within our control and trying not to get too hung up on outcomes we can't control. Saying things like \"did you throw your back handspring?\" or \"did you do your full?\" maybe aren't a great way of approaching the situation from the athlete's perspective if it is an emotionally draining situation for them. Just reading their body language and doing your best to intentionally be the best you can be for them is all the parents can do. Ultimately, parents know their athletes better than anyone and will have to just avoid making the car ride home add stress to the situation if possible.",
        ],
      },
      {
        question: "How do you keep an athlete’s sense of worth separate from whether they landed something that day?",
        answerKey: "worth-beyond-performance",
        answer: [
          "> Well… who we are is not exactly what skills we can do. We assign value to who we are, not to what physical capabilities we have or how fast we learn things. Is someone who never gets the skill worth less for who they are than the person who did get the skill? Sounds silly when you take it further. There is no shame in struggling to learn how to tumble. Now the feeling of gratification an athlete gets from knowing they hit a skill that was challenging for them is like the feeling adults get when we have a good day of work or get something productive done. There is a sense of gratification that comes with doing productive things at the end of the day, and days when we feel like we put in a bunch of work but get very little back is how it can feel to be an athlete who spent a tumbling session struggling to do what they were trying to do. So I think it's not as much about assigning self worth to their tumbling abilities sometimes. Sometimes it just can feel like work with no pay.\n>\n> Now I think during tryout season, I have seen this happen many times. Being the athlete that doesn't make the team can come with the sense that \"I am not good enough\" and can sting. Again though, the value of an athlete's sense of self worth should not be tied to what they are physically capable of, but when it comes to cheer tryouts, I think it can be hard for athletes to not have that initial feeling. We can't take it personally though. What could be much worse for some athletes would be to have made the team and then have a significant sense of added stress from what is expected of them when they aren't ready for those things to be expected from them. And many athletes experience this who do make it. I think it comes back to what coach Lain said: \"sometimes where an athlete wants to be is not where they need to be.\" That and the reminder that who we are is separate from our physical capabilities or our tumbling skills.",
        ],
      },
    ],
  },
  {
    id: "plateaus-are-information",
    category: 'guide',
    title: "Lesson 8: Plateaus Are Information",
    summary: "You don’t have to figure out if you’re stuck.",
    intro: [
    ],
    qa: [
      {
        question: "When an athlete plateaus, what is your process for figuring out what is actually stuck?",
        answerKey: "plateau-process",
        answer: [
          "> Sometimes an athlete can plateu when their physical capabilites are the limit. Sometimes its that an athlete just needs a new approach.. sometimes they may not be stuck, they could just be in the middle of the process where things can feel slow. The fact that progress is not linear means that days that aren't as good are not setbacks.. just part of the process. You dont have to figure out if youre stuck.. you really just need to stay consistent with effort, pursuit of understanding and doing what is in your control and eventually the skill will happen if its going to happen. there are some athletes that just dont get the handspring despite working on it for several years. But most athletes that work on it for several years and really seem like it might not happen, do get the handspring eventually atleast on a trampoline.. Its amazing to see those athletes just keep going and end up getting the skill because they stayed consistent.",
        ],
      },
      {
        question: "Tell me about a plateau that taught you something. What was stuck, and what unlocked it?",
        answerKey: "plateau-story",
        answer: [
          "I was stuck on kick fulls for a while.. what helped me unlock it were these three things..",
          "1. Realizing that the proper way of learning/doing the skill was going to involve resisting my natural instinct. I could not for the life of me understand aerial (late) twisting.. you have to really convince yourself you are not going to twist.. and resisting the urge to contact twist when thats what youre used to for regular fulls.. super hard.",
          "2. Reference videos.. along with a relentless pursuit of understanding, watching a slow mo video over and over of the skill I was learning helped so much with understanding the physical motion required.",
          "3. Alternating between prerequisites and the skill I was aiming for. I did 5 kick lays for every 1 kick full attempt for a WHILE... before I really could hit a kick full with a late twist. This worked for a lot of skills.. go back and forth between the building blocks and the actual skill and it helps bridge the gap between the movements.",
        ],
      },
    ],
  },
  {
    id: "choosing-a-class",
    category: 'guide',
    title: "Lesson 9: Choosing a Class That Serves the Athlete",
    summary: "We do our best and forget the rest!",
    intro: [
    ],
    qa: [
      {
        question: "How do you help a parent choose the right class for their athlete?",
        answerKey: "choosing-class",
        answer: [
          "They should not be choosing the class, someone with expertise in the progression used at that gym should evaluate their tumbling and then put them in the right place for them to learn what they need to learn. For maximizing safety, technique and likelihood of complementing long term progression, I would personally say that parents should look for environments that offer skill deconstruction, encourage patience with progression, focus on strong prerequisites, and use gymnastics, tnt or powertumbling progressions.",
        ],
      },
      {
        question: "What do you wish parents knew about what your different classes are actually for?",
        answerKey: "class-purpose",
        answer: [
          "To shape young people into being more mentally resilient, hardworking, goal driven, patient with the process, and to consistently put in effort into things they enjoy, develop a sense of value in productivity, gain skills they can contribute to a team, learn to face adversities and to persevere when things are tough. We learn to face fears, to stay focused when the process isn't always gratifying.. there are so many life lessons that tumbling can be good for building on an athlete as a person. Ultimately, people do it because it is fun and thrilling to do things that can be dangerous in a controlled way.",
        ],
      },
      {
        question: "What do you say to the parent who thinks the faster or harder class is automatically better?",
        answerKey: "faster-not-better",
        answer: [
          "Understanding that tumbling skills commonly take several years for athletes is important. Parents should know that. Coaches should know that. Athletes should know that. Gym owners should know that. It is not uncommon for it to take upwards of 3 years for an athlete to get a back handspring. Some skills can take longer for some athletes than it does for other athletes. The biggest thing I can come back to here is that the outcomes are less important than our habits and consistent efforts, determination, pursuit of understanding, and patience. We do our best and forget the rest!",
        ],
      },
    ],
  },
]
