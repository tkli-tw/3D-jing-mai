import { Raycaster, Vector3 } from 'three';
import placements from '../data/model_positions.json';

const get = (id) => document.getElementById(id);
const field = get('point-settings');
const observer = new MutationObserver(() => { if (!field.disabled) test(); });
observer.observe(field, { attributes: true });
if (!field.disabled) test();
function test() {
  observer.disconnect();
  const canvas = document.querySelector('#stage canvas');
  const { camera, controls, skin } = canvas.testView;
  const check = (ok, name) => { if (!ok) throw Error(name); };
  function choose(id) {
    get('point-search').value = id;
    get('point-search').dispatchEvent(new Event('input'));
    get('point-results').querySelector('li:not([hidden]) button').click();
  }
  function checkFocus(id, side) {
    const expected = new Vector3(...placements.points.find((p) => p.point_id === id && p.side === side).position);
    check(expected.distanceTo(controls.target) < 1e-6, 'target ' + id);
    camera.updateMatrixWorld();
    const projected = expected.clone().project(camera);
    check(Math.hypot(projected.x, projected.y) < 1e-6, 'center ' + id);
    check(camera.position.distanceTo(expected) < 1, 'zoom ' + id);
  }
  try {
    const starting = camera.position.clone();
    choose('LU5');
    check(starting.equals(camera.position), 'list selection does not move camera');
    check(!get('focus-side').hidden && get('focus-side').options.length === 2, 'bilateral options');
    get('point-side').value = 'left';
    get('point-side').dispatchEvent(new Event('change'));
    check(get('focus-side').value === 'left', 'left default');
    get('focus-side').value = 'right';
    get('focus-point').click();
    checkFocus('LU5', 'right');
    check(get('point-side').value === 'right', 'right side shown');
    get('all-channels').click();
    choose('BL23');
    document.querySelector('[data-view="front"]').click();
    get('focus-point').click();
    checkFocus('BL23', 'right');
    const direction = controls.target.clone().sub(camera.position);
    const ray = new Raycaster(camera.position, direction.clone().normalize(), 0, direction.length() - .003);
    check(!ray.intersectObject(skin).length, 'posterior point has clear view');
    const pivot = controls.target.clone();
    canvas.setPointerCapture = () => {};
    canvas.releasePointerCapture = () => {};
    for (const [type, x] of [['pointerdown', 50], ['pointermove', 80], ['pointerup', 80]]) {
      canvas.dispatchEvent(new PointerEvent(type, {
        pointerType: 'mouse', pointerId: 1, isPrimary: true, button: 0, bubbles: true,
        buttons: type === 'pointerup' ? 0 : 1, clientX: x, clientY: 150,
      }));
    }
    check(pivot.equals(controls.target), 'rotation keeps point pivot');
    get('point-side').value = 'all';
    get('point-side').dispatchEvent(new Event('change'));
    choose('CV8');
    check(get('focus-side').hidden, 'midline has no side selector');
    get('focus-point').click();
    checkFocus('CV8', 'midline');
    choose('GV28');
    check(get('point-focus').hidden, 'missing focus hidden');
    canvas.dataset.smokeTest = 'acupoint-focus-passed';
  } catch (error) {
    canvas.dataset.smokeTest = error.message;
  }
}
