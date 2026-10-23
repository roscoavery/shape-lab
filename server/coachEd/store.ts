import { readJson, writeJson } from '../persist.ts'
import { normalizeFile, normalizeProgress, type CoachEdFile, type ProgressFile } from './model.ts'

const FILE = 'data/coach-ed.json'
const PROGRESS_FILE = 'data/coach-ed-progress.json'

export async function readCoachEd(): Promise<CoachEdFile> {
  return normalizeFile(await readJson<unknown>(FILE, null))
}
export async function writeCoachEd(file: CoachEdFile): Promise<void> {
  await writeJson(FILE, file)
}
export async function readProgress(): Promise<ProgressFile> {
  return normalizeProgress(await readJson<unknown>(PROGRESS_FILE, null))
}
export async function writeProgress(file: ProgressFile): Promise<void> {
  await writeJson(PROGRESS_FILE, file)
}
