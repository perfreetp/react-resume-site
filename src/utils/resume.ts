import { INIT_CONTENT, LOCAL_STORE, themes } from '@utils/const';

export interface ResumeMeta {
  id: string;
  name: string;
  md: string;
  theme: string;
  color: string;
  createTime: number;
  updateTime: number;
}

export interface ResumeListData {
  resumes: ResumeMeta[];
  currentId: string;
}

export interface Snapshot {
  id: string;
  md: string;
  theme: string;
  color: string;
  time: number;
}

const MAX_SNAPSHOTS = 20;

export function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function migrateFromLegacy(): ResumeListData {
  const now = Date.now();
  const resume: ResumeMeta = {
    id: genId(),
    name: '默认简历',
    md: localStorage.getItem(LOCAL_STORE.MD_RESUME) || INIT_CONTENT,
    theme: localStorage.getItem(LOCAL_STORE.MD_THEME) || themes[0].id,
    color: localStorage.getItem(LOCAL_STORE.MD_COLOR) || themes[0].defaultColor,
    createTime: now,
    updateTime: now,
  };
  // 老用户的历史记录迁移为默认简历的版本快照
  const historyStr = localStorage.getItem(LOCAL_STORE.MD_HISTORY);
  if (historyStr) {
    try {
      const history = JSON.parse(historyStr);
      if (Array.isArray(history) && history.length) {
        const snapshots: Snapshot[] = history.map((item: any) => ({
          id: genId(),
          md: item.md || '',
          theme: item.theme || themes[0].id,
          color: item.color || themes[0].defaultColor,
          time: item.time || now,
        }));
        localStorage.setItem(
          LOCAL_STORE.MD_SNAPSHOTS,
          JSON.stringify({ [resume.id]: snapshots })
        );
      }
    } catch (e) {
      console.log(e);
    }
  }
  return { resumes: [resume], currentId: resume.id };
}

export function loadResumeData(): ResumeListData {
  const raw = localStorage.getItem(LOCAL_STORE.MD_RESUME_LIST);
  if (raw) {
    try {
      const data: ResumeListData = JSON.parse(raw);
      if (data && Array.isArray(data.resumes) && data.resumes.length) {
        if (!data.resumes.find((item) => item.id === data.currentId)) {
          data.currentId = data.resumes[0].id;
        }
        return data;
      }
    } catch (e) {
      console.log(e);
    }
  }
  const data = migrateFromLegacy();
  saveResumeData(data);
  return data;
}

export function saveResumeData(data: ResumeListData) {
  localStorage.setItem(LOCAL_STORE.MD_RESUME_LIST, JSON.stringify(data));
}

export function getCurrentResume(): ResumeMeta {
  const data = loadResumeData();
  return data.resumes.find((item) => item.id === data.currentId) || data.resumes[0];
}

export function setCurrentResumeId(id: string) {
  const data = loadResumeData();
  if (data.resumes.find((item) => item.id === id)) {
    data.currentId = id;
    saveResumeData(data);
  }
}

export function createResume(partial: Partial<ResumeMeta> = {}): ResumeMeta {
  const data = loadResumeData();
  const now = Date.now();
  const resume: ResumeMeta = {
    id: genId(),
    name: partial.name || `未命名简历 ${data.resumes.length + 1}`,
    md: typeof partial.md === 'string' ? partial.md : INIT_CONTENT,
    theme: partial.theme || themes[0].id,
    color: partial.color || themes[0].defaultColor,
    createTime: now,
    updateTime: now,
  };
  data.resumes.push(resume);
  data.currentId = resume.id;
  saveResumeData(data);
  return resume;
}

export function duplicateResume(id: string): ResumeMeta | null {
  const data = loadResumeData();
  const source = data.resumes.find((item) => item.id === id);
  if (!source) {
    return null;
  }
  const now = Date.now();
  const resume: ResumeMeta = {
    ...source,
    id: genId(),
    name: `${source.name} 副本`,
    createTime: now,
    updateTime: now,
  };
  data.resumes.push(resume);
  data.currentId = resume.id;
  saveResumeData(data);
  return resume;
}

export function renameResume(id: string, name: string) {
  const data = loadResumeData();
  const resume = data.resumes.find((item) => item.id === id);
  if (resume && name.trim()) {
    resume.name = name.trim();
    resume.updateTime = Date.now();
    saveResumeData(data);
  }
}

export function updateResume(id: string, patch: Partial<ResumeMeta>) {
  const data = loadResumeData();
  const resume = data.resumes.find((item) => item.id === id);
  if (resume) {
    Object.assign(resume, patch);
    resume.updateTime = Date.now();
    saveResumeData(data);
  }
}

// 删除简历，返回删除后应激活的简历
export function deleteResume(id: string): ResumeMeta | null {
  const data = loadResumeData();
  if (data.resumes.length <= 1) {
    return null;
  }
  data.resumes = data.resumes.filter((item) => item.id !== id);
  if (data.currentId === id) {
    data.currentId = data.resumes[0].id;
  }
  saveResumeData(data);
  const map = loadSnapshotMap();
  if (map[id]) {
    delete map[id];
    localStorage.setItem(LOCAL_STORE.MD_SNAPSHOTS, JSON.stringify(map));
  }
  return data.resumes.find((item) => item.id === data.currentId) || data.resumes[0];
}

// ---------- 版本快照 ----------

function loadSnapshotMap(): Record<string, Snapshot[]> {
  const raw = localStorage.getItem(LOCAL_STORE.MD_SNAPSHOTS);
  if (raw) {
    try {
      const map = JSON.parse(raw);
      if (map && typeof map === 'object') {
        return map;
      }
    } catch (e) {
      console.log(e);
    }
  }
  return {};
}

export function loadSnapshots(resumeId: string): Snapshot[] {
  const map = loadSnapshotMap();
  // 存储时按时间先后追加，读取时倒序（最新的在前）
  return (map[resumeId] || []).slice().reverse();
}

export function addSnapshot(resumeId: string, value: { md: string; theme: string; color: string }) {
  const map = loadSnapshotMap();
  const list = map[resumeId] || [];
  const latest = list[list.length - 1];
  if (latest && latest.md === value.md && latest.theme === value.theme && latest.color === value.color) {
    return;
  }
  list.push({
    id: genId(),
    md: value.md,
    theme: value.theme,
    color: value.color,
    time: Date.now(),
  });
  while (list.length > MAX_SNAPSHOTS) {
    list.shift();
  }
  map[resumeId] = list;
  localStorage.setItem(LOCAL_STORE.MD_SNAPSHOTS, JSON.stringify(map));
}

export function deleteSnapshot(resumeId: string, snapshotId: string) {
  const map = loadSnapshotMap();
  map[resumeId] = (map[resumeId] || []).filter((item) => item.id !== snapshotId);
  localStorage.setItem(LOCAL_STORE.MD_SNAPSHOTS, JSON.stringify(map));
}
