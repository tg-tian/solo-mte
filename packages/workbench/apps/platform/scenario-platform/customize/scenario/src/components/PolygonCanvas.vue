<template>
  <div class="polygon-canvas-wrapper">
    <div class="canvas-toolbar" v-if="editMode !== 'view'">
      <el-button size="small" @click="clearPoints">清空顶点</el-button>
      <el-button size="small" type="danger" @click="undoLastPoint">撤销上一个点</el-button>
      <span class="toolbar-tip">点击画布添加顶点，双击顶点删除，拖拽顶点移动（≥3点形成多边形）</span>
    </div>
    <canvas
      ref="canvasRef"
      class="polygon-canvas"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @dblclick="onDoubleClick"
      @contextmenu.prevent
    ></canvas>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import type { AreaPolygonInfo, PolygonPoint } from '../types/models';

const CANVAS_SIZE = 1000;
const GRID_INTERVAL = 100;
const VERTEX_RADIUS = 6;
const ACTIVE_VERTEX_RADIUS = 10;
const HIT_RADIUS = 14;

const AREA_COLORS = ['#67c23a', '#e6a23c', '#f56c6c', '#9093cb', '#4d98ff', '#ff6b6b', '#6bcba7', '#d4a574'];
const SCENE_COLOR = '#409eff';
const SCENE_FILL = 'rgba(64,158,255,0.12)';

interface Props {
  scenePolygon: PolygonPoint[] | null;
  areas: AreaPolygonInfo[];
  editMode: 'scene' | 'area' | 'view';
  editingAreaId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  editMode: 'view',
  editingAreaId: ''
});

const emit = defineEmits<{
  updateScenePolygon: [points: PolygonPoint[]];
  updateAreaPolygon: [areaId: string, points: PolygonPoint[]];
}>();

const canvasRef = ref<HTMLCanvasElement>();
const editingPoints = ref<PolygonPoint[]>([]);
const dragging = reactive({
  active: false,
  pointIndex: -1,
});

const currentEditingPolygon = computed<PolygonPoint[] | null>(() => {
  if (props.editMode === 'scene') {
    return editingPoints.value.length > 0 ? editingPoints.value : props.scenePolygon;
  }
  if (props.editMode === 'area' && props.editingAreaId) {
    const area = props.areas.find(a => a.id === props.editingAreaId);
    if (!area) return null;
    return editingPoints.value.length > 0 ? editingPoints.value : area.polygon;
  }
  return null;
});

// Only reset editingPoints when the edit target actually changes (mode or area id),
// NOT when polygon data updates (which happens after our own emits).
watch(
  () => [props.editMode, props.editingAreaId] as const,
  () => {
    editingPoints.value = [];
    dragging.active = false;
    dragging.pointIndex = -1;
    // Sync editingPoints from the new target's existing polygon
    syncEditingPoints();
    render();
  }
);

watch(currentEditingPolygon, () => {
  render();
}, { deep: true });

watch(() => props.scenePolygon, () => {
  render();
}, { deep: true });

watch(() => props.areas, () => {
  render();
}, { deep: true });

function getCanvasScale(): number {
  const canvas = canvasRef.value;
  if (!canvas) return 1;
  return canvas.clientWidth / CANVAS_SIZE;
}

function screenToLogic(clientX: number, clientY: number): PolygonPoint {
  const canvas = canvasRef.value!;
  const rect = canvas.getBoundingClientRect();
  const scale = getCanvasScale();
  return {
    x: Math.round((clientX - rect.left) / scale),
    y: Math.round((clientY - rect.top) / scale)
  };
}

function findHitPoint(points: PolygonPoint[] | null, logicX: number, logicY: number): number {
  if (!points) return -1;
  for (let i = points.length - 1; i >= 0; i--) {
    const dx = points[i].x - logicX;
    const dy = points[i].y - logicY;
    if (dx * dx + dy * dy <= HIT_RADIUS * HIT_RADIUS) return i;
  }
  return -1;
}

function onMouseDown(e: MouseEvent) {
  if (props.editMode === 'view') return;
  const pt = screenToLogic(e.clientX, e.clientY);
  const polygon = currentEditingPolygon.value;
  const hitIndex = findHitPoint(polygon, pt.x, pt.y);

  if (hitIndex >= 0) {
    syncEditingPoints();
    dragging.active = true;
    dragging.pointIndex = hitIndex;
  }
}

function onMouseMove(e: MouseEvent) {
  if (!dragging.active) return;
  const pt = screenToLogic(e.clientX, e.clientY);
  const target = { x: clamp(pt.x), y: clamp(pt.y) };
  if (!isWithinSceneConstraint(target)) return;
  editingPoints.value[dragging.pointIndex] = target;
  emitCurrentPolygon();
  render();
}

function onMouseUp(e: MouseEvent) {
  if (!dragging.active) {
    // Click on empty space → add point
    const pt = screenToLogic(e.clientX, e.clientY);
    const polygon = currentEditingPolygon.value;
    const hitIndex = findHitPoint(polygon, pt.x, pt.y);
    if (hitIndex < 0) {
      addPoint(pt);
    }
    return;
  }

  const pt = screenToLogic(e.clientX, e.clientY);
  const target = { x: clamp(pt.x), y: clamp(pt.y) };
  if (isWithinSceneConstraint(target)) {
    editingPoints.value[dragging.pointIndex] = target;
  } else {
    warnOutside();
  }
  dragging.active = false;
  dragging.pointIndex = -1;
  emitCurrentPolygon();
  render();
}

function onDoubleClick(e: MouseEvent) {
  if (props.editMode === 'view') return;
  const pt = screenToLogic(e.clientX, e.clientY);
  const polygon = currentEditingPolygon.value;
  const hitIndex = findHitPoint(polygon, pt.x, pt.y);
  if (hitIndex >= 0) {
    syncEditingPoints();
    editingPoints.value.splice(hitIndex, 1);
    emitCurrentPolygon();
    render();
  }
}

function addPoint(pt: PolygonPoint) {
  const target = { x: clamp(pt.x), y: clamp(pt.y) };
  if (!isWithinSceneConstraint(target)) {
    warnOutside();
    return;
  }
  syncEditingPoints();
  editingPoints.value.push(target);
  emitCurrentPolygon();
  render();
}

function syncEditingPoints() {
  if (editingPoints.value.length === 0) {
    const polygon = currentEditingPolygon.value;
    if (polygon && polygon.length > 0) {
      editingPoints.value = polygon.map(p => ({ ...p }));
    }
  }
}

function emitCurrentPolygon() {
  if (props.editMode === 'scene') {
    emit('updateScenePolygon', [...editingPoints.value]);
  } else if (props.editMode === 'area' && props.editingAreaId) {
    emit('updateAreaPolygon', props.editingAreaId, [...editingPoints.value]);
  }
}

function clearPoints() {
  editingPoints.value = [];
  emitCurrentPolygon();
  render();
}

function undoLastPoint() {
  syncEditingPoints();
  if (editingPoints.value.length === 0) return;
  editingPoints.value.pop();
  emitCurrentPolygon();
  render();
}

function clamp(v: number): number {
  return Math.max(0, Math.min(CANVAS_SIZE, v));
}

function isPointInPolygon(p: PolygonPoint, polygon: PolygonPoint[] | null): boolean {
  if (!polygon || polygon.length < 3) return true;
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > p.y) !== (yj > p.y))
      && (p.x < ((xj - xi) * (p.y - yi)) / ((yj - yi) || 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function isWithinSceneConstraint(p: PolygonPoint): boolean {
  if (props.editMode !== 'area') return true;
  if (!props.scenePolygon || props.scenePolygon.length < 3) return false;
  return isPointInPolygon(p, props.scenePolygon);
}

let outsideWarnedAt = 0;
function warnOutside() {
  const now = Date.now();
  if (now - outsideWarnedAt < 800) return;
  outsideWarnedAt = now;
  if (props.editMode === 'area' && (!props.scenePolygon || props.scenePolygon.length < 3)) {
    ElMessage.warning('请先定义场景空间，再编辑区域空间');
  } else {
    ElMessage.warning('不允许在场景空间外选点');
  }
}

function render() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = CANVAS_SIZE * dpr;
  canvas.height = CANVAS_SIZE * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  drawGrid(ctx);
  drawScenePolygon(ctx);
  drawAreaPolygons(ctx);
  drawEditingPolygon(ctx);
}

function drawGrid(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = '#e8e8e8';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= CANVAS_SIZE; i += GRID_INTERVAL) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, CANVAS_SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(CANVAS_SIZE, i);
    ctx.stroke();
  }
  ctx.strokeStyle = '#d0d0d0';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
}

function drawPolygonFill(ctx: CanvasRenderingContext2D, points: PolygonPoint[], fillColor: string, strokeColor: string, lineWidth: number) {
  if (points.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function drawPolygonLines(ctx: CanvasRenderingContext2D, points: PolygonPoint[], color: string, lineWidth: number) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  if (points.length >= 3) ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function drawVertices(ctx: CanvasRenderingContext2D, points: PolygonPoint[], color: string, radius: number) {
  for (const p of points) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawLabel(ctx: CanvasRenderingContext2D, text: string, points: PolygonPoint[]) {
  if (points.length < 3) return;
  let cx = 0, cy = 0;
  for (const p of points) { cx += p.x; cy += p.y; }
  cx /= points.length;
  cy /= points.length;
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#333';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy);
}

function drawScenePolygon(ctx: CanvasRenderingContext2D) {
  if (!props.scenePolygon || props.scenePolygon.length === 0) return;
  if (props.editMode === 'scene') return;

  if (props.scenePolygon.length >= 3) {
    drawPolygonFill(ctx, props.scenePolygon, SCENE_FILL, SCENE_COLOR, 2);
    drawLabel(ctx, '场景', props.scenePolygon);
  }
  drawPolygonLines(ctx, props.scenePolygon, SCENE_COLOR, 2);
  drawVertices(ctx, props.scenePolygon, SCENE_COLOR, VERTEX_RADIUS);
}

function drawAreaPolygons(ctx: CanvasRenderingContext2D) {
  for (let i = 0; i < props.areas.length; i++) {
    const area = props.areas[i];
    if (!area.polygon || area.polygon.length === 0) continue;
    if (props.editMode === 'area' && props.editingAreaId === area.id) continue;

    const color = area.color || AREA_COLORS[i % AREA_COLORS.length];
    let fillColor: string;
    try {
      const r = parseInt(color.slice(1,3), 16), g = parseInt(color.slice(3,5), 16), b = parseInt(color.slice(5,7), 16);
      fillColor = `rgba(${r},${g},${b},0.10)`;
    } catch { fillColor = 'rgba(100,100,100,0.10)'; }

    if (area.polygon.length >= 3) {
      drawPolygonFill(ctx, area.polygon, fillColor, color, 1.5);
      drawLabel(ctx, area.name, area.polygon);
    }
    drawPolygonLines(ctx, area.polygon, color, 1.5);
    drawVertices(ctx, area.polygon, color, VERTEX_RADIUS);
  }
}

function drawEditingPolygon(ctx: CanvasRenderingContext2D) {
  const polygon = currentEditingPolygon.value;
  if (!polygon || polygon.length === 0) return;

  let color = SCENE_COLOR;
  let fillColor = SCENE_FILL;
  if (props.editMode === 'area' && props.editingAreaId) {
    const idx = props.areas.findIndex(a => a.id === props.editingAreaId);
    if (idx >= 0) {
      color = props.areas[idx].color || AREA_COLORS[idx % AREA_COLORS.length];
      try {
        const r = parseInt(color.slice(1,3), 16), g = parseInt(color.slice(3,5), 16), b = parseInt(color.slice(5,7), 16);
        fillColor = `rgba(${r},${g},${b},0.15)`;
      } catch { fillColor = 'rgba(100,100,100,0.15)'; }
    }
  }

  if (polygon.length >= 3) {
    drawPolygonFill(ctx, polygon, fillColor, color, 2);
    if (props.editMode === 'area') {
      const area = props.areas.find(a => a.id === props.editingAreaId);
      if (area) drawLabel(ctx, area.name, polygon);
    } else if (props.editMode === 'scene') {
      drawLabel(ctx, '场景', polygon);
    }
  }
  drawPolygonLines(ctx, polygon, color, 2);
  drawVertices(ctx, polygon, color, ACTIVE_VERTEX_RADIUS);

  if (polygon.length < 3) {
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#999';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`还需 ${3 - polygon.length} 个点形成多边形`, CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 20);
  }
}

function handleResize() {
  render();
}

onMounted(() => {
  render();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
.polygon-canvas-wrapper {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}
.canvas-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.toolbar-tip {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}
.polygon-canvas {
  width: 100%;
  aspect-ratio: 1 / 1;
  display: block;
  background: #f5f7fa;
  border-radius: 8px;
  cursor: crosshair;
}
</style>