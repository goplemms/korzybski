import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  applyAnswerToMaterial,
  comparePlacesForRanking,
  emptyDecisionMaterial,
  scoreDeltaForAnswer,
} from './decisionMaterial.ts'

test('scoreDeltaForAnswer matches yes/no/skip', () => {
  assert.equal(scoreDeltaForAnswer('yes'), 1)
  assert.equal(scoreDeltaForAnswer('no'), -1)
  assert.equal(scoreDeltaForAnswer('skip'), 0)
})

test('applyAnswerToMaterial updates score, recency, and answer counts', () => {
  let m = emptyDecisionMaterial()
  m = applyAnswerToMaterial(m, 'yes', 1000)
  assert.equal(m.score, 1)
  assert.equal(m.lastInteractedAt, 1000)
  assert.deepEqual(m.answerCounts, { yes: 1, no: 0, skip: 0 })

  m = applyAnswerToMaterial(m, 'no', 2000)
  assert.equal(m.score, 0)
  assert.equal(m.lastInteractedAt, 2000)
  assert.deepEqual(m.answerCounts, { yes: 1, no: 1, skip: 0 })

  m = applyAnswerToMaterial(m, 'skip', 3000)
  assert.equal(m.score, 0)
  assert.deepEqual(m.answerCounts, { yes: 1, no: 1, skip: 1 })
})

test('comparePlacesForRanking prefers higher score', () => {
  const a = { name: 'A', score: 1, lastInteractedAt: 100, answerCounts: { yes: 1, no: 0, skip: 0 } }
  const b = { name: 'B', score: 2, lastInteractedAt: 50, answerCounts: { yes: 2, no: 0, skip: 0 } }
  assert.ok(comparePlacesForRanking(b, a) < 0)
})

test('comparePlacesForRanking tie-breaks score with recency', () => {
  const older = { name: 'Old', score: 1, lastInteractedAt: 100, answerCounts: { yes: 1, no: 0, skip: 0 } }
  const newer = { name: 'New', score: 1, lastInteractedAt: 500, answerCounts: { yes: 1, no: 0, skip: 0 } }
  assert.ok(comparePlacesForRanking(newer, older) < 0)
})

test('comparePlacesForRanking tie-breaks score+recency with name', () => {
  const x = {
    name: 'B',
    score: 0,
    lastInteractedAt: 100,
    answerCounts: { yes: 0, no: 0, skip: 1 },
  }
  const y = {
    name: 'A',
    score: 0,
    lastInteractedAt: 100,
    answerCounts: { yes: 0, no: 0, skip: 1 },
  }
  assert.ok(comparePlacesForRanking(y, x) < 0)
})
