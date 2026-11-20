import {
  DirectionalLight, HemisphereLight, PerspectiveCamera, Scene,
  Raycaster, Sphere, Vector2, Vector3, WebGLRenderer, MathUtils,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createScene(container) {
  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, 0.01, 50);
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.append(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enabled = false;
  const light = new DirectionalLight(0xfff5e6, 2);
  light.position.set(2, 4, 3);
  const fill = new DirectionalLight(0xc8e6ff, 1.3);
  fill.position.set(-2, 2, -3);
  scene.add(new HemisphereLight(0xe0f3ff, 0x5a5951, 1.6), light, fill);

  let frame;
  let bodySphere;
  let currentPreset;

  function render() {
    if (frame !== undefined) return;
    frame = requestAnimationFrame(() => {
      frame = undefined;
      controls.update();
      renderer.render(scene, camera);
    });
  }

  function setView(view) {
    if (!bodySphere) return;
    const halfHeight = MathUtils.degToRad(camera.fov / 2);
    const halfWidth = Math.atan(Math.tan(halfHeight) * camera.aspect);
    const distance = bodySphere.radius * 1.08 / Math.sin(Math.min(halfHeight, halfWidth));
    const direction = new Vector3(view === 'reset' ? 0.18 : 0, 0, view === 'back' ? -1 : 1);
    // Clear OrbitControls' remaining inertia before assigning the preset.
    controls.enableDamping = false;
    controls.update();
    controls.target.copy(bodySphere.center);
    camera.position.copy(bodySphere.center).addScaledVector(direction.normalize(), distance);
    controls.update();
    controls.enableDamping = true;
    currentPreset = view;
    render();
  }

  function resize() {
    const { clientWidth: width, clientHeight: height } = container;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (currentPreset) setView(currentPreset);
    render();
  }

  controls.addEventListener('change', render);
  controls.addEventListener('start', () => { currentPreset = undefined; });
  new ResizeObserver(resize).observe(container);
  resize();

  function showModel(model, bounds) {
    scene.add(model);
    bodySphere = bounds.getBoundingSphere(new Sphere());
    controls.minDistance = bodySphere.radius * 0.14;
    controls.maxDistance = 20;
    setView('front');
    controls.enabled = true;
  }

  function enablePicking({ getTargets, getOccluder, onPick, getLineTargets, onHover, onLinePick }) {
    const canvas = renderer.domElement;
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    const projected = new Vector3();
    let press;
    function setRay(event) {
      const { left, top, width, height } = canvas.getBoundingClientRect();
      pointer.set(((event.clientX - left) / width) * 2 - 1, 1 - ((event.clientY - top) / height) * 2);
      scene.updateMatrixWorld(true);
      camera.updateMatrixWorld();
      raycaster.setFromCamera(pointer, camera);
      return { width, height };
    }

    function skinDistance() {
      const occluder = getOccluder();
      return (occluder && raycaster.intersectObject(occluder)[0]?.distance) ?? Infinity;
    }
    function findLine(targets, { width, height }) {
      if (!targets.length) return;
      const tolerancePixels = 7;
      const viewDepth = camera.position.distanceTo(controls.target);
      const worldPerPixel = 2 * Math.tan(MathUtils.degToRad(camera.fov / 2)) / height;
      raycaster.params.Line.threshold = (viewDepth + bodySphere.radius) * worldPerPixel * tolerancePixels;
      const hits = raycaster.intersectObjects(targets, false);
      if (!hits.length) return;

      const surface = skinDistance();
      let nearest;
      let nearestDistance = tolerancePixels;
      for (const hit of hits) {
        if (hit.distance > surface + raycaster.params.Line.threshold) continue;
        projected.copy(hit.point).project(camera);
        const distance = Math.hypot((projected.x - pointer.x) * width / 2, (projected.y - pointer.y) * height / 2);
        if (distance < nearestDistance) {
          nearest = hit.object;
          nearestDistance = distance;
        }
      }
      return nearest;
    }

    canvas.addEventListener('pointerdown', (event) => {
      press = event.isPrimary && event.button === 0
        ? { id: event.pointerId, x: event.clientX, y: event.clientY }
        : undefined;
    });
    canvas.addEventListener('pointercancel', () => { press = undefined; });
    canvas.addEventListener('pointermove', (event) => {
      if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 5) press = undefined;
      if (event.buttons || event.pointerType === 'touch') return;
      const targets = getLineTargets();
      if (!targets.length) return;
      const line = findLine(targets, setRay(event));
      if (line) onHover(line);
    });
    canvas.addEventListener('pointerup', (event) => {
      if (press?.id !== event.pointerId) return;
      const drift = Math.hypot(event.clientX - press.x, event.clientY - press.y);
      press = undefined;
      if (drift > 5) return;

      const size = setRay(event);
      const hit = raycaster.intersectObjects(getTargets(), false)[0];
      if (hit && hit.distance <= skinDistance()) {
        onPick(hit.object.userData);
        return;
      }
      const line = findLine(getLineTargets(), size);
      if (line) onLinePick(line);
    });
  }

  return { showModel, setView, render, enablePicking };
}
