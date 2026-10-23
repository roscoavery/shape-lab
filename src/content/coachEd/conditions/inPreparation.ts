import type { Condition, Region, TissueId, Urgency } from '../types'

/**
 * Library entries that are planned but not yet written to the full 21-section
 * standard. They are listed so coaches can see the scope, and are always
 * labeled "In preparation". They carry no medical claims.
 */
function prep(
  id: string,
  name: string,
  regions: Region[],
  tissues: TissueId[],
  urgency: Urgency,
  tags: string[] = [],
  aliases: string[] = [],
): Condition {
  return {
    id,
    name,
    aliases,
    regions,
    tissues,
    tags,
    urgency,
    completeness: 'in_preparation',
    review: 'draft',
    related: [],
    mediaIds: [],
    preparationNote:
      'This entry is in preparation. No guidance is given here yet. If an athlete may have this injury, use Injury Response and involve a qualified clinician.',
  }
}

export const IN_PREPARATION: Condition[] = [
  prep('muscle-contusion', 'Muscle contusion (deep bruise)', ['muscle_tendon'], ['muscle'], 'soon', ['bruise', 'impact']),
  prep('muscle-strain-general', 'Muscle strain (general)', ['muscle_tendon'], ['muscle'], 'soon', ['pulled muscle']),
  prep('tendinopathy-general', 'Tendinopathy (general)', ['muscle_tendon'], ['tendon'], 'soon', ['overuse']),
  prep('achilles-rupture', 'Achilles tendon rupture', ['muscle_tendon', 'ankle_foot'], ['tendon'], 'same_day', ['pop', 'push off']),
  prep('peroneal-tendon', 'Peroneal tendon injury', ['ankle_foot'], ['tendon'], 'soon', ['outside ankle']),
  prep('plantar-fasciitis', 'Plantar fasciitis', ['ankle_foot'], ['fascia'], 'soon', ['heel', 'arch']),
  prep('fifth-metatarsal-fracture', 'Fifth metatarsal fracture', ['ankle_foot', 'bone'], ['bone'], 'same_day', ['foot', 'landing']),
  prep('osteochondral-talus', 'Talus osteochondral lesion', ['ankle_foot'], ['cartilage'], 'soon', ['ankle', 'catching']),
  prep('patellofemoral-pain', 'Patellofemoral pain', ['knee'], ['cartilage', 'tendon'], 'soon', ['kneecap', 'stairs'], ["runner's knee"]),
  prep('patellar-tendinopathy', 'Patellar tendinopathy', ['knee'], ['tendon'], 'soon', ['jumper knee'], ["jumper's knee"]),
  prep('patellar-dislocation', 'Patellar dislocation', ['knee'], ['joint_capsule'], 'same_day', ['kneecap', 'twist']),
  prep('mcl-lcl-sprain', 'MCL and LCL sprain', ['knee'], ['ligament'], 'same_day', ['knee', 'side impact']),
  prep('pcl-injury', 'PCL injury', ['knee'], ['ligament'], 'same_day', ['knee', 'fall']),
  prep('sinding-larsen', 'Sinding-Larsen-Johansson syndrome', ['knee'], ['growth_plate', 'tendon'], 'soon', ['kneecap', 'growth']),
  prep('lumbar-disc', 'Lumbar disc injury', ['spine_pelvis'], ['cartilage'], 'same_day', ['back', 'leg pain']),
  prep('si-joint-pain', 'Sacroiliac joint pain', ['spine_pelvis'], ['joint_capsule'], 'soon', ['pelvis', 'low back']),
  prep('pelvic-avulsion', 'Pelvic apophysis avulsion injury', ['spine_pelvis', 'bone'], ['growth_plate', 'bone'], 'same_day', ['hip', 'split', 'sprint']),
  prep('hip-labrum', 'Hip labral tear', ['spine_pelvis'], ['cartilage'], 'soon', ['hip', 'catching', 'groin']),
  prep('snapping-hip', 'Snapping hip', ['spine_pelvis'], ['tendon'], 'soon', ['hip', 'snap']),
  prep('cervical-strain', 'Neck muscle strain', ['spine_pelvis', 'muscle_tendon'], ['muscle'], 'same_day', ['neck']),
  prep('scoliosis', 'Scoliosis', ['spine_pelvis'], ['bone'], 'soon', ['curve', 'posture']),
  prep('shoulder-instability', 'Shoulder instability', ['upper_limb'], ['ligament', 'joint_capsule'], 'same_day', ['dislocation', 'bars']),
  prep('shoulder-labrum', 'Shoulder labral tear (SLAP)', ['upper_limb'], ['cartilage'], 'soon', ['shoulder', 'hang']),
  prep('rotator-cuff', 'Rotator cuff strain or tendinopathy', ['upper_limb'], ['tendon', 'muscle'], 'soon', ['shoulder', 'overhead']),
  prep('elbow-dislocation', 'Elbow dislocation', ['upper_limb'], ['joint_capsule', 'ligament'], 'emergency', ['fall', 'deformity']),
  prep('elbow-ocd', 'Capitellum osteochondritis dissecans', ['upper_limb'], ['cartilage', 'bone'], 'soon', ['elbow', 'weight bearing']),
  prep('elbow-hyperextension', 'Elbow hyperextension injury', ['upper_limb'], ['ligament'], 'same_day', ['elbow', 'fall']),
  prep('tfcc-tear', 'TFCC injury (ulnar wrist)', ['upper_limb'], ['cartilage', 'ligament'], 'soon', ['wrist', 'ulnar side']),
  prep('wrist-sprain', 'Wrist sprain', ['upper_limb'], ['ligament'], 'same_day', ['wrist', 'fall']),
  prep('finger-injuries', 'Finger sprains, jams, and dislocations', ['upper_limb'], ['ligament', 'bone'], 'same_day', ['finger', 'bars', 'jam']),
  prep('buckle-greenstick', 'Buckle and greenstick fractures', ['bone'], ['bone'], 'same_day', ['child', 'forearm', 'fall']),
  prep('clavicle-fracture', 'Clavicle fracture', ['bone', 'upper_limb'], ['bone'], 'same_day', ['collarbone', 'fall']),
  prep('forearm-fracture', 'Forearm fracture', ['bone', 'upper_limb'], ['bone'], 'emergency', ['fall', 'deformity']),
  prep('stinger-burner', 'Stinger (burner) nerve injury', ['neuro'], ['nerve'], 'same_day', ['arm', 'neck', 'burning']),
  prep('exertional-heat', 'Exertional heat illness', ['neuro'], ['brain'], 'emergency', ['heat', 'collapse']),
]
