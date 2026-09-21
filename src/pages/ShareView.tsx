import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { parseShareLink, SharePayload } from '@src/utils/share';
import { getTheme } from '@utils/changeThemes';
import { markdownParserResume } from '@utils/helper';
import { renderPlugin, colorPlugin } from '@src/utils/plugins';
import './ShareView.less';

const ShareView = () => {
  const location = useLocation();
  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const data = parseShareLink(location.search);
    if (!data) {
      setError(true);
      return;
    }
    setPayload(data);
    document.body.style.setProperty('--bg', data.color);
    getTheme(data.theme);
  }, [location.search]);

  const html = payload
    ? renderPlugin(markdownParserResume.render(payload.content), {
        plugins: [
          {
            fn: colorPlugin,
            params: {
              color: payload.color,
            },
          },
        ],
      })
    : '';

  return (
    <div className="rs-share">
      <div className="rs-share-header">
        <span className="rs-share-title">{payload?.name || '简历分享'}</span>
        <span className="rs-share-tip">只读模式 · 由木及简历生成</span>
      </div>
      {error && <div className="rs-share-error">分享链接无效或已损坏</div>}
      {payload && (
        <div className="rs-share-body">
          <div className="rs-view-inner">
            <div className="rs-view" dangerouslySetInnerHTML={{ __html: html }}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShareView;
