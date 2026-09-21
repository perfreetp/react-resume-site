import { LOCAL_STORE } from '@utils/const';

export interface Snapshot {
  id: string;
  md: string;
  theme: string;
  color: string;
  time: number;
}

type SnapshotMap = Record<string, Snapshot[]>;

const MAX_SNAPSHOTS = 20;
const MIN_INTERVAL = 15 * 1000;

function genId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function readMap(): SnapshotMap {
  const str = localStorage.getItem(LOCAL_STORE.MD_SNAPSHOTS);
  if (str) {
    try {
      return JSON.parse(str) || {};
    } catch (e) {
      console.error(e);
    }
  }
  return {};
}

function writeMap(map: SnapshotMap) {
  localStorage.setItem(LOCAL_STORE.MD_SNAPSHOTS, JSON.stringify(map));
}

// 旧版历史记录(md-history)迁移为默认简历的版本快照
export function migrateLegacyHistory(resumeId: string) {
  const legacy = localStorage.getItem(LOCAL_STORE.MD_HISTORY);
  if (!legacy) {
    return;
  }
  try {
    const list = JSON.parse(legacy);
    if (Array.isArray(list) && list.length > 0) {
      const map = readMap();
      map[resumeId] = list
        .filter((item) => item && typeof item.md === 'string')
        .map((item) => ({
          id: genId(),
          md: item.md,
          theme: item.theme || 'default',
          color: item.color || '#39393a',
          time: item.time || Date.now(),
        }));
      writeMap(map);
    }
  } catch (e) {
    console.error(e);
  }
  localStorage.removeItem(LOCAL_STORE.MD_HISTORY);
}

export function getSnapshots(resumeId: string): Snapshot[] {
  const map = readMap();
  return (map[resumeId] || []).slice().sort((a, b) => b.time - a.time);
}

export function addSnapshot(
  resumeId: string,
  value: { md: string; theme: string; color: string },
  force = false
) {
  if (!resumeId) {
    return;
  }
  const map = readMap();
  const list = map[resumeId] || [];
  const latest = list[list.length - 1];
  const now = Date.now();
  if (latest && latest.md === value.md) {
    return;
  }
  if (!force && latest && now - latest.time < MIN_INTERVAL) {
    return;
  }
  list.push({
    id: genId(),
    ...value,
    time: now,
  });
  while (list.length > MAX_SNAPSHOTS) {
    list.shift();
  }
  map[resumeId] = list;
  writeMap(map);
}

export function deleteSnapshot(resumeId: string, id: string) {
  const map = readMap();
  const list = map[resumeId] || [];
  map[resumeId] = list.filter((item) => item.id !== id);
  writeMap(map);
}
