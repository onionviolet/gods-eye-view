import test from 'node:test';
import assert from 'node:assert/strict';
import * as Cesium from 'cesium';
import {
  BIKESHARE_SELECTED_OVERLAY_SOURCE_OPTIONS,
  _clearBikeshareSelectionForTest,
  _selectBikeshareStationForTest,
  _setBikeshareSelectionStateForTest,
  createBikeshareSelectedOverlayEntry,
  gbfsLocalizedText,
  gbfsStationName,
} from './bikeshare.js';

function makeRecord() {
  return {
    stationId: '3790',
    stationName: 'Congress & 6th',
    bikesAvailable: 7,
    docksAvailable: 4,
    capacity: 11,
    isInstalled: true,
    isRenting: false,
    isReturning: true,
    point: {
      position: Cesium.Cartesian3.fromDegrees(-97.7431, 30.2672, 2),
      show: true,
    },
  };
}

test('selected bikeshare entry preserves source copy and protected-lane policy', () => {
  const record = makeRecord();
  const entry = createBikeshareSelectedOverlayEntry('austin-capmetro:3790', record);
  assert.equal(entry.position, record.point.position);
  assert.equal(entry.title, 'Congress & 6th');
  assert.deepEqual(entry.details, [
    '🚲 7 avail · 4 docks · 11 cap',
    '⚠️ Not renting',
  ]);
  assert.equal(entry.variant, 'selected');
  assert.equal(entry.selected, true);
  assert.equal(entry.protected, true);
  assert.equal(entry.paintLane, 'selected');
  assert.equal(entry.collisionGroup, 'ambient-card');
  assert.equal(entry.edgeFade, 'keyhole');
  assert.equal(entry.horizonCull, true);
});

test('real station select/clear path publishes one card and creates no native label graphic', () => {
  const calls = [];
  const overlayHost = {
    setEntries: (...args) => calls.push(['entries', ...args]),
    setVisible: (...args) => calls.push(['visible', ...args]),
    clearSource: (...args) => calls.push(['clear', ...args]),
  };
  const key = 'austin-capmetro:3790';
  const record = makeRecord();
  const viewer = { entities: new Cesium.EntityCollection() };
  _setBikeshareSelectionStateForTest({ viewer, key, record, overlayHost });
  try {
    _selectBikeshareStationForTest(key);
    assert.equal(record.point.show, false);
    assert.equal(viewer.entities.values.length, 1, 'runtime guard requires a real selected entity');
    assert.equal(viewer.entities.values[0].label, undefined);
    assert.ok(viewer.entities.values[0].point, 'selected point highlight remains native');

    const publication = calls.find(([type]) => type === 'entries');
    assert.ok(publication);
    assert.equal(publication[1], 'bikeshare-selected');
    assert.equal(publication[2].length, 1);
    assert.equal(publication[2][0].position, record.point.position);
    assert.deepEqual(publication[3], BIKESHARE_SELECTED_OVERLAY_SOURCE_OPTIONS);

    _clearBikeshareSelectionForTest();
    assert.equal(record.point.show, true);
    assert.equal(viewer.entities.values.length, 0);
    assert.deepEqual(calls.at(-1), ['clear', 'bikeshare-selected']);
  } finally {
    _clearBikeshareSelectionForTest();
  }
});


// ---------------------------------------------------------------------------
// GBFS v3 localized names (upstream PR #61, reworked)
// ---------------------------------------------------------------------------

test('gbfsLocalizedText reads both the v2 string and the v3 localized array', () => {
  assert.equal(gbfsLocalizedText('Union Square'), 'Union Square');
  assert.equal(gbfsLocalizedText([{ text: 'Union Square', language: 'en' }]), 'Union Square');
});

test('English is preferred, and a regional English tag still counts', () => {
  const value = [
    { text: 'Gare du Nord', language: 'fr' },
    { text: 'North Station', language: 'en-GB' },
  ];
  assert.equal(gbfsLocalizedText(value), 'North Station');
});

test('with no English entry the first usable name wins — an operator-language name beats none', () => {
  assert.equal(gbfsLocalizedText([{ text: 'Gare du Nord', language: 'fr' }]), 'Gare du Nord');
  assert.equal(gbfsLocalizedText([{ text: '', language: 'fr' }, { text: 'Sceaux', language: 'fr' }]), 'Sceaux');
});

test('a malformed or absent name yields empty string rather than throwing', () => {
  // The shipped implementation called .find() on the raw field and .toLowerCase()
  // on entry.language, so a station missing `name` — or any v3 entry omitting
  // `language` — threw a TypeError and took down the whole feed parse.
  for (const value of [undefined, null, 42, {}, [], [{}], [{ text: 'X' }], [{ language: 'en' }]]) {
    assert.doesNotThrow(() => gbfsLocalizedText(value), String(value));
  }
  assert.equal(gbfsLocalizedText(undefined), '');
  assert.equal(gbfsLocalizedText([{}]), '');
  assert.equal(gbfsLocalizedText([{ text: 'X' }]), 'X');
});

test('gbfsStationName falls back to short_name in either shape', () => {
  assert.equal(gbfsStationName({ short_name: 'A1' }), 'A1');
  assert.equal(gbfsStationName({ name: [], short_name: [{ text: 'A1', language: 'en' }] }), 'A1');
  assert.equal(gbfsStationName({ name: 'Main', short_name: 'A1' }), 'Main');
  assert.equal(gbfsStationName({}), '');
});

test('shape dispatch does not depend on the declared feed version', () => {
  // A v3 feed that omits `version`, or a v2 feed that mislabels itself, both
  // parse correctly: the value in hand cannot lie about what shape it is.
  assert.equal(gbfsStationName({ name: [{ text: 'Bercy', language: 'fr' }] }), 'Bercy');
  assert.equal(gbfsStationName({ name: 'Bercy' }), 'Bercy');
});
