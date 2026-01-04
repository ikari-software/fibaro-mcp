import { describe, expect, it } from 'vitest';
import { findMatches, isPluralishQuery, makeNameMatcher, normalizeName } from './name-lookup.js';

describe('name-lookup', () => {
  it('normalizes diacritics', () => {
    expect(normalizeName('Łazienka')).toBe('lazienka');
  });

  it('makeNameMatcher returns false when nothing matches', () => {
    const m = makeNameMatcher('kitchen', false);
    expect(m('garage')).toBe(false);
  });

  it('makeNameMatcher supports plural-ish substring matching', () => {
    const m = makeNameMatcher('lamps', false);
    expect(m('Kitchen Lamp')).toBe(true);
  });

  it('normalizes additional special letters', () => {
    expect(normalizeName('Øresund')).toBe('oresund');
    expect(normalizeName('Đakovo')).toBe('dakovo');
    expect(normalizeName('straße')).toBe('strasse');
    expect(normalizeName('æther')).toBe('aether');
    expect(normalizeName('œuvre')).toBe('oeuvre');
    expect(normalizeName('þing')).toBe('thing');
  });

  it('plural heuristic detects "all" and trailing s', () => {
    expect(isPluralishQuery('all lights')).toBe(true);
    expect(isPluralishQuery('all\tlights')).toBe(true);
    expect(isPluralishQuery('all\nlights')).toBe(true);
    expect(isPluralishQuery('every light')).toBe(true);
    expect(isPluralishQuery('lights')).toBe(true);
    expect(isPluralishQuery('glass')).toBe(false);
    expect(isPluralishQuery('ok')).toBe(false);
    expect(isPluralishQuery('')).toBe(false);
    expect(isPluralishQuery('  ')).toBe(false);
  });

  it('matcher supports substring and exact', () => {
    const sub = makeNameMatcher('kit', false);
    const ex = makeNameMatcher('kitchen', true);

    expect(sub('Kitchen')).toBe(true);
    expect(ex('Kitchen')).toBe(true);
    expect(ex('Kitchen Lamp')).toBe(false);
  });

  it('matcher supports plural-ish singularization for substring mode', () => {
    const m = makeNameMatcher('lamps', false);
    expect(m('Kitchen Lamp')).toBe(true);
  });

  it('findMatches returns enriched devices and rooms', () => {
    const rooms = [{ id: 1, name: 'Kitchen', sectionID: 10, visible: true, isDefault: false }];
    const sections = [{ id: 10, name: 'Downstairs' }];
    const devices = [
      { id: 5, name: 'Kitchen Light', roomID: 1, type: 't', baseType: 'b', enabled: true, visible: true },
    ];

    const res = findMatches({ query: 'kitchen', kind: 'all', exact: false, limit: 20, rooms, sections, devices });

    expect(res.rooms).toHaveLength(1);
    expect(res.rooms[0].sectionName).toBe('Downstairs');

    expect(res.devices).toHaveLength(1);
    expect(res.devices[0].roomName).toBe('Kitchen');
    expect(res.devices[0].sectionName).toBe('Downstairs');
  });

  it('findMatches respects kind filtering and limit', () => {
    const rooms = [
      { id: 1, name: 'Kitchen', sectionID: 10, visible: true, isDefault: false },
      { id: 2, name: 'Kitchenette', sectionID: 10, visible: true, isDefault: false },
    ];
    const sections = [{ id: 10, name: 'Downstairs' }];
    const devices = [
      { id: 5, name: 'Kitchen Light', roomID: 1, type: 't', baseType: 'b', enabled: true, visible: true },
      { id: 6, name: 'Kitchen Sensor', roomID: 1, type: 't', baseType: 'b', enabled: true, visible: true },
    ];

    const roomsOnly = findMatches({ query: 'kitchen', kind: 'rooms', exact: false, limit: 1, rooms, sections, devices });
    expect(roomsOnly.devices).toHaveLength(0);
    expect(roomsOnly.rooms).toHaveLength(1);

    const devicesOnly = findMatches({ query: 'kitchen', kind: 'devices', exact: false, limit: 1, rooms, sections, devices });
    expect(devicesOnly.rooms).toHaveLength(0);
    expect(devicesOnly.devices).toHaveLength(1);
  });

  it('findMatches does not crash when room/section is missing', () => {
    const rooms: any[] = [];
    const sections: any[] = [];
    const devices = [
      { id: 5, name: 'Orphan Device', roomID: 999, type: 't', baseType: 'b', enabled: true, visible: true },
    ];

    const res = findMatches({ query: 'orphan', kind: 'devices', exact: false, limit: 20, rooms, sections, devices });
    expect(res.devices).toHaveLength(1);
    expect(res.devices[0].roomName).toBeUndefined();
    expect(res.devices[0].sectionName).toBeUndefined();
  });
});
