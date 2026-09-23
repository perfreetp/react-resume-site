import React, { useState, useEffect, useCallback } from 'react';
import { Menu, Dropdown, Modal, List, Popconfirm, Input, message, Tag } from 'antd';
import { observer } from 'mobx-react';
import dayjs from 'dayjs';
import { useStores } from '@src/store';
import {
  ResumeMeta,
  loadResumeData,
  createResume,
  duplicateResume,
  renameResume,
  deleteResume,
} from '@utils/resume';
import { activateResume } from '@src/utils/global';
import './index.less';

const ResumeManager = observer(() => {
  const { templateStore } = useStores();
  const [resumes, setResumes] = useState<ResumeMeta[]>([]);
  const [manageVisible, setManageVisible] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ResumeMeta | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const refresh = useCallback(() => {
    setResumes(loadResumeData().resumes);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, templateStore.resumeId]);

  const switchResume = async (id: string) => {
    if (id === templateStore.resumeId) {
      return;
    }
    const resume = loadResumeData().resumes.find((item) => item.id === id);
    if (resume) {
      await activateResume(resume, templateStore);
      message.success(`已切换到「${resume.name}」`);
    }
  };

  const handleCreate = async () => {
    const resume = createResume();
    await activateResume(resume, templateStore);
    refresh();
    message.success('已新建简历');
  };

  const handleDuplicate = async (id: string) => {
    const resume = duplicateResume(id);
    if (resume) {
      await activateResume(resume, templateStore);
      refresh();
      message.success(`已复制为「${resume.name}」`);
    }
  };

  const handleRename = () => {
    if (renameTarget && renameValue.trim()) {
      renameResume(renameTarget.id, renameValue);
      if (renameTarget.id === templateStore.resumeId) {
        templateStore.resumeName = renameValue.trim();
      }
      refresh();
      setRenameTarget(null);
      message.success('重命名成功');
    }
  };

  const handleDelete = async (id: string) => {
    const current = deleteResume(id);
    if (!current) {
      message.warning('至少保留一份简历');
      return;
    }
    if (id === templateStore.resumeId) {
      await activateResume(current, templateStore);
    }
    refresh();
    message.success('删除成功');
  };

  const menu = (
    <Menu>
      {resumes.map((item) => (
        <Menu.Item key={item.id} onClick={() => switchResume(item.id)}>
          <span className="resume-menu-item">
            <span className="resume-menu-check">
              {item.id === templateStore.resumeId ? '✓' : ''}
            </span>
            <span className="resume-menu-name">{item.name}</span>
          </span>
        </Menu.Item>
      ))}
      <Menu.Divider />
      <Menu.Item key="create" onClick={handleCreate}>
        新建简历
      </Menu.Item>
      <Menu.Item
        key="manage"
        onClick={() => {
          refresh();
          setManageVisible(true);
        }}
      >
        管理简历
      </Menu.Item>
    </Menu>
  );

  return (
    <>
      <Dropdown overlay={menu} trigger={['click']}>
        <a
          className="ant-dropdown-link rs-link"
          onClick={(e) => e.preventDefault()}
        >
          我的简历（{templateStore.resumeName}）
        </a>
      </Dropdown>
      <Modal
        title="管理简历"
        visible={manageVisible}
        onCancel={() => setManageVisible(false)}
        footer={null}
        width={700}
      >
        <List
          itemLayout="horizontal"
          dataSource={resumes}
          renderItem={(item) => (
            <List.Item
              actions={[
                <span
                  key="rename"
                  className="btn btn-normal mr20"
                  onClick={() => {
                    setRenameTarget(item);
                    setRenameValue(item.name);
                  }}
                >
                  重命名
                </span>,
                <span
                  key="duplicate"
                  className="btn btn-normal mr20"
                  onClick={() => handleDuplicate(item.id)}
                >
                  复制
                </span>,
                <Popconfirm
                  key="delete"
                  title="删除后不可恢复，确定删除该简历吗？"
                  onConfirm={() => handleDelete(item.id)}
                  okText="删除"
                  cancelText="取消"
                >
                  <span className="btn btn-normal mr20">删除</span>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={
                  <span>
                    {item.name}
                    {item.id === templateStore.resumeId && (
                      <Tag color="green" style={{ marginLeft: 8 }}>
                        当前
                      </Tag>
                    )}
                  </span>
                }
                description={`最近编辑：${dayjs(item.updateTime).format('YYYY-MM-DD HH:mm:ss')}`}
              />
            </List.Item>
          )}
        />
      </Modal>
      <Modal
        title="重命名简历"
        visible={!!renameTarget}
        onOk={handleRename}
        onCancel={() => setRenameTarget(null)}
        okText="确定"
        cancelText="取消"
      >
        <Input
          value={renameValue}
          maxLength={30}
          placeholder="请输入简历名称"
          onChange={(e) => setRenameValue(e.target.value)}
          onPressEnter={handleRename}
        />
      </Modal>
    </>
  );
});

export default ResumeManager;
