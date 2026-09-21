
import React from "react";
import TemplateStore from "./template.store";
import GlobalStore from "./global.store";
import ResumeStore from "./resume.store";

class RootStore {
	templateStore
	globalStore
	resumeStore
	constructor() {
		this.resumeStore = new ResumeStore();
		this.templateStore = new TemplateStore(this.resumeStore);
		this.resumeStore.templateStore = this.templateStore;
		this.globalStore = new GlobalStore();
	}
}

const StoresContext = React.createContext(new RootStore());

// this will be the function available for the app to connect to the stores
export const useStores = () => React.useContext(StoresContext);
