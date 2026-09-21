import { makeAutoObservable } from "mobx";
import { INIT_COLOR, INIT_CONTENT, themes } from '@utils/const';

class TemplateStore {
	theme: string;
	tempTheme: string;
	color: string;
	mdContent: string;
	html = '';
	isPreview = false;

	constructor(resumeStore?: any) {
		const active = resumeStore?.activeResume;
		this.theme = active?.theme || themes[0].id;
		this.tempTheme = this.theme;
		this.color = active?.color || INIT_COLOR;
		this.mdContent = active?.content || INIT_CONTENT;
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
	}

	setColor = (color: string) => {
		this.color = color;
	};

	setMdContent = (content: string) => {
		this.mdContent = content;
	}

	setHtml = (value: string) => {
		this.html = value;
	}
}

export default TemplateStore;
