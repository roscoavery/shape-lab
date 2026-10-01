/**
 * Coach interview answers — Ryan's own words for the Parent Guide.
 * Stored in data/coach-interview.json on the gym computer (auto-mirrored).
 */

import { readJson, writeJson } from './persist.ts'

const FILE = 'data/coach-interview.json'

export type CoachInterviewFile = {
  kind: 'shape-lab-coach-interview'
  version: 1
  updatedAt: string
  answers: Record<string, string>
}

const EMPTY: CoachInterviewFile = {
  kind: 'shape-lab-coach-interview',
  version: 1,
  updatedAt: '',
  answers: {},
}

/**
 * One-time migration: applies the Parent Guide editorial pass to live
 * coach-interview answers via targeted phrase replacements.
 * Safe: each replacement only fires if the old phrase is present;
 * already-updated text is untouched. Idempotent.
 */
const PARENT_GUIDE_PHRASE_EDITS: Array<[string, string]> = [["One of the biggest things that leads to an athlete's progress is an intrinsic pursuit of understanding. DETERMINATION and relentless pursuit of understanding, that is one of the many important lessons that come with tumbling and gymnastics. The importance of consistent effort, celebrating small wins, a persistent drive for understanding, and overall pure determination.", "One of the biggest drivers in an athlete's progress is an intrinsic and persistent curiosity. Paired with inner drive and patience, that curiosity can take an athlete far. Some of the many important lessons that come with tumbling and gymnastics are the importance of consistent effort, celebrating small wins, a relentless pursuit of understanding, and the power of determination."],["There are several reasons this could happen. Trauma from falling or having an injury or watching someone get injured, maybe they are coming back from an injury and their body isnt physically ready. Maybe they hit a growth spurt and the skill feels off. Pressure from coaches or parents, or the feeling of conditional acceptance, can cause the athlete to shut down emotionally and enhances their self doubt. Bullying at school, getting a bad grade, overthinking, perfectionism and unwillingness to do a bad rep. Maybe they didnt get it past the early acquisition phase and took some time off. Maybe they mastered it, then hit a growth spurt. Changing body proportions, strength-to-weight shifts, and coordination changes can all make a skill feel different for a while, which can shake their tumbling confidence. Sometimes the physiological responses we get from our nervous system can be completely out of our control and can hinder our ability to perform regardless of how well we understand the skill, how much we have trained it. Whether or not we are prepared and have mastered it at practice. Sometimes the environment can make an athlete struggle to perform a skill they have mastered. Sometimes they just lose the feeling of skill because when they had it, they had a mental understanding of it that they are having trouble grasping again. There are a number of reasons this could happen and every situation can be unique. Some of the most gratifying moments are when these types of athletes make a breakthrough.", "There are several reasons this could happen. Trauma from falling or having an injury or watching someone get injured, maybe they are coming back from an injury and their body isnt physically ready. Maybe they hit a growth spurt and the skill feels off. Pressure from coaches or parents, or the feeling of conditional acceptance can cause the athlete to shut down emotionally and enhance their self doubt. Bullying at school, getting a bad grade, overthinking, perfectionism and unwillingness to do a bad rep. Maybe they didn't get it past the early acquisition phase and took some time off. Maybe they mastered it, then hit a growth spurt. Changing body proportions, chemistry in the brain, strength to weight changes, and coordination changes can all make a skill suddenly feel different, which can throw off an athlete's tumbling confidence. Sometimes the physiological responses we get from our nervous system can be completely out of our control and can hinder our ability to perform regardless of how well we understand the skill or how much we have trained it. Whether or not we are prepared and have mastered it at practice.. Sometimes the environment can make an athlete struggle to perform a skill they have mastered. Sometimes they just lose the feeling of skill because when they had it, they had a mental understanding of it that they are having trouble grasping again. There are a number of reasons this could happen and every situation can be unique. Some of the most gratifying moments are when these types of athletes make a breakthrough."],["Sometimes, if an athlete has trained it correctly, built the right habits and has mastered the drills, then it can become extremely beneficial to focus on more reps of the full skill since we are enforcing the right habits. I wouldnt say to stop doing the drills just because you got it down. Keeping that drill fresh in your mind while doing the skill is also important. Repetition is important for developoing muscle memory and correcting errors, but repetition could be the reason an athlete gets stuck with the wrong habits from doing them without correcting the movements which can be a real setback itself. It can sometimes take longer to correct bad habits than to teach good habits from the start. \"nothing like doing the same job twice you could have done right the first time", "Sometimes, if an athlete has trained it correctly, built the right habits and has mastered the drills, then it can become extremely beneficial to focus on more reps of the full skill since we are enforcing the right habits. I wouldn't say to stop doing the drills just because you got it down. Keeping that drill fresh in your mind while doing the skill is also important. Repetition is important for developoing muscle memory and correcting errors, but repetition could be the reason an athlete gets stuck with the wrong habits from doing them without correcting the movements which can be a real setback in itself. It can sometimes take longer to correct bad habits than to teach good habits from the start. \"nothing like doing the same job twice we could have done right the first time.\u201d"],["Some coaches say once is luck, twice is a coincidence, and 3 times is a skill. I see it a little differently. Landing something once or even 3 times should absolutely be celebrated, but it doesn't quite equal owning the skill yet. Assuming an athlete will be able to hit the skill they landed a few times in one day can set them up for a tumbling block, especially when a cheer coach puts it in the routine or expects them to hit it at practice on command. It can make the athlete feel conditionally accepted, increase fear and stress around the skill, contribute to mental blocks, and completely take the fun out of it. It can also increase risk when an athlete feels pressured to perform something they don't feel ready for. It can become an emotional rollercoaster and cause the athlete to doubt themselves on skills they've previously mastered. Just because an athlete hits a skill 3 times at practice doesn't mean it's time to put it in the routine. It takes consistent effort in maintaining and refining the skill to be ready to compete. There is a place between skill acquisition and mastery where a skill can begin to feel like second nature and be performed with minimal attention to detail after it has been done hundreds to thousands of times intentionally. And some skills may never feel like second nature. They can always feel unnatural and weird to perform and require thought and intention indefinitely.", "Some coaches say once is luck, twice is a coincidence, and 3 times is a skill. I see it a little differently. Landing something once or even 3 times should absolutely be celebrated, but it doesn't quite equal owning the skill yet. Assuming an athlete will be able to consistently hit the skill they landed a few times in one day can potentially set them up for a tumbling block, especially when a cheer coach puts it in the routine or expects them to hit it at practice on command. It can make the athlete feel conditionally accepted, increase fear and stress around the skill, contribute to mental blocks, and completely take the fun out of it. It can also increase risk when an athlete feels pressured to perform something they don't feel fully ready for. It can become an emotional rollercoaster and can sometimes lead the athlete to doubt themselves on skills they've previously mastered. Just because an athlete hits a skill 3 times at practice doesn't mean it's time to put it in the routine or expect it to hit on the spot whenever. It takes consistent effort in maintaining and refining the skill to be ready to compete. There is a place between skill acquisition and mastery where a skill can begin to feel like second nature and be performed with minimal attention to detail after it has been done hundreds to thousands of times intentionally. And some skills may never feel like second nature. Some details may always feel unnatural and weird to perform and require thought and intention to resist unhelpful instincts even after years of experience performing the skill."],["I feel morally obligated to guide athletes through the ones that reduce those risks instead", "I feel there is an ethical obligation to guide athletes through the ones that reduce those risks instead."], ["I feel morally obligated to guide athletes through the ones that reduce those risks instead.", "I feel there is an ethical obligation to guide athletes through the ones that reduce those risks instead."],["I grew up hearing my dad frequently say that there is nothing like doing the same job twice you could've done right the first time, and I think he hit the nail on the head when it comes to tumbling progressions. If we focus too much on acquiring a skill and not how it affects the next one, we can slow our long term progress down drastically by rushing through the process.", "I grew up hearing my dad frequently say that there is nothing like doing the same job twice you could've done right the first time. And I think that concept applies pretty accurately when it comes to tumbling progressions. If we focus too much on acquiring a skill and not how it affects the next one, we can slow our long term progress down drastically by rushing through the process."], ["I grew up hearing my dad frequently say that there is nothing like doing the same job twice you could've done right the first time. And I think he hit the nail on the head when it comes to tumbling progressions. If we focus too much on acquiring a skill and not how it affects the next one. We can slow our long term progress down drastically by rushing through the process.", "I grew up hearing my dad frequently say that there is nothing like doing the same job twice you could've done right the first time. And I think that concept applies pretty accurately when it comes to tumbling progressions. If we focus too much on acquiring a skill and not how it affects the next one, we can slow our long term progress down drastically by rushing through the process."],["relentless pursuit of understanding \u2014 that is one of the many important lessons", "relentless pursuit of understanding, that is one of the many important lessons"], ["Nothing is ever literally perfect \u2014 the expression is a reminder", "Nothing is ever literally perfect. The expression is a reminder"], ["familiar coaching saying \u2014 \"perfect practice makes perfect\" \u2014 and what it really points to", "familiar coaching saying, \"perfect practice makes perfect,\" and what it really points to"], ["then hit a growth spurt \u2014 changing body proportions", "then hit a growth spurt. Changing body proportions"], ["absolutely be part of the conversation \u2014 you know your child", "absolutely be part of the conversation. You know your child"], ["years on a back handspring \u2014 it is not uncommon", "years on a back handspring. It is not uncommon"], ["them getting a the flip over by themselves", "them getting the flip over by themselves"],["One of the biggest things that leads to athlete's progress is an intrinsic pursuit of understanding. DETERMINATION and relentless pursuit of understanding.. That is one of the of the many important lessons","One of the biggest things that leads to an athlete's progress is an intrinsic pursuit of understanding. DETERMINATION and relentless pursuit of understanding, that is one of the many important lessons"],["there is nothing like doing the same job twice you could've done right the first time.. and I think he hit the nail on the head when it comes to tumbling progressions. If we focus too much on acquiring a skill and not how it affects the next one. We can slow","there is nothing like doing the same job twice you could've done right the first time, and I think he hit the nail on the head when it comes to tumbling progressions. If we focus too much on acquiring a skill and not how it affects the next one, we can slow"],["When I am aware that a progression is more likely to increase the risk of injury, I feel morally obligated","When I believe a progression exposes an athlete to unnecessary risk, I feel morally obligated"],["the safest progressions that benefit athletes long term aren't always the most exciting","the progressions I believe are safest for long term development aren't always the most exciting"],["A slower, more technical path can look/feel like holding an athlete back when it's actually is often what's best","A slower, more technical path can look or feel like holding an athlete back when it's often what's actually best"],["If more athletes and parents understood that, I think they'd value when coaches slow the process down a lot more.","When athletes and parents understand that, I think they value it a lot more when coaches slow the process down."],["Ryan says tumbling is full of unnatural feeling techniques. Any unnatural feeling corrections you've noticed are difficult that you can improve on??","Tumbling is full of unnatural feeling techniques. Any unnatural feeling corrections you've noticed are difficult that you can improve on?"],["This is an order of operation. Nothing is ever perfect.. the expression is a reminder","This is an order of operations. Nothing is ever literally perfect. The expression is a reminder"],["It can make the athlete feel conditionally accepted, lead to injuries, increase fear and stress around the skill, and completely take the fun out of it. It can become","It can make the athlete feel conditionally accepted, increase fear and stress around the skill, contribute to mental blocks, and completely take the fun out of it. It can also increase risk when an athlete feels pressured to perform something they don't feel ready for. It can become"],["Our brain can't process more than 3-4 complex corrections, narrowed down to one word at a time, when the skill happens in less than 2 seconds.","There is only so much an athlete can consciously attend to during a movement that may last only a second or two. The more corrections we pile on simultaneously, the harder it becomes to act on any of them."],["It can actually be detrimental to the athlete's progress if they repeat the wrong motion","It can actually work against the athlete's progress if they repeat the wrong motion"],["Practice itself doesn't always make perfect. Perfect practice makes perfect. I would much rather","Practice itself doesn't always make perfect. There's a familiar coaching saying, \"perfect practice makes perfect,\" and what it really points to is quality, intentionality, feedback, and correcting errors. I would much rather"],["Tumbling homework should always be something the athlete does because they are striving to improve, not because their parents make them do it.","My favorite kind of homework is eventually athlete driven. Parents can help by creating time and space to practice, reminding them, encouraging them, or even practicing alongside them, but I want the athlete's own desire to improve to become the main engine."],["Maybe they mastered it, hit puberty and then their hormones go haywire and affect their tumbling confidence..","Maybe they mastered it, then hit a growth spurt. Changing body proportions, strength-to-weight shifts, and coordination changes can all make a skill feel different for a while, which can shake their tumbling confidence."],["Pressure from coaches or parents or the feeling of conditional acceptance causes the athlete to shut down","Pressure from coaches or parents, or the feeling of conditional acceptance, can cause the athlete to shut down"],["They should not be choosing the class, someone with expertise in the progression used at that gym should evaluate their tumbling and then put them in the right place","Parents should absolutely be part of the conversation. You know your child's schedule, happiness, social environment, goals, stress, and life outside the gym in ways a coach may never see. The technical placement itself is usually best guided by someone who understands that gym's progression system and has evaluated the athlete, then put them in the right place"],["It is not uncommon for it to take upwards of 3 years for an athlete to get a back handspring.","In my coaching, I have seen some athletes work for years on a back handspring. It is not uncommon for it to take upwards of 3 years for an athlete to get one."],["will have to just avoid making the car ride home add stress to the situation if possible.","will do their best to keep the car ride home from adding stress to the situation if possible."]];


/**
 * General cleanup: fixes common typos and capitalization in answers.
 */
function generalCleanup(text: string): string {
  // Fix standalone 'ther' -> 'there'
  text = text.replace(/\bther\b/g, 'there');
  text = text.replace(/\bTher\b/g, 'There');
  // Fix 'a the' typo
  text = text.replace(/\ba the\b/g, 'the');
  // Fix double periods
  text = text.replace(/\.\./g, '.');
  // Fix double spaces
  text = text.replace(/  +/g, ' ');
  // Capitalize after period+space (skip abbreviations)
  text = text.replace(/\. ([a-z])/g, (match, letter, offset) => {
    const before = text.slice(Math.max(0, (offset as number) - 10), offset as number);
    if (/\b(e\.g|i\.e|vs|etc|Mr|Mrs|Ms|Dr)$/i.test(before.trim())) return match;
    return '. ' + (letter as string).toUpperCase();
  });
  // Capitalize after ? and !
  text = text.replace(/([?!]) ([a-z])/g, (_m, p, l) => p + ' ' + (l as string).toUpperCase());
  return text;
}

let parentGuideMigrationDone = false;

async function migrateParentGuideEdits(current: CoachInterviewFile): Promise<CoachInterviewFile> {
  if (parentGuideMigrationDone) return current;
  parentGuideMigrationDone = true;
  const answers: Record<string, string> = { ...current.answers };
  let changed = false;
  for (const key of Object.keys(answers)) {
    let text = answers[key];
    if (typeof text !== 'string' || !text) continue;
    for (const [oldPhrase, newPhrase] of PARENT_GUIDE_PHRASE_EDITS) {
      if (text.includes(oldPhrase)) {
        text = text.split(oldPhrase).join(newPhrase);
        changed = true;
      }
    }
    const cleaned = generalCleanup(text);
    if (cleaned !== text) {
      text = cleaned;
      changed = true;
    }
    answers[key] = text;
  }
  if (!changed) return current;
  const next: CoachInterviewFile = { ...current, answers, updatedAt: new Date().toISOString() };
  await writeJson(FILE, next);
  return next;
}

export async function readCoachInterviewFile(): Promise<CoachInterviewFile> {
  const data = await readJson<CoachInterviewFile>(FILE, { ...EMPTY })
  if (!data || data.kind !== 'shape-lab-coach-interview' || typeof data.answers !== 'object') {
    return { ...EMPTY }
  }
  return migrateParentGuideEdits(data)
}

export async function writeCoachInterviewFile(data: unknown): Promise<CoachInterviewFile> {
  const parsed = data as Partial<CoachInterviewFile>
  const answers: Record<string, string> = {}
  const incoming = parsed.answers && typeof parsed.answers === 'object' ? parsed.answers : {}
  for (const [id, text] of Object.entries(incoming)) {
    if (!id || typeof text !== 'string') continue
    const trimmed = text.trim()
    if (trimmed) answers[id] = text
  }
  const next: CoachInterviewFile = {
    kind: 'shape-lab-coach-interview',
    version: 1,
    updatedAt: new Date().toISOString(),
    answers,
  }
  await writeJson(FILE, next)
  return next
}
