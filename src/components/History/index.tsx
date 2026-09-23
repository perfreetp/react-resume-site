import React, { useState, useEffect } from 'react';
import { Modal, List, Tag, Popconfirm, Empty, message } from 'antd';
import dayjs from 'dayjs';
import axios from 'axios';
import { observer } from 'mobx-react';
import { Snapshot, loadSnapshots, deleteSnapshot } from '@utils/resume';
import { mdEditorRef, renderMdToHtml } from '@src/utils/global';
import { useStores } from '@src/store';
import { getTheme } from '@utils/changeThemes';
import './index.less';

const History = observer(() => {
  const { templateStore } = useStores();
  const [visible, setVisible] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [preview, setPreview] = useState<Snapshot | null>(null);
  const [previewCss, setPreviewCss] = useState('');

  const refresh = () => {
    setSnapshots(loadSnapshots(templateStore.resumeId));
  };

  useEffect(() => {
    if (visible) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, templateStore.resumeId]);

  const handlePreview = async (item: Snapshot) => {
    setPreview(item);
    try {
      const result = await axios.get(`/themes/${item.theme}.css`);
      // 将主题样式作用域限定在预览容器内，避免影响当前编辑器
      setPreviewCss(String(result.data).replace(/\.rs-view/g, '.snapshot-preview-view'));
    } catch (e) {
      setPreviewCss('');
    }
  };

  const handleRestore = async (item: Snapshot) => {
    const { md, theme, color } = item;
    // 更新 store（内部持久化到当前简历）
    templateStore.setTheme(theme);
    templateStore.setColor(color);
    templateStore.setMdContent(md);
    templateStore.setPreview(false);
    // 同步编辑器与视图
    mdEditorRef && mdEditorRef.setValue(md);
    await getTheme(theme);
    document.body.style.setProperty('--bg', color);
    templateStore.setHtml(renderMdToHtml(md, color));
    setVisible(false);
    message.success('已恢复到该版本');
  };

  const handleDelete = (item: Snapshot) => {
    deleteSnapshot(templateStore.resumeId, item.id);
    refresh();
    message.success('快照已删除');
  };

  return (
    <>
      <a
        className="ant-dropdown-link rs-link"
        onClick={(e) => {
          e.preventDefault();
          setVisible(true);
        }}
      >
        版本快照
      </a>
      <Modal
        title={`版本快照（${templateStore.resumeName}）`}
        visible={visible}
        onCancel={() => {
          setVisible(false);
        }}
        footer={null}
        width={1100}
      >
        {snapshots.length === 0 ? (
          <Empty description="暂无快照，编辑内容后会自动保存版本快照" />
        ) : (
          <List
            className="history-list"
            itemLayout="horizontal"
            dataSource={snapshots}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <span
                    key="preview"
                    className="btn btn-normal mr20"
                    onClick={() => handlePreview(item)}
                  >
                    预览
                  </span>,
                  <Popconfirm
                    key="restore"
                    title="恢复该版本将覆盖当前简历内容，确定恢复吗？"
                    onConfirm={() => handleRestore(item)}
                    okText="恢复"
                    cancelText="取消"
                  >
                    <span className="btn btn-normal mr20">恢复</span>
                  </Popconfirm>,
                  <Popconfirm
                    key="delete"
                    title="确定删除该快照吗？"
                    onConfirm={() => handleDelete(item)}
                    okText="删除"
                    cancelText="取消"
                  >
                    <span className="btn btn-normal mr20">删除</span>
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  avatar={''}
                  title={dayjs(item.time).format('YYYY-MM-DD HH:mm:ss')}
                  description={item.md.slice(0, 800) + '...'}
                />
                <span className="hist">{item.theme}</span>
                <Tag color={item.color}>{item.color}</Tag>
              </List.Item>
            )}
          />
        )}
      </Modal>
      <Modal
        title={`快照预览 - ${preview ? dayjs(preview.time).format('YYYY-MM-DD HH:mm:ss') : ''}`}
        visible={!!preview}
        onCancel={() => setPreview(null)}
        footer={null}
        width={900}
      >
        {preview && (
          <div className="snapshot-preview">
            {previewCss && <style>{previewCss}</style>}
            <div
              className="snapshot-preview-view"
              dangerouslySetInnerHTML={{
                __html: renderMdToHtml(preview.md, preview.color),
              }}
            ></div>
          </div>
        )}
      </Modal>
    </>
  );
});

export default History;
