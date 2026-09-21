import { LOCAL_STORE, themes } from '@src/utils/const';
import { markdownParserResume } from "@utils/helper";
import { renderPlugin, colorPlugin } from '@src/utils/plugins';
import { getTheme } from "@utils/changeThemes";
import { addSnapshot } from '@src/utils/snapshot';

export let mdEditorRef: any = null;
export let globalEditorCount = Number(localStorage.getItem(LOCAL_STORE.MD_COUNT)) || 0;

export function setMdEditorRef(editor: any) {
    mdEditorRef = editor;
}

export function globalEditorCountIncrease() {
    globalEditorCount++;
}

export function setHtmlView(color: string) {
    const content = mdEditorRef && mdEditorRef.getValue();
    return renderPlugin(markdownParserResume.render(content), {
        plugins: [{
            fn: colorPlugin,
            params: {
                color,
            }
        }]
    })
}

// 将指定简历内容应用到编辑器与预览
export async function applyResumeToEditor(
    record: { content: string; theme: string; color: string },
    templateStore: any
) {
    templateStore.setTheme(record.theme);
    templateStore.setTempTheme(record.theme);
    templateStore.setColor(record.color);
    templateStore.setMdContent(record.content);
    templateStore.setPreview(false);
    if (!mdEditorRef) {
        // 等待编辑器挂载（例如从模板中心跳转回来时）
        await new Promise((resolve) => setTimeout(resolve, 300));
    }
    mdEditorRef && mdEditorRef.setValue(record.content);
    await getTheme(record.theme);
    document.body.style.setProperty("--bg", record.color);
    renderViewStyle(record.color);
}

// 切换简历：先保存当前简历并生成快照，再加载目标简历
export async function switchResume(id: string, resumeStore: any, templateStore: any) {
    const current = resumeStore.activeResume;
    if (current && current.id !== id) {
        resumeStore.saveActive();
        addSnapshot(current.id, {
            md: current.content,
            theme: current.theme,
            color: current.color,
        });
    }
    resumeStore.setActive(id);
    resumeStore.syncLegacyKeys();
    const next = resumeStore.activeResume;
    if (next) {
        await applyResumeToEditor(next, templateStore);
    }
}

// 用户更新 html
export function renderViewStyle(color: string) {
    const rsViewer = document.querySelector(".rs-view") as HTMLElement;
    rsViewer.innerHTML = setHtmlView(color);
    rsViewer.style.height = 'auto';
}
// 更换模板
export async function updateTempalte(theme: string, color:string, setColor: (color: string) => void) {
    const curObj = themes.find(item => item.id === theme);
    if (curObj) {
        // 拉取主题
        await getTheme(theme);
        document.body.style.setProperty("--bg", curObj.defaultColor);
        // 设置当前主题颜色
        setColor(curObj.defaultColor);
        // 渲染html
        renderViewStyle(color);
        // 持久化
        localStorage.setItem(LOCAL_STORE.MD_THEME, curObj.id);
        localStorage.setItem(LOCAL_STORE.MD_COLOR, curObj.defaultColor);
        
    }
}
