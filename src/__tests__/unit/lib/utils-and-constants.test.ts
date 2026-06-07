import { cn } from '@/lib/utils';
import { TYPE_LABEL, TYPE_LABEL_PLURAL, STATUS_LABEL } from '@/config/constants';

describe('cn', () => {
  it('merges multiple class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('filters out falsy values', () => {
    expect(cn('foo', false, undefined, null, 'bar')).toBe('foo bar');
  });

  it('handles conditional classes via object syntax', () => {
    expect(cn({ active: true, disabled: false })).toBe('active');
  });

  it('resolves tailwind conflicts, keeping the last conflicting class', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('resolves multiple tailwind conflicts at once', () => {
    expect(cn('text-sm', 'font-bold', 'text-lg')).toBe('font-bold text-lg');
  });

  it('returns empty string with no arguments', () => {
    expect(cn()).toBe('');
  });

  it('returns empty string when all inputs are falsy', () => {
    expect(cn(false, undefined, null)).toBe('');
  });

  it('handles array inputs', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('handles mixed valid and empty strings', () => {
    expect(cn('', 'foo', '')).toBe('foo');
  });
});

describe('TYPE_LABEL', () => {
  it('labels anime correctly', () => {
    expect(TYPE_LABEL.anime).toBe('Anime');
  });

  it('labels series correctly', () => {
    expect(TYPE_LABEL.series).toBe('Série');
  });

  it('labels movie correctly', () => {
    expect(TYPE_LABEL.movie).toBe('Film');
  });

  it('covers all MediaType keys', () => {
    expect(Object.keys(TYPE_LABEL)).toEqual(expect.arrayContaining(['anime', 'series', 'movie']));
  });
});

describe('TYPE_LABEL_PLURAL', () => {
  it('labels anime plural correctly', () => {
    expect(TYPE_LABEL_PLURAL.anime).toBe('Animes');
  });

  it('labels series plural correctly', () => {
    expect(TYPE_LABEL_PLURAL.series).toBe('Séries');
  });

  it('labels movie plural correctly', () => {
    expect(TYPE_LABEL_PLURAL.movie).toBe('Films');
  });

  it('covers all MediaType keys', () => {
    expect(Object.keys(TYPE_LABEL_PLURAL)).toEqual(expect.arrayContaining(['anime', 'series', 'movie']));
  });
});

describe('STATUS_LABEL', () => {
  it('labels watching correctly', () => {
    expect(STATUS_LABEL.watching).toBe('En cours');
  });

  it('labels completed correctly', () => {
    expect(STATUS_LABEL.completed).toBe('Terminé');
  });

  it('labels plan_to_watch correctly', () => {
    expect(STATUS_LABEL.plan_to_watch).toBe('À voir');
  });

  it('covers all Status keys', () => {
    expect(Object.keys(STATUS_LABEL)).toEqual(expect.arrayContaining(['watching', 'completed', 'plan_to_watch']));
  });
});
