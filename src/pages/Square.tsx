import React, { useState, useCallback, useEffect } from "react";
import { Modal, Tag, Input, message } from "antd";
import dayjs from 'dayjs';
import { downloadDirect } from "@utils/helper";
import { switchResume } from "@src/utils/global";
import { useStores } from "@src/store";
import { LOCAL_STORE, themes } from '@src/utils/const';
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

const FAVORITE_FILTER = 'favorite';

const Square = () => {
  const { globalStore: { setCurTab }, resumeStore, templateStore } = useStores();
  const [list, setList] = useState<TemplateItem[]>([]);
  const [template, setTemplate] = useState<TemplateItem | null>(null);
  const [keyword, setKeyword] = useState('');
  const [themeFilter, setThemeFilter] = useState('all');
  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_STORE.MD_FAVORITES) || '[]');
    } catch (e) {
      return [];
    }
  });

  const handleCancel = useCallback(() => {
    setTemplate(null);
  }, []);

  const toggleFavorite = useCallback((id: number, e?: React.MouseEvent) => {
    e && e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      localStorage.setItem(LOCAL_STORE.MD_FAVORITES, JSON.stringify(next));
      return next;
    });
  }, []);

  // 使用模板：新建一份简历，而不是覆盖当前正在编辑的简历
  const handleUse = useCallback(async () => {
    if (template) {
      const { theme, themeColor, template: md, title } = template;
      resumeStore.saveActive();
      const record = resumeStore.createResume({
        name: title,
        content: md,
        theme,
        color: themeColor,
      });
      // 跳转
      window.location.href = '#/';
      setCurTab('#/');
      await switchResume(record.id, resumeStore, templateStore);
      message.success(`已基于模板创建新简历「${record.name}」`);
      setTemplate(null);
    }
  }, [template, resumeStore, templateStore, setCurTab]);

  useEffect(() => {
    const queryTemplate = async () => {
      const result = await axios.get('/data/template.json');
      const resultList = result.data.map((item: any) => ({...item, themeColor: themes.find(theme => item.theme === theme.id)?.defaultColor})) as TemplateItem[];
      setList(resultList);
    }
    queryTemplate();
  }, [])

  const filteredList = list.filter((item) => {
    const matchKeyword = !keyword || item.title.toLowerCase().includes(keyword.trim().toLowerCase());
    let matchTheme = true;
    if (themeFilter === FAVORITE_FILTER) {
      matchTheme = favorites.includes(item.id);
    } else if (themeFilter !== 'all') {
      matchTheme = item.theme === themeFilter;
    }
    return matchKeyword && matchTheme;
  });

  return (
    <div className="rs-square-container">
      <div className="square-toolbar">
        <Input.Search
          className="square-search"
          placeholder="搜索模板名称"
          allowClear
          onChange={(e) => setKeyword(e.target.value)}
        />
        <div className="square-filters">
          <span
            className={`square-filter ${themeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setThemeFilter('all')}
          >
            全部
          </span>
          {themes.map((item) => (
            <span
              key={item.id}
              className={`square-filter ${themeFilter === item.id ? 'active' : ''}`}
              onClick={() => setThemeFilter(item.id)}
            >
              {item.name}
            </span>
          ))}
          <span
            className={`square-filter ${themeFilter === FAVORITE_FILTER ? 'active' : ''}`}
            onClick={() => setThemeFilter(FAVORITE_FILTER)}
          >
            ★ 已收藏
          </span>
        </div>
      </div>
      <div className="square-list">
        {filteredList.map((item) => {
          const isFav = favorites.includes(item.id);
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
                className={`square-fav ${isFav ? 'faved' : ''}`}
                title={isFav ? '取消收藏' : '收藏'}
                onClick={(e) => toggleFavorite(item.id, e)}
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
        {filteredList.length === 0 && (
          <div className="square-empty">没有匹配的模板</div>
        )}
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
                onClick={() => toggleFavorite(template.id)}
              >
                {favorites.includes(template.id) ? '取消收藏' : '收藏'}
              </span>
              <span className="btn btn-normal mr20" onClick={handleUse}>使用模板</span>
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
