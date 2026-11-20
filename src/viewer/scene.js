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
  let orbitSurface;
  let currentPreset;
  let focusedTarget;
  const centerRay = new Raycaster();
  const viewportCenter = new Vector2();

  renderer.domElement.addEventListener('pointerdown', (event) => {
    if (!orbitSurface || !event.isPrimary || event.button !== 0 ||
        event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (focusedTarget && focusedTarget.distanceToSquared(controls.target) < 1e-10) return;
    focusedTarget = undefined;

    orbitSurface.updateWorldMatrix(true, true);
    camera.updateMatrixWorld();
    centerRay.setFromCamera(viewportCenter, camera);
    const hit = centerRay.intersectObject(orbitSurface)[0];
    if (!hit) return;

    // Changing only the depth of the target keeps the current framing intact.
    const distance = MathUtils.clamp(hit.distance, controls.minDistance, controls.maxDistance);
    centerRay.ray.at(distance, controls.target);
  }, { capture: true });

  function render() {
    if (frame !== undefined) return;
    frame = requestAnimationFrame(() => {
      frame = undefined;
      controls.update();
      renderer.render(scene, camera);
    });
  }

  function limitingHalfAngle() {
    const halfHeight = MathUtils.degToRad(camera.fov / 2);
    const halfWidth = Math.atan(Math.tan(halfHeight) * camera.aspect);
    return Math.min(halfHeight, halfWidth);
  }

  function aimCamera(target, direction, distance) {
    // Clear OrbitControls' remaining inertia before replacing the framing.
    controls.enableDamping = false;
    controls.update();
    controls.target.copy(target);
    camera.position.copy(target).addScaledVector(direction, distance);
    controls.update();
    controls.enableDamping = true;
    render();
  }

  function setView(view) {
    if (!bodySphere) return;
    const distance = bodySphere.radius * 1.08 / Math.sin(limitingHalfAngle());
    const direction = new Vector3(view === 'reset' ? 0.18 : 0, 0, view === 'back' ? -1 : 1).normalize();
    focusedTarget = undefined;
    currentPreset = view;
    aimCamera(bodySphere.center, direction, distance);
  }

  function focusPoint(point) {
    const distance = MathUtils.clamp(0.15 / Math.tan(limitingHalfAngle()), controls.minDistance, controls.maxDistance);
    const currentDirection = camera.getWorldDirection(new Vector3()).negate();
    const alternatives = [new Vector3(0, 1, 0), new Vector3(0, -1, 0)];
    for (const height of [-0.5, 0, 0.5]) {
      for (let index = 0; index < 8; index++) {
        const angle = index * Math.PI / 4;
        alternatives.push(new Vector3(Math.sin(angle), height, Math.cos(angle)).normalize());
      }
    }
    alternatives.sort((a, b) => b.dot(currentDirection) - a.dot(currentDirection));
    const ray = new Raycaster(undefined, undefined, 0, distance - 0.003);
    const origin = new Vector3();
    const inward = new Vector3();
    orbitSurface.updateWorldMatrix(true, true);
    const direction = [currentDirection, ...alternatives].find((candidate) => {
      ray.set(origin.copy(point).addScaledVector(candidate, distance), inward.copy(candidate).negate());
      if (ray.intersectObject(orbitSurface).length) return false;
      // A reverse ray also catches surfaces when the candidate camera starts inside the mesh.
      ray.set(origin.copy(point).addScaledVector(candidate, 0.003), candidate);
      return ray.intersectObject(orbitSurface).length === 0;
    }) ?? currentDirection;

    currentPreset = undefined;
    focusedTarget = point.clone();
    aimCamera(point, direction, distance);
    container.scrollIntoView({ block: 'nearest', inline: 'nearest' });
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

  function showModel(model, bounds, skin) {
    scene.add(model);
    orbitSurface = skin;
    renderer.domElement.testView = { camera, controls, skin };
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

  return { showModel, setView, focusPoint, render, enablePicking };
}
