import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Menu,
  Dropdown,
  message,
  Modal,
  Form,
  Switch,
  Input,
  FormInstance,
  Tag
} from "antd";
import htmlParser from 'rs-md-html-parser';
import "./index.less";
import { getTheme } from "@utils/changeThemes";
import { downloadDirect, downloadFetch, downloadByContent, markdownParserArticle, copyText } from "@utils/helper";
import { getPdf } from "@src/service/htmlToPdf";
import { useStores } from "@src/store";
import { mdEditorRef, globalEditorCount, updateTempalte, renderViewStyle, activateResume } from "@src/utils/global";
import { TUTORIALS_GUIDE, LOCAL_STORE, UPDATE_CONTENT, UPDATE_LOG_VERSION } from '@src/utils/const';
import { createResume } from "@utils/resume";
import { buildShareLink } from "@utils/share";
import { observer } from "mobx-react";
import { themes } from '@utils/const';
import Shortcuts from "@src/components/Shortcuts";
import History from "@src/components/History";
import ResumeManager from "@src/components/ResumeManager";

const is_update = +(localStorage.getItem(LOCAL_STORE.MD_UPDATE_LOG) || 0) >= UPDATE_LOG_VERSION ? false : true;

const HeaderBar = observer(() => {
  const { templateStore } = useStores();
  const { setTempTheme , tempTheme, theme, color, setColor, setTheme, setPreview, mdContent, isPreview } = templateStore;
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isExportVisible, setIsExportVisible] = useState(false);
  const [isUsageVisible, setIsUsageVisible] = useState(false);
  const [isUpdateVisible, setIsUpdateVisible] = useState(is_update);
  const [isShareVisible, setIsShareVisible] = useState(false);
  const [shareLink, setShareLink] = useState('');

  const formRef = useRef<FormInstance>(null);

  const handleOk = async () => {
    // 更新模板
    await updateTempalte(tempTheme, color, setColor);
    // 设置模板
    setTheme(tempTheme);
    // 关闭弹窗
    setIsModalVisible(false);
  };

  const uploadMdFile = useCallback((e: any) => {
    let resultFile = e.target.files[0];
    if (!resultFile) {
      return;
    }
    var reader = new FileReader();
    reader.readAsText(resultFile);
    reader.onload = (ev) => {
      if (ev.target?.result) {
        mdEditorRef && (mdEditorRef.setValue(ev.target.result));
        setPreview(false);
        renderViewStyle(color);
      }
    };
    e.target.value = '';
  }, [color, setPreview]);

  const uploadJsonFile = useCallback((e: any) => {
    const resultFile = e.target.files[0];
    if (!resultFile) {
      return;
    }
    const reader = new FileReader();
    reader.readAsText(resultFile);
    reader.onload = async (ev) => {
      try {
        const backup = JSON.parse(String(ev.target?.result || ''));
        if (typeof backup.md !== 'string') {
          throw new Error('invalid backup');
        }
        // 以新简历的方式完整还原备份内容
        const resume = createResume({
          name: backup.name ? `${backup.name}` : '导入的简历',
          md: backup.md,
          theme: backup.theme || themes[0].id,
          color: backup.color || themes[0].defaultColor,
        });
        await activateResume(resume, templateStore);
        message.success('JSON 备份导入成功，已还原为新简历');
      } catch (err) {
        message.error('导入失败，请选择有效的 JSON 备份文件');
      }
    };
    e.target.value = '';
  }, [templateStore]);

  const exportMdFile = useCallback(() => {
    const file = new Blob([mdContent]);
    const url = URL.createObjectURL(file);
    downloadDirect(url, `${templateStore.resumeName || '木及简历'}.md`);
  }, [mdContent, templateStore.resumeName]);

  const exportJsonFile = useCallback(() => {
    const backup = {
      type: 'muji-resume-backup',
      version: 1,
      name: templateStore.resumeName,
      md: templateStore.mdContent,
      theme: templateStore.theme,
      color: templateStore.color,
      exportTime: Date.now(),
    };
    downloadByContent(
      JSON.stringify(backup, null, 2),
      `${templateStore.resumeName || '木及简历'}-备份.json`,
      'application/json'
    );
  }, [templateStore]);

  const handleShare = useCallback(() => {
    const link = buildShareLink({
      name: templateStore.resumeName,
      md: templateStore.mdContent,
      theme: templateStore.theme,
      color: templateStore.color,
    });
    setShareLink(link);
    setIsShareVisible(true);
  }, [templateStore]);

  const templateContent = (
    <div className="template-wrapper">
      {themes.map((item) => {
        return (
          <div
            className={`template ${item.id === tempTheme ? "active" : ""}`}
            key={item.id}
            onClick={(e) => {
              e.preventDefault();
              setTempTheme(item.id);
            }}
          >
            <img className="template-img" src={item.src}></img>
            <p className="template-title">{item.name}
              {item.isColor && <Tag color="#2db7f5">可换色</Tag>}
            </p>
          </div>
        );
      })}
    </div>
  );

  const filesMenu = (
    <Menu>
      <Menu.Item>
        <label htmlFor="uploadMdFile">
          <a rel="noopener noreferrer">导入md</a>
          <input
            type="file"
            id="uploadMdFile"
            accept=".md"
            className="uploadMd"
            onChange={uploadMdFile}
          ></input>
        </label>
      </Menu.Item>
      <Menu.Item>
        <label htmlFor="uploadJsonFile">
          <a rel="noopener noreferrer">导入JSON备份</a>
          <input
            type="file"
            id="uploadJsonFile"
            accept=".json"
            className="uploadMd"
            onChange={uploadJsonFile}
          ></input>
        </label>
      </Menu.Item>
      <Menu.Item>
        <a rel="noopener noreferrer" onClick={exportMdFile}>
          导出Markdown
        </a>
      </Menu.Item>
      <Menu.Item>
        <a rel="noopener noreferrer" onClick={exportJsonFile}>
          导出JSON备份
        </a>
      </Menu.Item>
    </Menu>
  );

  const handleExport = () => {
    formRef.current?.submit();
    setIsExportVisible(false);
  };

  const exportPdf = async ({
    name,
    isOnePage,
    isMark,
  }: {
    name: string;
    isOnePage: boolean;
    isMark: boolean;
  }) => {
    // 设置渲染
    const rsViewer = document.querySelector(".rs-view") as HTMLElement;
    if (!isPreview) {
      setPreview(true);
      htmlParser(rsViewer);
    }
    const pages = rsViewer.dataset.pages || '1';
    const rsLine = document.querySelectorAll('.rs-line-split');
    rsLine.forEach(item => item.parentNode?.removeChild(item));
    const content = templateStore.mdContent;

    if (content) {
      const htmlContent = document.querySelector('.rs-view-inner')?.innerHTML.replace(/(\n|\r)/g, "");
      let hide = message.loading("正在为你生成简历...", 0);
      if (globalEditorCount < 2) {
        try {
          hide();
          const curThemes = themes.filter(item => item.id === theme);
          await downloadFetch(curThemes[0].defaultUrl, name ? `${name}.pdf` : "木及简历.pdf");
        } catch (e) {
          hide();
        }
        return;
      }
      const themeColor = getComputedStyle(document.body).getPropertyValue(
        "--bg"
      );
      try {
        let data = await getPdf({
          htmlContent: String(htmlContent),
          theme,
          themeColor,
          isMark,
          isOnePage,
          pages
        });
        await downloadFetch(data.url, name ? `${name}.pdf` : "木及简历.pdf");
        hide();
        message.success("恭喜你，导出成功!")
      } catch (e) {
        hide();
        message.error("生成简历出错，请稍再试!");
      }
      setPreview(false);
      renderViewStyle(color);
    }
  };

  useEffect(() => {
    getTheme(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="rs-header-bar rs-link">
      <div className="rs-header-bar__left">
        {/* <a className="rs-logo rs-link">
          <img src="https://s3.qiufeng.blue/muji/muji-logo.jpg" alt=""/>
          木及简历
        </a> */}
        <ResumeManager></ResumeManager>
        <Dropdown overlay={filesMenu} trigger={["click"]}>
          <a
            className="ant-dropdown-link rs-link"
            onClick={(e) => e.preventDefault()}
          >
            文件
          </a>
        </Dropdown>
        <a className="ant-dropdown-link rs-link" onClick={() => {
          setIsModalVisible(true);
        }}>
          选择模板
        </a>
        <a className="ant-dropdown-link rs-link" onClick={() => {
          setIsUsageVisible(true);
        }}>
          使用教程
        </a>
        <Shortcuts></Shortcuts>
        <History></History>
        <a
          href="#"
          className="rs-link"
          onClick={(e) => {
            e.preventDefault();
            handleShare();
          }}
        >
          分享
        </a>
        <a
          href="#"
          className="rs-link"
          onClick={() => {
            setIsExportVisible(true);
          }}
        >
          导出 pdf
        </a>
      </div>
      <Modal
        title="请选择模板"
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={() => {
          setTempTheme(theme);
          setIsModalVisible(false);
        }}
        cancelText="取消"
        okText="确定"
        width={1100}
      >
        {templateContent}
      </Modal>
      <Modal
        title="使用教程"
        visible={isUsageVisible}
        width={700}
        cancelText="取消"
        okText="确定"
        onOk={() => {
          setIsUsageVisible(false);
        }}
        onCancel={() => {
          setIsUsageVisible(false);
        }}
      >
        <div className="rs-article-container" dangerouslySetInnerHTML={{
          __html: markdownParserArticle.render(TUTORIALS_GUIDE)
        }}></div>
      </Modal>
      {<Modal
        title="更新日志"
        visible={isUpdateVisible}
        cancelText="取消"
        okText="确定"
        width={700}
        onOk={() => {
          localStorage.setItem(LOCAL_STORE.MD_UPDATE_LOG, `${UPDATE_LOG_VERSION}`);
          setIsUpdateVisible(false);
        }}
        onCancel={() => {
          localStorage.setItem(LOCAL_STORE.MD_UPDATE_LOG, `${UPDATE_LOG_VERSION}`);
          setIsUpdateVisible(false);
        }}
      >
        <div className="rs-article-container" dangerouslySetInnerHTML={{
          __html: markdownParserArticle.render(UPDATE_CONTENT)
        }}></div>
      </Modal>}
      <Modal
        title="分享简历（只读）"
        visible={isShareVisible}
        onCancel={() => setIsShareVisible(false)}
        footer={null}
      >
        <p>打开以下链接即可只读查看当前简历，无法编辑：</p>
        <Input.TextArea value={shareLink} autoSize readOnly />
        <div style={{ marginTop: 12, textAlign: 'right' }}>
          <span
            className="btn btn-normal"
            onClick={() => {
              copyText(shareLink, () => {
                message.success('链接已复制');
              });
            }}
          >
            复制链接
          </span>
        </div>
      </Modal>
      {isExportVisible && (
        <Modal
          title="导出确认"
          visible={isExportVisible}
          onOk={handleExport}
          onCancel={() => {
            setIsExportVisible(false);
          }}
          cancelText="取消"
          okText="确认"
        >
          <Form
            ref={formRef}
            labelCol={{ span: 6 }}
            wrapperCol={{ span: 14 }}
            layout="horizontal"
            initialValues={{
              isMark: true,
            }}
            onFinish={(values: any) => {
              exportPdf({
                ...values,
                isMark: false
              });
            }}
          >
            <Form.Item name="name" label="简历名称">
              <Input placeholder="不填则系统命名" />
            </Form.Item>
            <Form.Item name="isOnePage" label="是否一页纸" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Form>
        </Modal>
      )}
    </div>
  );
});

export default HeaderBar;
