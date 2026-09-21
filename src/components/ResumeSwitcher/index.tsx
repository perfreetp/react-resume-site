import React, { useState } from 'react';
import { Dropdown, Menu, Modal, List, Input, Popconfirm, Tag, message } from 'antd';
import { observer } from 'mobx-react';
import dayjs from 'dayjs';
import { useStores } from '@src/store';
import { applyResumeToEditor, switchResume } from '@src/utils/global';
import { ResumeRecord } from '@src/store/resume.store';
import './index.less';

const ResumeSwitcher = observer(() => {
  const { resumeStore, templateStore } = useStores();
  const { resumes, activeId, activeResume } = resumeStore;
  const [manageVisible, setManageVisible] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ResumeRecord | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleCreate = () => {
    resumeStore.saveActive();
    const record = resumeStore.createResume();
    switchResume(record.id, resumeStore, templateStore);
    message.success(`已创建「${record.name}」`);
  };

  const handleSwitch = (id: string) => {
    if (id === activeId) {
      return;
    }
    switchResume(id, resumeStore, templateStore);
  };

  const handleDuplicate = (id: string) => {
    const record = resumeStore.duplicateResume(id);
    if (record) {
      message.success(`已复制为「${record.name}」`);
    }
  };

  const handleDelete = (record: ResumeRecord) => {
    const isActive = record.id === resumeStore.activeId;
    const ok = resumeStore.deleteResume(record.id);
    if (!ok) {
      message.warning('至少保留一份简历');
      return;
    }
    message.success(`已删除「${record.name}」`);
    if (isActive) {
      const next = resumeStore.activeResume;
      if (next) {
        resumeStore.syncLegacyKeys();
        applyResumeToEditor(next, templateStore);
      }
    }
  };

  const openRename = (record: ResumeRecord) => {
    setRenameTarget(record);
    setRenameValue(record.name);
  };

  const handleRenameOk = () => {
    if (renameTarget) {
      resumeStore.renameResume(renameTarget.id, renameValue);
    }
    setRenameTarget(null);
  };

  const menu = (
    <Menu>
      {resumes.map((item) => (
        <Menu.Item key={item.id} onClick={() => handleSwitch(item.id)}>
          <span className="resume-menu-item">
            <span className="resume-menu-check">{item.id === activeId ? '✓' : ''}</span>
            <span className="resume-menu-name">{item.name}</span>
          </span>
        </Menu.Item>
      ))}
      <Menu.Divider />
      <Menu.Item key="create" onClick={handleCreate}>
        ＋ 新建简历
      </Menu.Item>
      <Menu.Item key="manage" onClick={() => setManageVisible(true)}>
        管理简历
      </Menu.Item>
    </Menu>
  );

  return (
    <>
      <Dropdown overlay={menu} trigger={['click']}>
        <a
          className="ant-dropdown-link rs-link resume-switcher"
          onClick={(e) => e.preventDefault()}
        >
          {activeResume?.name || '我的简历'} ▾
        </a>
      </Dropdown>
      <Modal
        title="管理简历"
        visible={manageVisible}
        onCancel={() => setManageVisible(false)}
        footer={null}
        width={720}
      >
        <List
          itemLayout="horizontal"
          dataSource={resumes}
          renderItem={(item) => (
            <List.Item
              actions={[
                item.id !== activeId ? (
                  <span
                    key="switch"
                    className="btn btn-normal mr20"
                    onClick={() => {
                      handleSwitch(item.id);
                      setManageVisible(false);
                    }}
                  >
                    切换
                  </span>
                ) : (
                  <Tag key="current" color="green">当前</Tag>
                ),
                <span key="rename" className="btn btn-normal mr20" onClick={() => openRename(item)}>
                  重命名
                </span>,
                <span key="copy" className="btn btn-normal mr20" onClick={() => handleDuplicate(item.id)}>
                  复制
                </span>,
                <Popconfirm
                  key="delete"
                  title={`删除后不可恢复，确定删除「${item.name}」吗？`}
                  onConfirm={() => handleDelete(item)}
                  okText="删除"
                  cancelText="取消"
                >
                  <span className="btn btn-normal mr20">删除</span>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={item.name}
                description={`更新于 ${dayjs(item.updatedAt).format('YYYY-MM-DD HH:mm:ss')}`}
              />
            </List.Item>
          )}
        />
      </Modal>
      <Modal
        title="重命名简历"
        visible={!!renameTarget}
        onOk={handleRenameOk}
        onCancel={() => setRenameTarget(null)}
        okText="确定"
        cancelText="取消"
      >
        <Input
          value={renameValue}
          maxLength={30}
          placeholder="请输入简历名称"
          onChange={(e) => setRenameValue(e.target.value)}
          onPressEnter={handleRenameOk}
        />
      </Modal>
    </>
  );
});

export default ResumeSwitcher;
