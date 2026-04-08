// src/renderer/components/settings/ContainerSettingsPanel.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Form, Switch, Select, InputNumber, Button, Space, Alert, Card, Typography, Divider, Row, Col, message, Spin } from 'antd';
import { RocketOutlined, CloseOutlined, SaveOutlined, ReloadOutlined, CloudServerOutlined, SettingOutlined, ClockCircleOutlined, ApiOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

interface ContainerSettings {
  autoStartOnLaunch: boolean;
  autoStopOnQuit: boolean;
  runInBackground: boolean;
  memoryLimit: string;
  cpuLimit: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  healthCheckTimeout: number;
  startupTimeout: number;
  portConfig: {
    matrixPort: number;
    autoSelectPort: boolean;
  };
}

interface SettingsPanelProps {
  open: boolean;
  onClose?: () => void;
}

const getElectronAPI = (): IElectronAPI => {
  if (!window.electronAPI) {
    throw new Error('Electron API not available');
  }
  return window.electronAPI;
};

export const ContainerSettingsPanel: React.FC<SettingsPanelProps> = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 加载设置
  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const api = getElectronAPI();
      const settingsData = await api.getSettings();
      const containerSettings = await api.getContainerSettings();

      const mergedSettings = {
        autoStartOnLaunch: containerSettings?.autoStartOnLaunch ?? settingsData?.autoStartOnLaunch ?? true,
        autoStopOnQuit: containerSettings?.autoStopOnQuit ?? settingsData?.autoStopOnQuit ?? true,
        runInBackground: containerSettings?.runInBackground ?? settingsData?.runInBackground ?? false,
        memoryLimit: containerSettings?.memoryLimit ?? settingsData?.memoryLimit ?? '200MB',
        cpuLimit: containerSettings?.cpuLimit ?? settingsData?.cpuLimit ?? 1,
        logLevel: containerSettings?.logLevel ?? settingsData?.logLevel ?? 'info',
        healthCheckTimeout: containerSettings?.healthCheckTimeout ?? settingsData?.healthCheckTimeout ?? 60,
        startupTimeout: containerSettings?.startupTimeout ?? settingsData?.startupTimeout ?? 120,
        portConfig: containerSettings?.portConfig ??
          settingsData?.portConfig ?? {
            matrixPort: 8008,
            autoSelectPort: true,
          },
      };

      form.setFieldsValue(mergedSettings);
    } catch (error: any) {
      message.error(error.message || '加载设置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const values = await form.validateFields();
      const api = getElectronAPI();
      await api.saveContainerSettings(values);
      message.success('设置已保存');
      onClose?.();
    } catch (error: any) {
      if (error.errorFields) {
        message.error('请检查表单填写');
      } else {
        message.error(error.message || '保存设置失败');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const defaultSettings = {
      autoStartOnLaunch: true,
      autoStopOnQuit: true,
      runInBackground: false,
      memoryLimit: '200MB',
      cpuLimit: 1,
      logLevel: 'info',
      healthCheckTimeout: 60,
      startupTimeout: 120,
      portConfig: {
        matrixPort: 8008,
        autoSelectPort: true,
      },
    };

    form.setFieldsValue(defaultSettings);
    message.info('已恢复默认设置，请点击保存生效');
  };

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          <span>容器设置</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="reset" icon={<ReloadOutlined />} onClick={handleReset} disabled={saving}>
          恢复默认
        </Button>,
        <Button key="cancel" onClick={onClose} disabled={saving}>
          取消
        </Button>,
        <Button key="save" type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
          保存设置
        </Button>,
      ]}
    >
      <Spin spinning={loading}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            autoStartOnLaunch: true,
            autoStopOnQuit: true,
            runInBackground: false,
            memoryLimit: '200MB',
            cpuLimit: 1,
            logLevel: 'info',
            healthCheckTimeout: 60,
            startupTimeout: 120,
            portConfig: {
              matrixPort: 8008,
              autoSelectPort: true,
            },
          }}
        >
          <Card
            size="small"
            title={
              <>
                <RocketOutlined /> 启动行为
              </>
            }
            style={{ marginBottom: 16 }}
          >
            <Form.Item name="autoStartOnLaunch" valuePropName="checked" label="应用启动时自动启动容器">
              <Switch />
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                启动应用时自动启动 Matrix 容器
              </Text>
            </Form.Item>

            <Form.Item name="autoStopOnQuit" valuePropName="checked" label="应用退出时自动停止容器">
              <Switch />
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                关闭时自动停止容器以节省资源
              </Text>
            </Form.Item>

            <Form.Item name="runInBackground" valuePropName="checked" label="后台运行模式">
              <Switch />
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                关闭窗口时最小化到系统托盘
              </Text>
            </Form.Item>
          </Card>

          <Card
            size="small"
            title={
              <>
                <CloudServerOutlined /> 资源限制
              </>
            }
            style={{ marginBottom: 16 }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="memoryLimit" label="内存限制">
                  <Select>
                    <Option value="50MB">50 MB</Option>
                    <Option value="100MB">100 MB</Option>
                    <Option value="200MB">200 MB</Option>
                    <Option value="500MB">500 MB</Option>
                    <Option value="1GB">1 GB</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="cpuLimit" label="CPU 限制">
                  <Select>
                    <Option value={0.25}>0.25 核心</Option>
                    <Option value={0.5}>0.5 核心</Option>
                    <Option value={1}>1 核心</Option>
                    <Option value={2}>2 核心</Option>
                    <Option value={4}>4 核心</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card
            size="small"
            title={
              <>
                <ClockCircleOutlined /> 超时设置
              </>
            }
            style={{ marginBottom: 16 }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="healthCheckTimeout" label="健康检查超时（秒）">
                  <InputNumber min={1} max={300} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="startupTimeout" label="启动超时（秒）">
                  <InputNumber min={10} max={600} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card
            size="small"
            title={
              <>
                <ApiOutlined /> 端口配置
              </>
            }
            style={{ marginBottom: 16 }}
          >
            <Form.Item name={['portConfig', 'autoSelectPort']} valuePropName="checked" label="自动选择可用端口">
              <Switch />
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                如果端口被占用，自动尝试其他端口
              </Text>
            </Form.Item>

            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.portConfig?.autoSelectPort !== curr.portConfig?.autoSelectPort}>
              {({ getFieldValue }) => {
                const autoSelect = getFieldValue(['portConfig', 'autoSelectPort']);
                return !autoSelect ? (
                  <Form.Item name={['portConfig', 'matrixPort']} label="Matrix 端口" rules={[{ required: true, message: '请输入端口' }]}>
                    <InputNumber min={1024} max={65535} style={{ width: '100%' }} />
                  </Form.Item>
                ) : null;
              }}
            </Form.Item>
          </Card>

          <Card size="small" title="日志设置" style={{ marginBottom: 16 }}>
            <Form.Item name="logLevel" label="日志详细程度">
              <Select>
                <Option value="error">仅错误</Option>
                <Option value="warn">警告及以上</Option>
                <Option value="info">信息及以上（推荐）</Option>
                <Option value="debug">调试（详细）</Option>
              </Select>
            </Form.Item>
          </Card>
        </Form>
      </Spin>
    </Modal>
  );
};

export default ContainerSettingsPanel;
