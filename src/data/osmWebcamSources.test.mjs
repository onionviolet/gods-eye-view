import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeOsmWebcamElement,
  osmCameraDirectionDeg,
  osmWebcamStillUrl,
  filterOsmWebcamsToPublicHosts,
} from '../../vite.config.js';

// ---------------------------------------------------------------------------
// osmWebcamStillUrl — what survives the filter, and why
// ---------------------------------------------------------------------------

test('a direct still image URL is accepted, http included', () => {
  assert.equal(
    osmWebcamStillUrl('https://www.wermelskirchen.de/webcam/wk_saal.jpg'),
    'https://www.wermelskirchen.de/webcam/wk_saal.jpg',
  );
  // Municipal webcams are routinely TLS-less; rejecting http: would drop most
  // of the German pack, which is why the host check carries the safety weight.
  assert.equal(
    osmWebcamStillUrl('http://webcam.dietzenbach.de/bilder/image.jpg'),
    'http://webcam.dietzenbach.de/bilder/image.jpg',
  );
  assert.equal(
    osmWebcamStillUrl('http://webcam.warendorf.de/image/jpeg.cgi'),
    'http://webcam.warendorf.de/image/jpeg.cgi',
  );
});

test('landing pages are rejected — reading a frame off one would be scraping', () => {
  for (const value of [
    'https://www.augsburg.de/webcam/',
    'http://www.brillen-krille.de/de/webcam_rostock_uniplatz_22.php',
    'https://www.berlin.de/webcams/4350944-webcam-am-rotes-rathaus.html',
    'https://www.softed.de/unternehmen/webcam_berlin.aspx',
    'https://www.youtube.com/watch?v=RqLv2bZFYEM',
  ]) {
    assert.equal(osmWebcamStillUrl(value), null, value);
  }
});

test('MJPEG endpoints are rejected — an image feed on a multipart stream never fails fast', () => {
  assert.equal(osmWebcamStillUrl('http://www.osnabrueck.de/marktplatzwebcam/axis-cgi/mjpg/video.cgi'), null);
  assert.equal(osmWebcamStillUrl('http://example.org/cgi-bin/mjpeg.jpg'), null);
});

test('video playlists are rejected', () => {
  assert.equal(osmWebcamStillUrl('https://livecam.stream24.net/osltv8/playlist.m3u8'), null);
});

test('non-global and credentialed targets are refused — this catalog is world-editable', () => {
  // Anyone can edit contact:webcam, and the proxy fetches it server-side, so a
  // .jpg path is not enough on its own.
  for (const value of [
    'http://192.168.1.1/cam.jpg',
    'http://127.0.0.1/cam.jpg',
    'http://10.0.0.5/snapshot.cgi',
    'http://169.254.169.254/latest/meta-data/cam.jpg',
    'http://172.16.4.4/image.jpg',
    'http://localhost/cam.jpg',
    'http://nas.local/cam.jpg',
    'http://user:pw@example.org/cam.jpg',
    'ftp://example.org/cam.jpg',
    'not a url',
    '',
  ]) {
    assert.equal(osmWebcamStillUrl(value), null, value);
  }
});

// ---------------------------------------------------------------------------
// osmCameraDirectionDeg
// ---------------------------------------------------------------------------

test('camera:direction wraps into [0,360) — negative headings are live OSM data', () => {
  // node 1802461127 (Chemnitz) carries camera:direction=-195 on the DE extract.
  assert.equal(osmCameraDirectionDeg(-195), 165);
  assert.equal(osmCameraDirectionDeg('-195'), 165);
  assert.equal(osmCameraDirectionDeg(420), 60);
  assert.equal(osmCameraDirectionDeg(0), 0);
  assert.equal(osmCameraDirectionDeg('221'), 221);
});

test('camera:direction accepts compass words and rejects the rest', () => {
  assert.equal(osmCameraDirectionDeg('NW'), 315);
  assert.equal(osmCameraDirectionDeg('South'), 180);
  assert.ok(Number.isNaN(osmCameraDirectionDeg('')));
  assert.ok(Number.isNaN(osmCameraDirectionDeg(undefined)));
  assert.ok(Number.isNaN(osmCameraDirectionDeg('towards the square')));
});

// ---------------------------------------------------------------------------
// normalizeOsmWebcamElement
// ---------------------------------------------------------------------------

const node = (tags, over = {}) => ({
  type: 'node', id: 391466829, lat: 51.14, lon: 7.22, tags, ...over,
});

test('a mapped direction becomes a high-confidence heading', () => {
  const cam = normalizeOsmWebcamElement(node({
    'man_made': 'surveillance',
    'contact:webcam': 'https://www.wermelskirchen.de/webcam/wk_saal.jpg',
    'camera:direction': '40',
    'camera:mount': 'wall',
    name: 'Stadt Wermelskirchen',
  }));
  assert.equal(cam.id, 'osm-webcam-node-391466829');
  assert.equal(cam.headingDeg, 40);
  assert.equal(cam.headingConfidence, 'high');
  assert.equal(cam.mountHeightM, 8);
  assert.equal(cam.feedType, 'image');
  assert.equal(cam.sourceKind, 'osm-webcam');
  // The heading is sourced; everything else is still a prior, so the CAL badge
  // must keep reading RAW PRIOR.
  assert.equal(cam.poseSource, undefined);
});

test('a missing direction falls back to the id-hash personality at low confidence', () => {
  const cam = normalizeOsmWebcamElement(node({
    'contact:webcam': 'http://webcam.dietzenbach.de/bilder/image.jpg',
  }));
  assert.equal(cam.headingConfidence, 'low');
  assert.ok(Number.isFinite(cam.headingDeg));
  assert.ok(cam.headingDeg >= 0 && cam.headingDeg < 360);
  // Narrower, shorter throw than a camera whose aim is actually known.
  assert.ok(cam.fovDeg < 62 && cam.rangeM < 320);
});

test('camera:mount and height drive the mount prior, height winning', () => {
  const mounted = (tags) => normalizeOsmWebcamElement(node({
    'contact:webcam': 'https://example.org/cam.jpg', ...tags,
  })).mountHeightM;
  assert.equal(mounted({ 'camera:mount': 'pole' }), 6);
  assert.equal(mounted({ 'camera:mount': 'roof' }), 12);
  assert.equal(mounted({ 'camera:mount': 'tower' }), 20);
  assert.equal(mounted({}), 8);
  assert.equal(mounted({ 'camera:mount': 'balloon' }), 8);
  assert.equal(mounted({ 'camera:mount': 'pole', height: '17' }), 17);
  // The client clamps to 6..120; clamping here too keeps the served value honest.
  assert.equal(mounted({ height: '2.5' }), 6);
  assert.equal(mounted({ height: '900' }), 120);
});

test('unusable elements are dropped rather than served with guessed geometry', () => {
  // No usable webcam URL.
  assert.equal(normalizeOsmWebcamElement(node({ 'contact:webcam': 'https://example.org/cam.html' })), null);
  // No coordinates.
  assert.equal(normalizeOsmWebcamElement({ type: 'node', id: 1, tags: { 'contact:webcam': 'https://e.org/c.jpg' } }), null);
  // Out-of-range coordinates.
  assert.equal(normalizeOsmWebcamElement(node({ 'contact:webcam': 'https://e.org/c.jpg' }, { lat: 91 })), null);
  // Non-numeric OSM id would break the provider-stable camera id.
  assert.equal(normalizeOsmWebcamElement(node({ 'contact:webcam': 'https://e.org/c.jpg' }, { id: 'abc' })), null);
  assert.equal(normalizeOsmWebcamElement(null), null);
});

test('a way carries its center coordinates', () => {
  const cam = normalizeOsmWebcamElement({
    type: 'way', id: 42, center: { lat: 51.95, lon: 7.99 },
    tags: { 'contact:webcam': 'https://example.org/cam.jpg' },
  });
  assert.equal(cam.id, 'osm-webcam-way-42');
  assert.equal(cam.lat, 51.95);
});

test('the licence names the catalog and the frame separately', () => {
  const cam = normalizeOsmWebcamElement(node({ 'contact:webcam': 'https://example.org/cam.jpg' }));
  // ODbL covers position/direction/the URL. It never covers the picture.
  assert.match(cam.license, /OpenStreetMap contributors/);
  assert.match(cam.license, /ODbL/);
  assert.match(cam.license, /operator/i);
});

// ---------------------------------------------------------------------------
// filterOsmWebcamsToPublicHosts — the string filter is a first pass, not a
// sufficient one. `contact:webcam` is a world-editable OSM tag.
// ---------------------------------------------------------------------------

const cam = (url) => ({ id: url, url });

test('a perfectly ordinary hostname that resolves to loopback is refused', () => {
  // osmWebcamStillUrl passes this: the scheme is https, there are no
  // credentials, the host is not a literal IP and not *.local. Only the
  // resolved address gives it away.
  const lookup = async () => [{ address: '127.0.0.1', family: 4 }];
  return filterOsmWebcamsToPublicHosts([cam('https://cam.example.org/still.jpg')], lookup)
    .then((kept) => assert.deepEqual(kept, []));
});

test('a hostname resolving to the cloud metadata address is refused', async () => {
  const lookup = async () => [{ address: '169.254.169.254', family: 4 }];
  assert.deepEqual(await filterOsmWebcamsToPublicHosts([cam('https://metadata.example/snapshot.cgi')], lookup), []);
});

test('a genuinely public camera is kept', async () => {
  const lookup = async () => [{ address: '93.184.216.34', family: 4 }];
  const cams = [cam('https://www.wermelskirchen.de/webcam/wk_saal.jpg')];
  assert.deepEqual(await filterOsmWebcamsToPublicHosts(cams, lookup), cams);
});

test('a split-horizon answer is refused, not raced', async () => {
  // Returning one public and one private address must not be resolvable by
  // "some address was fine" — the fetch could land on either.
  const lookup = async () => [{ address: '93.184.216.34', family: 4 }, { address: '10.0.0.5', family: 4 }];
  assert.deepEqual(await filterOsmWebcamsToPublicHosts([cam('https://mixed.example/a.jpg')], lookup), []);
});

test('a failed or empty lookup is refused rather than assumed public', async () => {
  const throws = async () => { throw new Error('ENOTFOUND'); };
  assert.deepEqual(await filterOsmWebcamsToPublicHosts([cam('https://gone.example/a.jpg')], throws), []);
  const empty = async () => [];
  assert.deepEqual(await filterOsmWebcamsToPublicHosts([cam('https://empty.example/a.jpg')], empty), []);
});

test('each distinct host is resolved once, however many cameras it serves', async () => {
  let calls = 0;
  const lookup = async () => { calls += 1; return [{ address: '93.184.216.34', family: 4 }]; };
  const cams = [cam('https://one.example/a.jpg'), cam('https://one.example/b.jpg'), cam('https://two.example/c.jpg')];
  const kept = await filterOsmWebcamsToPublicHosts(cams, lookup);
  assert.equal(kept.length, 3);
  assert.equal(calls, 2);
});
