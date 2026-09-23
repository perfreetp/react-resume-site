import { LOCAL_STORE, themes } from '@src/utils/const';
import { markdownParserResume } from "@utils/helper";
import { renderPlugin, colorPlugin } from '@src/utils/plugins';
import { getTheme } from "@utils/changeThemes";
import { ResumeMeta, setCurrentResumeId } from '@utils/resume';

export let mdEditorRef: any = null;
export let globalEditorCount = Number(localStorage.getItem(LOCAL_STORE.MD_COUNT)) || 0;

export function setMdEditorRef(editor: any) {
    mdEditorRef = editor;
}

export function globalEditorCountIncrease() {
    globalEditorCount++;
}

// 将 markdown 渲染为带主题色的 html
export function renderMdToHtml(content: string, color: string) {
    return renderPlugin(markdownParserResume.render(content || ''), {
        plugins: [{
            fn: colorPlugin,
            params: {
                color,
            }
        }]
    })
}

export function setHtmlView(color: string) {
    const content = mdEditorRef && mdEditorRef.getValue();
    return renderMdToHtml(content, color);
}

// 用户更新 html
export function renderViewStyle(color: string) {
    const rsViewer = document.querySelector(".rs-view") as HTMLElement;
    rsViewer.innerHTML = setHtmlView(color);
    rsViewer.style.height = 'auto';
}

// 激活一份简历：同步编辑器内容、主题样式与预览
export async function activateResume(resume: ResumeMeta, templateStore: any) {
    setCurrentResumeId(resume.id);
    templateStore.loadResume(resume);
    templateStore.setPreview(false);
    mdEditorRef && mdEditorRef.setValue(resume.md);
    await getTheme(resume.theme);
    document.body.style.setProperty("--bg", resume.color);
    templateStore.setHtml(renderMdToHtml(resume.md, resume.color));
}

// 更换模板
export async function updateTempalte(theme: string, color:string, setColor: (color: string) => void) {
    const curObj = themes.find(item => item.id === theme);
    if (curObj) {
        // 拉取主题
        await getTheme(theme);
        document.body.style.setProperty("--bg", curObj.defaultColor);
        // 设置当前主题颜色（内部会持久化到当前简历）
        setColor(curObj.defaultColor);
        // 渲染html
        renderViewStyle(color);
    }
}
