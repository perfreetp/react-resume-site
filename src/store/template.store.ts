import { makeAutoObservable } from "mobx";
import { getCurrentResume, updateResume, ResumeMeta } from '@utils/resume';

const currentResume = getCurrentResume();

document.body.style.setProperty("--bg", currentResume.color);

class TemplateStore {
	resumeId = currentResume.id;
	resumeName = currentResume.name;
	theme = currentResume.theme;
	tempTheme = currentResume.theme;
	color = currentResume.color;
	mdContent = currentResume.md;
	html = '';
	isPreview = false;

	constructor() {
		makeAutoObservable(this);
	}

	setPreview = (value: boolean) => {
		this.isPreview = value;
	}

	setTempTheme = (theme: string) => {
		// 用户选择页
		this.tempTheme = theme;
	}

	setTheme = (theme: string) => {
		this.theme = theme;
		updateResume(this.resumeId, { theme });
	}

	setColor = (color: string) => {
		this.color = color;
		updateResume(this.resumeId, { color });
	};

	setMdContent = (content: string) => {
		this.mdContent = content;
		updateResume(this.resumeId, { md: content });
	}

	setHtml = (value: string) => {
		this.html = value;
	}

	// 加载一份简历到编辑器（不触发额外持久化）
	loadResume = (resume: ResumeMeta) => {
		this.resumeId = resume.id;
		this.resumeName = resume.name;
		this.theme = resume.theme;
		this.tempTheme = resume.theme;
		this.color = resume.color;
		this.mdContent = resume.md;
	}
}

export default TemplateStore;
