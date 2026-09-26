/**
 * Parent Guide — in Ryan's own words.
 *
 * Every paragraph below is Ryan, verbatim, from his 28 coach-interview
 * answers (2026-09-25). Nothing rewritten: each lesson is his answers to
 * that lesson's questions, in interview order, with the question shown
 * before each answer. His determination note opens the intro lesson.
 * first-landing-parent is omitted — his answer there pointed at another box.
 *
 * To refresh after he edits answers: re-run the generator against
 * docs/coach-interview-answers-2026-09-25.md (mirrors data/coach-interview.json).
 */

export type ParentEducationCategory = 'guide'

export const PARENT_EDUCATION_CATEGORIES: { id: ParentEducationCategory; label: string }[] = [
  { id: 'guide', label: 'Parent Guide' },
]

export type ParentEducationArticle = {
  id: string
  category: ParentEducationCategory
  title: string
  summary: string
  body: string[]
}

export const PARENT_EDUCATION: ParentEducationArticle[] = [
  {
    id: "what-progress-looks-like",
    category: 'guide',
    title: "What Progress Looks Like",
    summary: "Progress is not linear.",
    body: [
      "the most important thing for progress is a relentless pursuit of understanding. DETERMINATION will get you anywhere you want to be and if you are determined enought to improve, you will improve. That is one of the of the biggest life lessons that comes with tumbling and gymnastics for sure.  the importance of consistent effort, celebrating small goals, a relentless pursuit of understanding, and overall pure determination.",
      "When a parent only asks about what new skill their kid got, what do you wish they understood about progress?",
      "Progress is not linear. Every athlete will have ups and downs throughout their journey.",
      "My dad always said \"ain't nothing like doing the same job twice you could've done right the first time..\" and boy does this apply to tumbling.. if we focus too much on acquiring a skill and not how it affects the next one. We can slow our long term progress down drastically.",
      "Fast is slow and slow is fast… \"Coach Jim\"",
      "Focusing on the right habits and consistency goes a much longer way than seeking shortcuts.",
      "Tumbling has its hazards. A coach may feel morally obligated to guide athletes through a progressions that reduce injury risks. If I know that a method is more likely to increase the risk of injury, it is my moral duty to guide the athlete through the ones that reduce those risks.. sometimes the progressions coaches use that are best for business and look most attractive, are the ones other coaches feel obligated to avoid using. Sometimes, progressions that attract more business are the ones that hinder long term growth. Coaches may use them because it pleases people and attracts more business, not because it's best for the athlete's long term progression. All of us coaches have to find a balance with how far to go in either direction. The longer I've been in the game, the more I've realized that progressions that work are the least attractive for business and coaches who care the most about what's best for the athlete may be more likely to be disliked for that. If people only knew our intention and hopes for the athlete.. athletes don't like feeling held back so some coaches feel obligated to allow them to move to that harder skill to keep the athlete happy in that moment. It can be easy to prioritize pleasing athletes and parents in the moment over what is best for their long term progression and overall safety. If more athletes and parents could understand that, they might value technical coaches who slows the process down a lot more. Progress is not all about leveling up and getting new skills. Putting in consistent effort and making improvements that can feel like getting 1% better are the ones that add up to real long term growth.",
      "Slow and steady wins the race. Mastering the basics can often open the door to higher level tumbling more than just sending skills til they get it.",
      "What are the quiet improvements you notice in an athlete that parents usually miss?",
      "Hand position, handstand lines, lunge lever handstand improvements. It's easy to overlook the small wins.. not every win is about getting a new skill! Speeding up a little on the handspring series or hitting more accurate shapes in sequences we used last week are wins worth acknowledging!! Doing a a few solid proper reps on a skill they have had for a while is still a win. I feel a notable sense of gratification when I do a nice standing tuck even though it's easy for me! Those reps are productive!",
      "What is a question a parent could ask their athlete after practice that would actually tell them something useful?",
      "Did you learn anything?",
      "What's something that you know you can improve to get closer to your goal?",
      "What's something small you improved on?",
      "Ryan says tumbling is full of unnatural feeling techniques. Any unnatural feeling corrections you've noticed are difficult that you can improve on??",
    ],
  },
  {
    id: "why-still-working-on-basics",
    category: 'guide',
    title: "Lesson 1: Why Are We Still Working on Basics?",
    summary: "The stronger the basics, the stronger the harder skills can be.",
    body: [
      "A parent asks: \"Why is my kid still doing handstands when they want to learn a back tuck?\" What do you tell them?",
      "The handstand is a staple in tumbling. The stronger the basics, the stronger the harder skills can be.",
      "Tell me about a time a basic unlocked a harder skill for one of your athletes. What was the basic, what was the skill, what changed?",
      "I had to go back to handsprings because I rushed round off tucks. We can't really ever get a round off handspring double if we never get a round off handspring. It's common for athletes to get stuck on round off handsprings because they learned their handspring before having a strong round off. It's common for athletes to get stuck on tucks because they worked it out of a round off before refining their series. Can't move onto the RO hs lay without a strong round off handspring tuck.",
      "The stronger my layout is, the stronger my fulls and dubs can be.",
      "The more accurate my shapes hit in a sequence like \"pike tuck hollow arch\", the stronger my shapes can be in a lightning fast tumbling sequence while passing through the upside down with several other things to think about.",
      "What does \"perfection before progression\" mean in your coaching? When did you learn that?",
      "This is an order of operation. Nothing is ever perfect.. the expression is a reminder to walk before you run. Set your standards high with prerequisites and your higher level skills will be easier to learn and achieve. Both tumble doc (Alvin Davis) and coach sahil (addicted to tumbling) have this philosophy written publicly.",
    ],
  },
  {
    id: "doing-it-once-vs-owning-it",
    category: 'guide',
    title: "Lesson 2: Doing It Once and Owning It",
    summary: "Landing it once or even 3 times should be celebrated but does not equal having the skill.",
    body: [
      "How do you explain the difference between landing something once and actually owning it?",
      "Some coaches will say once is luck, twice is a coincidence and 3 times is a skill. Respectfully hard disagree.. this idea that once you land something once and now you have it is a dangerous mindset. Landing it once or even 3 times should be celebrated but does not equal having the skill. Assuming that the athlete will be able to hit the skill they hit one to 3 times in one day is a recipe for creating a tumbling block when a cheer coach puts it in the routine or expects them to hit it at practice on command. It can make the athlete feel conditionally accepted and lead to injuries, increased fear and stress revolving the skill and completely take the fun out of the skill. It can become an emotional rollercoaster and cause the athlete to doubt themselves on skills they've previously mastered. Do not assume that just because an athlete hits the skill 3 times at practice that it's time to put in the routine. It takes consistent effort in maintaining and refining the skill to be ready to compete. There is a place between skill acquisition and mastery where a skill can begin to feel like second nature and be performed with minimal requirements for attention to detail after it has been done hundreds to thousands of times intentionally. Some skills may never feel like second nature and can always feel unnatural and weird to be performed and require thought and intention to work indefinitely.",
      "Walk me through the stages an athlete goes through learning a skill, in your own words. What does each stage look like from where you stand?",
      "Skill introduction, skill approximation, skill acquisition, skill mastery.",
      "ill prob go back and add more but ive comminicated this stuff already..",
    ],
  },
  {
    id: "why-not-just-try-the-skill",
    category: 'guide',
    title: "Lesson 3: Why Doesn’t the Coach Just Let Them Try It?",
    summary: "If I have 20 details to think about in 2 seconds, I will fail.",
    body: [
      "When you choose a drill instead of letting them throw the full skill, what are you seeing that makes that call?",
      "The idea here is that to perform a complex skill, we have to consider how quickly it happens and how much though has to be put into creating the habits required for the movement to work. Our brain cannot process more than 3-4 complex corrections narrowed down to one word at a time when the skill happens in less than 2 seconds. If we can break the movement into pieces, assign a handful of corrections to each piece and build the habits up to where we can do each piece correctly without having to think to much about it, then we can minimize the amount of thoughts required at a time for the skill to be trained. If I have 20 details to think about in 2 seconds, I will fail. If I can master a piece of the movement with 2-3 corrections at a time.. then another part of the movement and then another part of the movement.. at some point, we can make a skill much easier for our brain to process and our bodies to perform. Training the full movement over and over without mastering its puzzle pieces is a recipe for missed details. Deconstruction is an amazing tool for teaching and learning anything that requires complex understanding.",
      "Give me an example of a specific explanation you have given a parent about what you are building and why. The more concrete the better.",
      "We learn the sequence \"pike hollow arch\" and we learn the cartwheel step in zombie so we can put them together as a connection drill. We build on the motions by doing the sequence out of a round off to zombie and eventually progress to a sweep through drill where we skip the zombie shape. This leads to athletes ability to getting their feet in front very easily when doing a round off back handspring connection.",
      "What do you think when you hear \"they just need more reps of the full skill\"?",
      "Repetition builds habits.. it's that simple.. repeating the same motion over and over and over and over does not always lead to improving the movement. It can actually be detrimental to the athlete's progress if they repeat the wrong motion over and over and build a habit that doesn't serve them. Repetition is important for building muscle memory and building habits. The movements we repeat need to be intentional in order for reps to build good habits.",
      "Practice doesn't make perfect. Perfect practice makes perfect. I would much rather see an athlete do 5 clean and intentional handspring reps in a class that breaks the skill down than to see them \"throw\" 15-20 reps that focus on them getting it by themselves.",
      "Sometimes, if an athlete has trained it correctly, built the right habits and have mastered the drills, then it can be extremely beneficial to focus on more reps of the full skill since we are enforcing the right habits. Repetition is important for skill acquisition and mastery. But repetition could be the reason an athlete gets stuck with the wrong habits and it can take longer to correct bad habits than to teach good habits from the start. \"Ain't nothing like doing the same job twice you could have done right the first time..\"",
    ],
  },
  {
    id: "small-habits-big-skills",
    category: 'guide',
    title: "Lesson 4: Small Habits Build Big Skills",
    summary: "Perfection before progression does not contradict \"progress, not perfection\"",
    body: [
      "What does useful homework look like? And when does homework cross the line into pressure?",
      "Tumbling homework should always be something the athlete does because they are striving to improve, not because their parents make them do it. My hope is that as a coach, I tell the athletes why they need to work what they need to work well enough to the point they want to do it intrinsically on their own.  Useful homework is anything the athlete can do outside of classes/practice/lessons that will build up their tumbling. They could be doing intentional reps on the trampoline at home, practing cartwheels, lunge lever handstnds, studying shapes, watching reference videos, watching videos of their own tumbling, doing strength training, wall handstands.. drills you can do at home or even just intentionally focusing on the skill and thinking about how to improve it.",
      "What does \"progress, not perfection\" mean to you as the mindset you want in your athletes?",
      "this is a mindset that encourages athletes to celebrate the small wins. Not prioritizing focus on leveling up rather than perfecting the skills they have. Perfection before progression does not contradict \"progress, not perfection\" the two mindsets can be held simultaneously. one is an order of operations, and one is a mindset. We dont skip the prerequisites that still need work and say \"progress not perfection\"…  and use that as a reason to stop striving to master the basics.",
      "If a parent asked you \"what is the one small thing my kid should focus on this week,\" how do you come up with the answer?",
      "This depends on the athlete. I would look at what they need work on and base my answer off of that. Athletes generally can always improve their understanding of a skill by watching references.  Staying on top of some amount of conditioning and building up their hollow hold times, doing some extra work on core exercises or maybe i send them an arch to hollow exercise they can do for their back handsprings. sometimes i send a video that explains how twisting works.. Like most things, the answer is that it depends on the athlete.",
    ],
  },
  {
    id: "time-to-move-up",
    category: 'guide',
    title: "Lesson 5: How Do We Know It Is Time to Move Up?",
    summary: "\"sometimes where an athlete wants to be is not where an athlete needs to be.\"",
    body: [
      "What are your actual criteria for moving an athlete up a class? Name the two or three things they have to show you.",
      "This depends on the athlete and the skill level and class that they are in. Not all gym’s require the same things for an athlete to move up. if they are ahead of the rest of the class and could benefit more from being in another class, this is more important than sticking to a clear criteria for them to master.. they need to be in an environment that challenges them and allows them to focus on what they need to be focused on. If they have mastered the criteria in the class and have what they need to work what is focused on in the next class, they move up.. sometimes we move an athlete up into a higher level class to keep them with athletes the same age as long as we can continue focusing on what that athlete needs.. the overal athlete experience is important to take into account for. What is best for the athlete’s progression is not always what is best to keep them in the program.. what is best for keeping them in the program is not always what is best for the athlete’s progression.",
      "this question could maybe get more tailored to skill specific classes but then again we have a skill pathway for that..",
      "How do you explain to a parent that their kid is not ready to move up yet, without it feeling like bad news?",
      "Coach lain said this one best.. \"sometimes where an athlete wants to be is not where an athlete needs to be.\"  for teams, we want to put the aces in their places.  for progression, we need to be in a class best suited for where they are in their tumbling journey. For this to not be troubling for athletes and parents, its helpful to be reminded that all we can do is what is within our control. We cant control how fast we pick up on the techniques given to us by our coaches. Coaches cant control how fast an athlete progresses. We just stay true to the process, put our best foot forward(not literally.. for my right handed left tumblers) and do everything within our control to maximize what we take from practice with effort, pursuit of understanding, celebrating progress and staying patient.",
      "What does \"ready for the next class\" actually look like to you on the floor?",
      "The athlete is killin it with the drills theyre training, they have the skills the drills were meant to train them to perform and are performing the skills independantly in ways that will complement the next skill. for teams, it is all based off of what their coaches decide. Sometimes gymnasts skip levels because of certain skills being too hard but harder skill being easier for them.. sometimes a cheerleader moves up not because of tumbling, but because of stunting. Maybe they stay on a lower level team because they need more work in stunts even though they have the tumbling requirments for the next level. sometimes an athlete is not mentally mature enough to move to a higher level team when their skills have advanced beyond their age. The goal is to put the athlete in a place that will maximize benefit for not only themselves, but for the team.",
    ],
  },
  {
    id: "when-a-skill-feels-scary",
    category: 'guide',
    title: "Lesson 6: When a Skill Suddenly Feels Scary",
    summary: "be a safe place for them to talk. be their anchor.",
    body: [
      "An athlete who could do a skill suddenly can’t. Walk me through what you do, and what you tell the parent.",
      "There are several reasons this could happen.. trauma from falling or having an injury or watching someone get injured, maybe they are coming back from an injury and their body isnt phyiscally ready.. Maybe they hit a growth spurt and the skill feels off. Pressure from coaches or parents or the feeling of conditional accpetance causes the athlete to shutdown emotionally and enhances their self doubt. Bullying at school, getting a bad grade, overthinking, perfectionism and unwillingness to do a bad rep. maybe they didnt get it past the early acquisition phase and took some time off. Maybe they mastered it, hit puberty and then their hormones go haywire and affect their tumbling confidence.. sometimes the physiological responses we get from our nervous system can be completely out of our control and can hinder our ability to perform regarrdless of how well we understand the skill, how much we have trained it. whether or not we are prepared and have mastered it at practice. sometimes the enveronment can make an athlete struggle to perform a skill they have mastered. sometimes they just lose the feeling of skill because when they had it, they had a mental understanding of it that they are having trouble grasping again.. There are a number of reasons this could happen and every situation can be unique. Some of the most gratifying moments are when these types of athletes make a breakthrough.",
      "what should they do? it depends on the athlete and the reason why the skill feels lost. Sometimes it is a technique gap that needs filled in.. sometimes they just need a coach to listen to them. Sometimes they need to condition so they can gain the strength required for the skill if its from an injury or a growth spurt. There are many solutions to point to and pointing at the right one genuinely depends on the athlete and their situation.",
      "What do you wish parents understood about fear in this sport?",
      "unconditional support involves seperating an athlete's value as a human from how they perform as an athlete. be a safe place for them to talk. be their anchor. be the person that always is supportive not by providing coaching cues or telling them not to be scared.. but by listening and putting effort into understanding and helping them find resources that will help support their growth. taking away all pressure and expectations of performance and providing hope, love, acceptance for where they are in the process, what theyre going through emotionally, mentally and just being there to help however they can. reminding them what is within their control and what is not and helping them to let go of outcomes out of their control and to focus solely on the process and things within their control that they can do.",
      "What does rebuilding confidence look like day to day? Give me a real example if you have one.",
      "Remind them that consistent effort over time plus small wins adds up over time. I was talking with Levi about this the other day.. its almost like consistent progress focusing on the process like that can be like compounded interest. it stacks and stacks and the better they get, the more progress they make with the effort put in. I think there is like an S curve in the sense that it exponentially stacks progress but you can get to a point where you have gotten to such a high level of tumbling that any progress can only be small things. adding a half turn to a triple full is much harder than adding a half twist to a layout. The main point is that explaining to athletes how those small wins are exactly what to be aiming for, it will help the athlete to focus on those kinds of wins and acknowledge and appreciate them.",
    ],
  },
  {
    id: "what-to-praise",
    category: 'guide',
    title: "Lesson 7: What Should I Praise After Practice?",
    summary: "It always comes back to doing what is within our control and trying not to get too hung up on outcomes we cant control.",
    body: [
      "What should a parent say in the car ride home? What should they not say?",
      "This depends on the athlete, like most things. It depends on how they seem emotionally and what kind of adversities they could be going through, what has been going on surrounding practice or life. Some days for some athletes you might just wanna listen to music. You might ask them how it went, if they learned some good stuff or did any cool tricks. If you are a parent of an athlete who is struggling with fear on a skill and seems emotionally drained by it, these sometimes could be moments that open the door to conversations where you have to acknowledge the thing that must be frustrating, be as encouraging and supportive as you can, reminding them that as long as they are doing their best that is all they can do. It always comes back to doing what is within our control and trying not to get too hung up on outcomes we cant control. Saying things like \"did you throw your back handspring?\" or \"did you do your full?\" maybe aren't a great way of approaching the situation from the athlete's perspective if it is an emotionally draining situation for them. Just reading their body language and doing your best to intentionally be the best you can be for them is all the parents can do. Ultimately, parents know their athletes better than anyone and will have to just avoid making the car ride home add stress to the situation if possible.",
      "How do you keep an athlete’s sense of worth separate from whether they landed something that day?",
      "> Well… who we are is not exactly what skills we can do. We assign value to who we are, not to what physical capabilities we have or how fast we learn things. Is someone who never gets the skill worth less for who they are than the person who did get the skill? Sounds silly when you take it further. There is no shame in struggling to learn how to tumble. Now the feeling of gratification an athlete gets from knowing they hit a skill that was challenging for them is like the feeling adults get when we have a good day of work or get something productive done. There is a sense of gratification that comes with doing productive things at the end of the day, and days when we feel like we put in a bunch of work but get very little back is how it can feel to be an athlete who spent a tumbling session struggling to do what they were trying to do. So I think it's not as much about assigning self worth to their tumbling abilities sometimes. Sometimes it just can feel like work with no pay.\n>\n> Now I think during tryout season, I have seen this happen many times. Being the athlete that doesn't make the team can come with the sense that \"I am not good enough\" and can sting. Again though, the value of an athlete's sense of self worth should not be tied to what they are physically capable of, but when it comes to cheer tryouts, I think it can be hard for athletes to not have that initial feeling. We cant take it personally though. What could be much worse for some athletes would be to have made the team and then have a significant sense of added stress from what is expected of them when they aren't ready for those things to be expected from them. And many athletes experience this who do make it. I think it comes back to what coach Lain said: \"sometimes where an athlete wants to be is not where they need to be.\" That and the reminder that who we are is separate from our physical capabilities or our tumbling skills.",
    ],
  },
  {
    id: "plateaus-are-information",
    category: 'guide',
    title: "Lesson 8: Plateaus Are Information",
    summary: "You don’t have to figure out if you’re stuck.",
    body: [
      "When an athlete plateaus, what is your process for figuring out what is actually stuck?",
      "> Sometimes an athlete can plateu when their physical capabilites are the limit. Sometimes its that an athlete just needs a new approach.. sometimes they may not be stuck, they could just be in the middle of the process where things can feel slow. The fact that progress is not linear means that days that aren't as good are not setbacks.. just part of the process. You dont have to figure out if youre stuck.. you really just need to stay consistent with effort, pursuit of understanding and doing what is in your control and eventually the skill will happen if its going to happen. there are some athletes that just dont get the handspring despite working on it for several years. But most athletes that work on it for several years and really seem like it might not happen, do get the handspring eventually atleast on a trampoline.. Its amazing to see those athletes just keep going and end up getting the skill because they stayed consistent.",
      "Tell me about a plateau that taught you something. What was stuck, and what unlocked it?",
      "I was stuck on kick fulls for a while.. what helped me unlock it were these three things..",
      "1. Realizing that the proper way to learning/doing the skill was going to involve resisting my natural instinct. I could not for the life of me understand aerial (late) twisting.. you have to really convince yourself you are not going to twist.. and resisting the urge to contact twist when thats what youre used to for regular fulls.. super hard.",
      "2. References videos.. along with a relentless pursuit of understanding, watching a slow mo video over an over of the skill I was learning helped so much with understanding the physical motion required.",
      "3..alternating between prerequisites and the skill I was aiming for. I did 5 kick lays for every 1 kick full attempt for a WHILE... before i really could hit a kick full with a late twist. This workd for a lot of skills.. go back and forth between the building blocks and the actual skill and it helps bridge the gap between the movements.",
    ],
  },
  {
    id: "choosing-a-class",
    category: 'guide',
    title: "Lesson 9: Choosing a Class That Serves the Athlete",
    summary: "We do our best and forget the rest!",
    body: [
      "How do you help a parent choose the right class for their athlete?",
      "They should not be choosing the class, someone with expertise in the progression used at that gym should evaluate their tumbling and then put them in the right place for them to learn what they need to learn. For maximizing safety, technique and likelihood of complimenting longterm progression, I would personally say that parents should look for environments that offer skill deconstruction, encourage patience with progression, focus on strong  prerequsites, and use gymnastics, tnt or powertumbling progressions.",
      "What do you wish parents knew about what your different classes are actually for?",
      "To shape young people into being more mentally resilient, hardworking, goal driven, patient with the process, and to consistently put in effort into things they enjoy, develop a sense of value in productivity, gain skills they can contribute to a team, learn to face adversities and to perservere when things are tough. We learn to face fears, to stay focused when the process isnt always gratifying.. there are so many life lessons that tumbling can be good for building on an athliete as a person. Ulitimately, people do it because it is fun and thrilling to do things that can be dangerous in a controlled way.",
      "What do you say to the parent who thinks the faster or harder class is automatically better?",
      "Understanding that tumbling skills commonly take several years for athletes is important. Parents should know that. Coaches should know that. Athletes should know that. Gym owners should know that. It is not uncommon for it to take upwards of 3 years for an athlete to get a back handspring. some skills can take longer for some athletes than it does for other athletes. The biggest thing I can come back to here is that the outcomes are less important than our habits and consistent efforts, determination, pursuit of understanding, and patience. We do our best and forget the rest!",
    ],
  },
]
