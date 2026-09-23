import React, { useEffect, useState } from 'react';
import { Empty } from 'antd';
import { getTheme } from '@utils/changeThemes';
import { renderMdToHtml } from '@src/utils/global';
import { decryptShare, SharePayload } from '@utils/share';
import './Share.less';

const Share: React.FC = () => {
  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const query = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
    const token = new URLSearchParams(query).get('data') || '';
    const data = token ? decryptShare(token) : null;
    if (!data) {
      setInvalid(true);
      return;
    }
    setPayload(data);
    getTheme(data.theme || 'default').then(() => {
      document.body.style.setProperty('--bg', data.color || '#39393a');
    });
  }, []);

  return (
    <div className="rs-share-page">
      <div className="rs-share-header">
        <span className="rs-share-title">
          木及简历 · 只读分享{payload?.name ? `（${payload.name}）` : ''}
        </span>
        <span className="rs-share-tip">该链接为只读分享，内容不可编辑</span>
      </div>
      {invalid && (
        <Empty description="分享链接无效或已损坏" style={{ marginTop: 120 }} />
      )}
      {payload && (
        <div className="rs-share-body">
          <div className="rs-view-inner">
            <div
              className="rs-view"
              dangerouslySetInnerHTML={{
                __html: renderMdToHtml(payload.md, payload.color),
              }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Share;
