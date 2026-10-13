import {
  beforeEach, describe, expect, it,
} from 'vitest';
import { DRAFT_TTL_MS } from '../constants/persistence';
import { createEmptyApplication } from '../store/initialApplication';
import {
  deleteAllDrafts, draftKeyFor, listDrafts, loadDraft, saveDraft,
} from './draftStorage';

function snapshot(loanType: 'home' | 'personal' | '' = 'home') {
  const data = createEmptyApplication();
  data.loan.loanType = loanType;
  data.loan.loanAmount = 40_00_000;
  data.kyc.pan = 'ABCPE1234F';
  return { data, currentStepId: 'address' as const };
}

describe('draft storage', () => {
  beforeEach(() => localStorage.clear());

  it('saves an encrypted draft under lendswift_draft_[loanType] with metadata', async () => {
    const summary = await saveDraft(snapshot(), 'tab-a');
    expect(summary).toMatchObject({
      key: 'lendswift_draft_home', step: 'address', loanType: 'home', version: '1.0',
    });
    expect(localStorage.getItem('lendswift_draft_home')).toMatch(/^v1\./);
    expect(localStorage.getItem('lendswift_draft_home')).not.toContain('ABCPE1234F');
    expect(JSON.parse(localStorage.getItem('lendswift_draft_home_meta') ?? '{}')).toMatchObject({ step: 'address' });
  });

  it('restores exactly what was saved', async () => {
    await saveDraft(snapshot(), 'tab-a');
    await expect(loadDraft(draftKeyFor('home'))).resolves.toEqual(snapshot());
  });

  it('moves the draft when this tab changes loan type', async () => {
    await saveDraft(snapshot(''), 'tab-a');
    await saveDraft(snapshot('personal'), 'tab-a');
    expect(listDrafts().map((draft) => draft.key)).toEqual(['lendswift_draft_personal']);
  });

  it('keeps drafts written by other tabs', async () => {
    await saveDraft(snapshot('home'), 'tab-a');
    await saveDraft(snapshot('personal'), 'tab-b');
    expect(listDrafts()).toHaveLength(2);
  });

  it('purges drafts older than 72 hours', async () => {
    await saveDraft(snapshot(), 'tab-a');
    expect(listDrafts(Date.now() + DRAFT_TTL_MS + 1000)).toEqual([]);
    expect(localStorage.getItem('lendswift_draft_home')).toBeNull();
  });

  it('rejects a tampered draft', async () => {
    await saveDraft(snapshot(), 'tab-a');
    const sealed = localStorage.getItem('lendswift_draft_home') ?? '';
    localStorage.setItem('lendswift_draft_home', `${sealed.slice(0, -6)}AAAAAA`);
    await expect(loadDraft('lendswift_draft_home')).rejects.toThrow(/damaged or was changed/);
  });

  it('rejects drafts from another schema version', async () => {
    await saveDraft(snapshot(), 'tab-a');
    const meta = JSON.parse(localStorage.getItem('lendswift_draft_home_meta') ?? '{}');
    localStorage.setItem('lendswift_draft_home_meta', JSON.stringify({ ...meta, version: '0.9' }));
    await expect(loadDraft('lendswift_draft_home')).rejects.toThrow(/older version/);
  });

  it('drops drafts whose metadata is unreadable and can clear everything', async () => {
    await saveDraft(snapshot(), 'tab-a');
    localStorage.setItem('lendswift_draft_personal', 'v1.junk');
    localStorage.setItem('lendswift_draft_personal_meta', '{not json');
    expect(listDrafts().map((draft) => draft.key)).toEqual(['lendswift_draft_home']);
    deleteAllDrafts();
    expect(listDrafts()).toEqual([]);
  });
});
