import { makeAutoObservable } from "mobx";
import { INIT_CONTENT, LOCAL_STORE, themes } from '@utils/const';
import { migrateLegacyHistory } from '@src/utils/snapshot';

export interface ResumeRecord {
  id: string;
  name: string;
  content: string;
  theme: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

interface ResumeData {
  activeId: string;
  list: ResumeRecord[];
}

function genId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadResumeData(): { data: ResumeData; migrated: boolean } {
  const { MD_RESUMES, MD_RESUME, MD_THEME, MD_COLOR } = LOCAL_STORE;
  const storeStr = localStorage.getItem(MD_RESUMES);
  if (storeStr) {
    try {
      const data = JSON.parse(storeStr) as ResumeData;
      if (data && Array.isArray(data.list) && data.list.length > 0) {
        if (!data.list.some((item) => item.id === data.activeId)) {
          data.activeId = data.list[0].id;
        }
        return { data, migrated: false };
      }
    } catch (e) {
      console.error(e);
    }
  }
  // 老用户数据迁移：已有的单份简历自动迁移为默认简历
  const now = Date.now();
  const theme = localStorage.getItem(MD_THEME) || themes[0].id;
  const defaultResume: ResumeRecord = {
    id: genId(),
    name: '我的简历',
    content: localStorage.getItem(MD_RESUME) || INIT_CONTENT,
    theme,
    color:
      localStorage.getItem(MD_COLOR) ||
      themes.find((item) => item.id === theme)?.defaultColor ||
      '#39393a',
    createdAt: now,
    updatedAt: now,
  };
  return { data: { activeId: defaultResume.id, list: [defaultResume] }, migrated: true };
}

class ResumeStore {
  resumes: ResumeRecord[] = [];
  activeId = '';
  templateStore: any = null;

  constructor() {
    const { data, migrated } = loadResumeData();
    this.resumes = data.list;
    this.activeId = data.activeId;
    makeAutoObservable(this);
    this.persist();
    if (migrated) {
      migrateLegacyHistory(this.activeId);
    }
  }

  get activeResume(): ResumeRecord | undefined {
    return this.resumes.find((item) => item.id === this.activeId) || this.resumes[0];
  }

  persist = () => {
    localStorage.setItem(
      LOCAL_STORE.MD_RESUMES,
      JSON.stringify({
        activeId: this.activeId,
        list: this.resumes,
      })
    );
  };

  // 同步旧版单简历存储 key，保证 PDF 导出等旧逻辑读取一致
  syncLegacyKeys = () => {
    const active = this.activeResume;
    if (!active) {
      return;
    }
    localStorage.setItem(LOCAL_STORE.MD_RESUME, active.content);
    localStorage.setItem(LOCAL_STORE.MD_THEME, active.theme);
    localStorage.setItem(LOCAL_STORE.MD_COLOR, active.color);
  };

  saveActive = (patch?: Partial<Pick<ResumeRecord, 'content' | 'theme' | 'color'>>) => {
    const active = this.activeResume;
    if (!active) {
      return;
    }
    const store = this.templateStore;
    active.content = patch?.content ?? store?.mdContent ?? active.content;
    active.theme = patch?.theme ?? store?.theme ?? active.theme;
    active.color = patch?.color ?? store?.color ?? active.color;
    active.updatedAt = Date.now();
    this.persist();
    this.syncLegacyKeys();
  };

  createResume = (options?: {
    name?: string;
    content?: string;
    theme?: string;
    color?: string;
  }): ResumeRecord => {
    const now = Date.now();
    const record: ResumeRecord = {
      id: genId(),
      name: options?.name || `未命名简历 ${this.resumes.length + 1}`,
      content: options?.content ?? INIT_CONTENT,
      theme: options?.theme || themes[0].id,
      color:
        options?.color ||
        themes.find((item) => item.id === (options?.theme || themes[0].id))?.defaultColor ||
        themes[0].defaultColor,
      createdAt: now,
      updatedAt: now,
    };
    this.resumes.push(record);
    this.persist();
    return record;
  };

  duplicateResume = (id: string): ResumeRecord | null => {
    const index = this.resumes.findIndex((item) => item.id === id);
    if (index === -1) {
      return null;
    }
    const source = this.resumes[index];
    const now = Date.now();
    const record: ResumeRecord = {
      ...source,
      id: genId(),
      name: `${source.name} 副本`,
      createdAt: now,
      updatedAt: now,
    };
    this.resumes.splice(index + 1, 0, record);
    this.persist();
    return record;
  };

  renameResume = (id: string, name: string) => {
    const target = this.resumes.find((item) => item.id === id);
    if (!target || !name.trim()) {
      return;
    }
    target.name = name.trim();
    target.updatedAt = Date.now();
    this.persist();
  };

  deleteResume = (id: string): boolean => {
    if (this.resumes.length <= 1) {
      return false;
    }
    const index = this.resumes.findIndex((item) => item.id === id);
    if (index === -1) {
      return false;
    }
    this.resumes.splice(index, 1);
    if (this.activeId === id) {
      this.activeId = (this.resumes[index] || this.resumes[index - 1]).id;
    }
    this.persist();
    return true;
  };

  setActive = (id: string) => {
    if (this.resumes.some((item) => item.id === id)) {
      this.activeId = id;
      this.persist();
    }
  };
}

export default ResumeStore;
