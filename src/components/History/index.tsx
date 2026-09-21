import React, { useEffect, useMemo, useState } from 'react';
import { Modal, List, Tag, Popconfirm, Empty, message } from 'antd';
import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import { useStores } from '@src/store';
import { applyResumeToEditor } from '@src/utils/global';
import { addSnapshot, deleteSnapshot, getSnapshots, Snapshot } from '@src/utils/snapshot';
import { markdownParserResume } from '@utils/helper';
import { renderPlugin, colorPlugin } from '@src/utils/plugins';
import './index.less';

const History = observer(() => {
  const { resumeStore, templateStore } = useStores();
  const [visible, setVisible] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [preview, setPreview] = useState<Snapshot | null>(null);

  const refresh = () => {
    setSnapshots(getSnapshots(resumeStore.activeId));
  };

  useEffect(() => {
    if (visible) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, resumeStore.activeId]);

  const previewHtml = useMemo(() => {
    if (!preview) {
      return '';
    }
    return renderPlugin(markdownParserResume.render(preview.md), {
      plugins: [
        {
          fn: colorPlugin,
          params: {
            color: preview.color,
          },
        },
      ],
    });
  }, [preview]);

  const handleRestore = (item: Snapshot) => {
    // 恢复前先把当前内容存为一个快照，防止误操作丢失
    resumeStore.saveActive();
    const current = resumeStore.activeResume;
    if (current) {
      addSnapshot(
        current.id,
        { md: current.content, theme: current.theme, color: current.color },
        true
      );
    }
    applyResumeToEditor(
      { content: item.md, theme: item.theme, color: item.color },
      templateStore
    );
    resumeStore.saveActive({ content: item.md, theme: item.theme, color: item.color });
    message.success('已恢复到该版本');
    setVisible(false);
  };

  const handleDelete = (item: Snapshot) => {
    deleteSnapshot(resumeStore.activeId, item.id);
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
        title={`版本快照（${resumeStore.activeResume?.name || '当前简历'}）`}
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
                    onClick={() => setPreview(item)}
                  >
                    预览
                  </span>,
                  <Popconfirm
                    key="restore"
                    title="恢复将覆盖当前简历内容（当前内容会自动保存为一个新快照），确定恢复吗？"
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
          ></List>
        )}
      </Modal>
      <Modal
        title={`快照预览 - ${preview ? dayjs(preview.time).format('YYYY-MM-DD HH:mm:ss') : ''}`}
        visible={!!preview}
        onCancel={() => setPreview(null)}
        footer={null}
        width={840}
      >
        <div className="snapshot-preview">
          <div className="rs-view" dangerouslySetInnerHTML={{ __html: previewHtml }}></div>
        </div>
      </Modal>
    </>
  );
});

export default History;
