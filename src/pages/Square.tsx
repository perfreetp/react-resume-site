import React, { useState, useCallback, useEffect } from "react";
import { Modal, Tag, Input, Select, Checkbox, Empty, message } from "antd";
import dayjs from 'dayjs';
import { downloadDirect } from "@utils/helper";
import { activateResume } from "@src/utils/global";
import { useStores } from "@src/store";
import { LOCAL_STORE, themes } from '@src/utils/const';
import { createResume } from '@utils/resume';
import "./Square.less";
import axios from 'axios';

export interface TemplateItem {
  id: number;
  title: string;
  thumbnail: string;
  template: string;
  author: string;
  avatar: string;
  themeColor: string;
  theme: string;
  collect: number;
  updateTime: number;
}

function loadFavs(): number[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORE.MD_TEMPLATE_FAVS);
    const favs = raw ? JSON.parse(raw) : [];
    return Array.isArray(favs) ? favs : [];
  } catch (e) {
    return [];
  }
}

const Square = () => {
  const { globalStore: { setCurTab }} = useStores();
  const [list, setList] = useState<TemplateItem[]>([]);
  const { templateStore } = useStores();
  const [template, setTemplate] = useState<TemplateItem | null>(null);
  const [keyword, setKeyword] = useState('');
  const [themeFilter, setThemeFilter] = useState('all');
  const [onlyFav, setOnlyFav] = useState(false);
  const [favs, setFavs] = useState<number[]>(loadFavs());

  const handleCancel = useCallback(() => {
    setTemplate(null);
  }, []);

  const toggleFav = useCallback((id: number) => {
    setFavs((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      localStorage.setItem(LOCAL_STORE.MD_TEMPLATE_FAVS, JSON.stringify(next));
      return next;
    });
  }, []);

  // 使用模板：新建一份简历，而不是覆盖当前编辑内容
  const handleUse = useCallback(async () => {
    if (template) {
      const { theme, themeColor, template: md, title } = template;
      const resume = createResume({
        name: title,
        md,
        theme,
        color: themeColor,
      });
      await activateResume(resume, templateStore);
      message.success(`已基于模板新建简历「${resume.name}」`);
      setTemplate(null);
      // 跳转
      window.location.href = '#/';
      setCurTab('#/');
    }
  }, [template, templateStore, setCurTab]);

  useEffect(() => {
    const queryTemplate = async () => {
      const result = await axios.get('/data/template.json');
      const resultList = result.data.map((item: any) => ({...item, themeColor: themes.find(theme => item.theme === theme.id)?.defaultColor})) as TemplateItem[];
      setList(resultList);
    }
    queryTemplate();
  }, [])

  const filteredList = list.filter((item) => {
    const kw = keyword.trim().toLowerCase();
    const matchKeyword = !kw || item.title.toLowerCase().includes(kw) || (item.author || '').toLowerCase().includes(kw);
    const matchTheme = themeFilter === 'all' || item.theme === themeFilter;
    const matchFav = !onlyFav || favs.includes(item.id);
    return matchKeyword && matchTheme && matchFav;
  });

  return (
    <div className="rs-square-wrapper">
      <div className="rs-square-toolbar">
        <Input.Search
          className="rs-square-search"
          placeholder="搜索模板名称 / 作者"
          allowClear
          onChange={(e) => setKeyword(e.target.value)}
          onSearch={(value) => setKeyword(value)}
        />
        <Select
          className="rs-square-theme-filter"
          value={themeFilter}
          onChange={(value) => setThemeFilter(value)}
        >
          <Select.Option value="all">全部主题</Select.Option>
          {themes.map((item) => (
            <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>
          ))}
        </Select>
        <Checkbox checked={onlyFav} onChange={(e) => setOnlyFav(e.target.checked)}>
          只看收藏
        </Checkbox>
      </div>
      <div className="rs-square-container">
        {filteredList.length === 0 && (
          <Empty description="没有符合条件的模板" style={{ margin: '60px auto' }} />
        )}
        {filteredList.map((item) => {
          const isFav = favs.includes(item.id);
          return (
            <div className="rs-square" key={item.id}>
              <div className="rs-square-bg"></div>
              <div
                className="rs-square-btn"
                onClick={() => {
                  setTemplate(item);
                }}
              >
                查看模板
              </div>
              <span
                className={`rs-square-fav ${isFav ? 'active' : ''}`}
                title={isFav ? '取消收藏' : '收藏'}
                onClick={() => toggleFav(item.id)}
              >
                {isFav ? '★' : '☆'}
              </span>
              <img src={item.thumbnail} alt="" />
              <div className="rs-userInfo">
                <span>{item.title}</span>
              </div>
            </div>
          );
        })}
      </div>
      {template && (
        <Modal
          bodyStyle={{
            backgroundColor: '#fafafb'
          }}
          title={template.title}
          visible={!!template}
          width={700}
          onCancel={handleCancel}
          footer={
            <div className="square-footer">
              <span className="btn btn-normal mr20" onClick={() => {
                const file = new Blob([template.template]);
                const url = URL.createObjectURL(file);
                downloadDirect(url, `${template.title}.md`);
              }}>下载md</span>
              <span
                className="btn btn-normal mr20"
                onClick={() => toggleFav(template.id)}
              >
                {favs.includes(template.id) ? '取消收藏' : '收藏'}
              </span>
              <span className="btn btn-normal mr20" onClick={handleUse}>使用模板（新建简历）</span>
            </div>
          }
        >
          <div className="square-modal">
            <div className="square-modal-left">
              <img src={template.thumbnail} alt=""/>
            </div>
            <div className="square-modal-right">
              <div className="top-info">
                <a href="">
                  <img src={template.avatar} alt=""/>
                </a>
                <div className="top-info-content">
                  <span className="info-text">作者: 秋风</span>
                  <span className="info-text">更新日期: {dayjs(template.updateTime).format('YYYY-MM-DD')}</span>
                </div>
              </div>
              <div className="top-list">
                <span className="info-text">
                  <svg className="icon" aria-hidden="true">
                    <use xlinkHref="#icon-shoucang1" />
                  </svg>
                  <span className="text">收藏</span>
                  <span className="value">{template.collect}+</span>
                </span>
                <span className="info-text">
                  <svg className="icon" aria-hidden="true">
                    <use xlinkHref="#icon-jingzi" />
                  </svg>
                  <span className="text">主题</span>
                  <span className="value">{template.theme}</span>
                </span>
                <span className="info-text">
                  <svg className="icon" aria-hidden="true">
                    <use xlinkHref="#icon-color" />
                  </svg>
                  <span className="text">主题色</span>
                  <span className="value"><Tag color={template.themeColor}>{template.themeColor}</Tag></span>
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Square;
